<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import { adminApplicantService } from '../../services/adminApplicantService'
import type { AdminApplicantProfile, SocioProfileCv } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'

const applicantProfiles = ref<AdminApplicantProfile[]>([])
const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const expandedApplicantId = ref<number | null>(null)
const search = ref('')
const selectedSector = ref('')
const selectedAvailability = ref('')
const selectedLicense = ref('')
const loading = ref(false)
const loadingCvs = ref(false)
const error = ref<string | null>(null)

function toDisplayProfile(profile: AdminApplicantProfile): MockApplicantProfile {
  return {
    id: String(profile.id), applicantId: profile.applicantId, fullName: profile.fullName, email: profile.email,
    phone: profile.phone || '', initials: profile.initials, profileName: profile.profileName, categoryLabel: profile.categoryLabel,
    location: profile.location || 'San José', identityCard: profile.identityCard || '', age: profile.age ?? 0,
    tags: profile.sectors, sectors: profile.sectors, interests: profile.sectors, availability: profile.availability,
    license: profile.license || 'No informada', hasVehicle: profile.hasVehicle,
    experienceSummary: profile.experienceSummary || '', latestJob: profile.latestJob || '',
    cvFileName: profile.cvFileName || '', cvMeta: profile.cvMeta || '',
    updatedAt: String(profile.id).padStart(12, '0'), hasApplication: true, hasCv: profile.hasCv,
  }
}

async function loadProfiles() {
  loading.value = true
  error.value = null
  try {
    applicantProfiles.value = await adminApplicantService.list()
  } catch (cause) {
    error.value = userFacingError(cause, 'cargar los postulantes')
  } finally {
    loading.value = false
  }
}

async function openProfile(profile: MockApplicantProfile) {
  selectedProfile.value = profile
  selectedCvs.value = []
  loadingCvs.value = true
  try {
    selectedCvs.value = await adminApplicantService.listProfileCvs(Number(profile.id))
  } catch (cause) {
    error.value = userFacingError(cause, 'cargar los CVs del perfil')
  } finally {
    loadingCvs.value = false
  }
}

async function downloadCv(profileId: string, cvId?: number) {
  if (cvId === undefined) return
  const downloadWindow = window.open('', '_blank', 'noopener,noreferrer')
  try {
    const { url } = await adminApplicantService.downloadCv(Number(profileId), cvId)
    if (downloadWindow) downloadWindow.location.href = url
    else window.location.assign(url)
  } catch (cause) {
    downloadWindow?.close()
    error.value = userFacingError(cause, 'descargar el CV')
  }
}

const displayProfiles = computed(() => applicantProfiles.value.map(toDisplayProfile))
const sectorOptions = computed(() => [...new Set(displayProfiles.value.flatMap((profile) => profile.sectors))]
  .filter(Boolean).sort((first, second) => first.localeCompare(second, 'es')))
const availabilityOptions = computed(() => [...new Set(displayProfiles.value.map((profile) => profile.availability))]
  .filter(Boolean).sort((first, second) => first.localeCompare(second, 'es')))
const licenseOptions = computed(() => [...new Set(displayProfiles.value.map((profile) => profile.license))]
  .filter(Boolean).sort((first, second) => first.localeCompare(second, 'es')))
const hasFilters = computed(() => !!search.value || !!selectedSector.value
  || !!selectedAvailability.value || !!selectedLicense.value)

function clearFilters() {
  search.value = ''
  selectedSector.value = ''
  selectedAvailability.value = ''
  selectedLicense.value = ''
}

const applicants = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  const groups = new Map<number, { id: number; fullName: string; email: string; phone: string; initials: string; profiles: MockApplicantProfile[] }>()
  displayProfiles.value.forEach((profile) => {
    const matches = !term || [profile.fullName, profile.email, profile.phone || '', profile.identityCard, profile.profileName]
      .some((value) => value.toLocaleLowerCase('es').includes(term))
    if (!matches
      || (selectedSector.value && !profile.sectors.includes(selectedSector.value))
      || (selectedAvailability.value && profile.availability !== selectedAvailability.value)
      || (selectedLicense.value && profile.license !== selectedLicense.value)) return
    const group = groups.get(profile.applicantId)
    if (group) group.profiles.push(profile)
    else groups.set(profile.applicantId, {
      id: profile.applicantId, fullName: profile.fullName, email: profile.email, phone: profile.phone || '',
      initials: profile.initials, profiles: [profile],
    })
  })
  return [...groups.values()]
})

onMounted(loadProfiles)
</script>

<template>
  <AdminShell
    active="postulantes"
    title="Postulantes Registrados"
    :subtitle="`${applicants.length} postulantes · ${applicantProfiles.length} perfiles totales`"
  >
    <div class="applicant-toolbar admin-applicant-filters">
      <label class="applicant-search">
        <Search :size="17" />
        <input v-model="search" placeholder="Buscar por nombre, correo, cédula o perfil...">
      </label>
      <label class="admin-applicant-filter">Rubro
        <select v-model="selectedSector" :disabled="loading">
          <option value="">Todos los rubros</option>
          <option v-for="sector in sectorOptions" :key="sector" :value="sector">{{ sector }}</option>
        </select>
      </label>
      <label class="admin-applicant-filter">Disponibilidad
        <select v-model="selectedAvailability" :disabled="loading">
          <option value="">Todas las disponibilidades</option>
          <option v-for="availability in availabilityOptions" :key="availability" :value="availability">{{ availability }}</option>
        </select>
      </label>
      <label class="admin-applicant-filter">Libreta
        <select v-model="selectedLicense" :disabled="loading">
          <option value="">Todas las libretas</option>
          <option v-for="license in licenseOptions" :key="license" :value="license">{{ license }}</option>
        </select>
      </label>
      <button class="admin-applicant-clear" type="button" title="Limpiar búsqueda y filtros" aria-label="Limpiar búsqueda y filtros" :disabled="!hasFilters" @click="clearFilters"><X :size="17" /></button>
    </div>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <p v-if="loading">Cargando postulantes...</p>
    <section v-else-if="applicants.length" class="bolsa__applicants">
      <ApplicantGroupCard
        v-for="applicant in applicants"
        :key="applicant.id"
        :applicant="applicant"
        :expanded="expandedApplicantId === applicant.id"
        @toggle="expandedApplicantId = expandedApplicantId === applicant.id ? null : applicant.id"
        @view="openProfile"
      />
    </section>
    <p v-else class="bolsa__empty">No hay postulantes que coincidan con la búsqueda y los filtros.</p>
    <ProfileDetailModal
      v-if="selectedProfile"
      :profile="selectedProfile"
      :cvs="selectedCvs"
      :loading-cvs="loadingCvs"
      @close="selectedProfile = null; selectedCvs = []"
      @download-cv="downloadCv"
    />
  </AdminShell>
</template>

<style scoped>
.applicant-toolbar.admin-applicant-filters { display: flex; flex-wrap: wrap; align-items: flex-end !important; gap: 12px; }
.admin-applicant-filters .applicant-search { flex: 2 1 260px; min-width: 0; height: 40px; margin: 0; box-sizing: border-box; }
.admin-applicant-filter { display: grid; flex: 1 1 170px; min-width: 0; gap: 6px; color: #526159; font-size: 12px; font-weight: 600; }
.admin-applicant-filter select { width: 100%; min-width: 0; height: 40px; padding: 0 10px; border: 1px solid #dfe5eb; border-radius: 6px; background: #fff; color: #34473b; font-family: var(--font-family); font-size: var(--text-md); font-weight: 400; text-overflow: ellipsis; }
.admin-applicant-clear { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px; padding: 0; border: 1px solid #dfe5eb; border-radius: 6px; background: #fff; color: #526159; cursor: pointer; }
.admin-applicant-filter select:focus-visible, .admin-applicant-clear:focus-visible { outline: 2px solid #07974e; outline-offset: 2px; }
.admin-applicant-clear:disabled { opacity: .5; cursor: not-allowed; }
</style>
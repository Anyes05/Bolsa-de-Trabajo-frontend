<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ApplicantFilters from '../../components/ApplicantFilters.vue'
import { useApplicantFilters } from '../../composables/useApplicantFilters'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import { adminApplicantService } from '../../services/adminApplicantService'
import type { AdminApplicantProfile, SocioProfileCv } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'
import { openCvInNewTab } from '../../utils/openCvInNewTab'

type EstadoFiltro = 'TODOS' | 'ACTIVO' | 'INACTIVO'

const applicantProfiles = ref<AdminApplicantProfile[]>([])
const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const expandedApplicantId = ref<number | null>(null)
const estadoFiltro = ref<EstadoFiltro>('TODOS')
const loading = ref(false)
const loadingCvs = ref(false)
const error = ref<string | null>(null)

function estadoDetalle(profile: AdminApplicantProfile) {
  if (!profile.cuentaActiva) return 'Cuenta de usuario desactivada'
  if (profile.busquedaPausada) return 'Búsqueda pausada: no busca trabajo actualmente'
  if (!profile.visibleEnBolsa) return 'Oculto en la bolsa (retención / no confirmó permanencia)'
  if (!profile.perfilVisible) return 'Activo en bolsa; este perfil laboral está oculto por el postulante'
  return 'Visible en la bolsa de empleo'
}

function toDisplayProfile(profile: AdminApplicantProfile): MockApplicantProfile {
  return {
    id: String(profile.id), applicantId: profile.applicantId, fullName: profile.fullName, email: profile.email,
    fotoUrl: profile.fotoUrl,
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
  try {
    await openCvInNewTab(() => adminApplicantService.downloadCv(Number(profileId), cvId))
  } catch (cause) {
    error.value = userFacingError(cause, 'descargar el CV')
  }
}

const displayProfiles = computed(() => applicantProfiles.value.map(toDisplayProfile))
const {
  search, selectedSector, selectedAvailability, selectedLicense,
  sectorOptions, availabilityOptions, hasFilters, clearFilters, filteredProfiles,
} = useApplicantFilters(displayProfiles)

const estadoByApplicant = computed(() => {
  const map = new Map<number, { estado: 'ACTIVO' | 'INACTIVO'; detalle: string; busquedaPausada: boolean }>()
  for (const profile of applicantProfiles.value) {
    if (!map.has(profile.applicantId)) {
      map.set(profile.applicantId, {
        estado: profile.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
        detalle: estadoDetalle(profile),
        busquedaPausada: profile.cuentaActiva && profile.busquedaPausada,
      })
    }
  }
  return map
})

const applicants = computed(() => {
  type Group = {
    id: number
    fullName: string
    email: string
    phone: string
    initials: string
    profiles: MockApplicantProfile[]
    estado: 'ACTIVO' | 'INACTIVO'
    estadoDetalle: string
    busquedaPausada: boolean
  }
  const groups = new Map<number, Group>()
  filteredProfiles.value.forEach((profile) => {
    const meta = estadoByApplicant.value.get(profile.applicantId)
    const estado = meta?.estado ?? 'ACTIVO'
    if (estadoFiltro.value !== 'TODOS' && estado !== estadoFiltro.value) return
    const group = groups.get(profile.applicantId)
    if (group) group.profiles.push(profile)
    else groups.set(profile.applicantId, {
      id: profile.applicantId, fullName: profile.fullName, email: profile.email, phone: profile.phone || '',
      initials: profile.initials, profiles: [profile],
      estado,
      estadoDetalle: meta?.detalle || '',
      busquedaPausada: meta?.busquedaPausada ?? false,
    })
  })
  return [...groups.values()]
})

const activosCount = computed(() =>
  [...estadoByApplicant.value.values()].filter((item) => item.estado === 'ACTIVO').length)
const inactivosCount = computed(() =>
  [...estadoByApplicant.value.values()].filter((item) => item.estado === 'INACTIVO').length)

onMounted(loadProfiles)
</script>

<template>
  <AdminShell
    active="postulantes"
    title="Postulantes Registrados"
    :subtitle="`${activosCount} activos · ${inactivosCount} inactivos · ${applicantProfiles.length} perfiles`"
  >
    <ApplicantFilters
      v-model:search="search"
      v-model:selected-sector="selectedSector"
      v-model:selected-availability="selectedAvailability"
      v-model:selected-license="selectedLicense"
      :sector-options="sectorOptions"
      :availability-options="availabilityOptions"
      :loading="loading"
      :has-filters="hasFilters"
      @clear="clearFilters"
    />
    <div class="admin-applicants__estado-filter" role="group" aria-label="Filtrar por estado en bolsa">
      <button
        type="button"
        class="admin-applicants__chip"
        :class="{ 'admin-applicants__chip--active': estadoFiltro === 'TODOS' }"
        @click="estadoFiltro = 'TODOS'"
      >
        Todos
      </button>
      <button
        type="button"
        class="admin-applicants__chip"
        :class="{ 'admin-applicants__chip--active': estadoFiltro === 'ACTIVO' }"
        @click="estadoFiltro = 'ACTIVO'"
      >
        Activos ({{ activosCount }})
      </button>
      <button
        type="button"
        class="admin-applicants__chip"
        :class="{ 'admin-applicants__chip--active': estadoFiltro === 'INACTIVO' }"
        @click="estadoFiltro = 'INACTIVO'"
      >
        Inactivos ({{ inactivosCount }})
      </button>
    </div>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <p v-if="loading">Cargando postulantes...</p>
    <section v-else-if="applicants.length" class="bolsa__applicants">
      <ApplicantGroupCard
        v-for="applicant in applicants"
        :key="applicant.id"
        :applicant="applicant"
        :expanded="expandedApplicantId === applicant.id"
        :show-contact="false"
        show-estado
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
.admin-applicants__estado-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}
.admin-applicants__chip {
  border: 1px solid #cfd9d3;
  background: #fff;
  color: #2f4a3d;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.88rem;
  cursor: pointer;
}
.admin-applicants__chip--active {
  border-color: #1f5a42;
  background: #e7f2ec;
  color: #16382b;
  font-weight: 600;
}
</style>

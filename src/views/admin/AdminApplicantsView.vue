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

const applicantProfiles = ref<AdminApplicantProfile[]>([])
const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const expandedApplicantId = ref<number | null>(null)
const loading = ref(false)
const loadingCvs = ref(false)
const error = ref<string | null>(null)

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

const applicants = computed(() => {
  const groups = new Map<number, { id: number; fullName: string; email: string; phone: string; initials: string; profiles: MockApplicantProfile[] }>()
  filteredProfiles.value.forEach((profile) => {
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

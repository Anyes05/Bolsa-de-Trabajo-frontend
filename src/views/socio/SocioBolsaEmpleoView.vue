<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantFilters from '../../components/ApplicantFilters.vue'
import { useApplicantFilters } from '../../composables/useApplicantFilters'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ApplicantContactModal from '../../components/socio/ApplicantContactModal.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import {
  type MockApplicantProfile,
  type SortOption,
} from '../../data/mockSocioBolsa'
import { socioBolsaService, type ContactApplication } from '../../services/socioBolsaService'
import type { ApplicantProfileCard, SocioProfileCv } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'
import { openCvInNewTab } from '../../utils/openCvInNewTab'

const sortBy = ref<SortOption>('updated')
const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const loadingCvs = ref(false)
const expandedApplicantId = ref<number | null>(null)
const applicantProfiles = ref<ApplicantProfileCard[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const contactSuccess = ref<string | null>(null)
const notifying = ref(false)
const selectedApplicant = ref<ApplicantGroup | null>(null)
const contactApplications = ref<ContactApplication[]>([])
const loadingContactApplications = ref(false)
const contactError = ref<string | null>(null)

type ApplicantGroup = {
  id: number
  fullName: string
  email: string
  phone: string
  initials: string
  profiles: MockApplicantProfile[]
}

function toDisplayProfile(profile: ApplicantProfileCard): MockApplicantProfile {
  return {
    id: String(profile.id),
    fotoUrl: profile.fotoUrl,
    applicantId: profile.applicantId,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone || '',
    initials: profile.initials,
    profileName: profile.profileName,
    categoryLabel: profile.categoryLabel,
    location: profile.location || 'San José',
    identityCard: profile.identityCard || '',
    age: profile.age ?? 0,
    tags: profile.sectors,
    sectors: profile.sectors,
    interests: profile.sectors,
    availability: profile.availability,
    license: profile.license || 'No informada',
    hasVehicle: profile.hasVehicle,
    experienceSummary: profile.experienceSummary || '',
    latestJob: profile.latestJob || '',
    cvFileName: profile.cvFileName || '',
    cvMeta: profile.cvMeta || '',
    updatedAt: String(profile.id).padStart(12, '0'),
    hasApplication: profile.hasApplication,
    hasCv: profile.hasCv,
  }
}

async function loadProfiles() {
  loading.value = true
  error.value = null
  try {
    applicantProfiles.value = await socioBolsaService.searchProfiles()
  } catch (cause) {
    error.value = userFacingError(cause, 'cargar los perfiles')
  } finally {
    loading.value = false
  }
}

async function openProfile(profile: MockApplicantProfile) {
  selectedProfile.value = profile
  selectedCvs.value = []
  if (!profile.hasApplication) return
  loadingCvs.value = true
  try {
    selectedCvs.value = await socioBolsaService.listProfileCvs(Number(profile.id))
  } catch (cause) {
    error.value = userFacingError(cause, 'cargar los CVs del perfil')
  } finally {
    loadingCvs.value = false
  }
}

async function downloadCv(profileId: string, cvId?: number) {
  if (cvId === undefined) return
  try {
    await openCvInNewTab(() => socioBolsaService.downloadCv(Number(profileId), cvId))
  } catch (cause) {
    error.value = userFacingError(cause, 'descargar el CV')
  }
}

const displayProfiles = computed(() => applicantProfiles.value.map(toDisplayProfile))
const {
  search, selectedSector, selectedAvailability, selectedLicense,
  sectorOptions, availabilityOptions, hasFilters, clearFilters, filteredProfiles,
} = useApplicantFilters(displayProfiles)

const profiles = computed(() => {
  return [...filteredProfiles.value].sort((left, right) => {
    if (sortBy.value === 'name') return left.fullName.localeCompare(right.fullName, 'es')
    return right.updatedAt.localeCompare(left.updatedAt)
  })
})

const applicants = computed(() => {
  const groups = new Map<number, ApplicantGroup>()
  profiles.value.forEach((profile) => {
    const group = groups.get(profile.applicantId)
    if (group) group.profiles.push(profile)
    else groups.set(profile.applicantId, {
      id: profile.applicantId,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone || '',
      initials: profile.initials,
      profiles: [profile],
    })
  })
  return [...groups.values()]
})

async function openContact(applicant: ApplicantGroup) {
  contactSuccess.value = null
  selectedApplicant.value = applicant
  contactApplications.value = []
  contactError.value = null
  loadingContactApplications.value = true
  try {
    const applications = await socioBolsaService.listContactApplications(applicant.id)
    if (selectedApplicant.value?.id === applicant.id) contactApplications.value = applications
  } catch (cause) {
    if (selectedApplicant.value?.id === applicant.id) contactError.value = userFacingError(cause, 'cargar las postulaciones')
  } finally {
    if (selectedApplicant.value?.id === applicant.id) loadingContactApplications.value = false
  }
}

async function notifyApplicant(selected: boolean, application: ContactApplication) {
  const applicant = selectedApplicant.value
  if (!applicant || notifying.value) return
  notifying.value = true
  contactError.value = null
  try {
    const result = await socioBolsaService.notifyApplicant(application.perfilId, selected, application.ofertaId)
    contactSuccess.value = result.message
    selectedApplicant.value = null
  } catch (cause) {
    contactError.value = userFacingError(cause, 'enviar la notificación')
  } finally {
    notifying.value = false
  }
}

onMounted(loadProfiles)
</script>

<template>
  <SocioShell
    active-nav="bolsa"
    title="Bolsa de Empleo Digital"
    subtitle="Explora perfiles laborales listos para incorporarse"
  >
    <div class="bolsa bolsa--shared-filters">
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

      <section class="bolsa__results" aria-labelledby="bolsa-results-title">
        <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
        <AppAlert v-if="contactSuccess" tone="success">{{ contactSuccess }}</AppAlert>
        <header class="bolsa__toolbar">
          <h2 id="bolsa-results-title" class="bolsa__count">
            Resultados: <b>{{ profiles.length }} perfiles visibles</b>
          </h2>
          <label class="bolsa__sort">
            Ordenar por:
            <select v-model="sortBy">
              <option value="updated">Última actualización</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </header>

        <p v-if="loading">Cargando perfiles...</p>
        <div v-else-if="applicants.length" class="bolsa__applicants">
          <ApplicantGroupCard
            v-for="applicant in applicants"
            :key="applicant.id"
            :applicant="applicant"
            :expanded="expandedApplicantId === applicant.id"
            @toggle="expandedApplicantId = expandedApplicantId === applicant.id ? null : applicant.id"
            @view="openProfile"
            @contact="openContact(applicant)"
          />
        </div>
        <p v-else class="bolsa__empty">No hay perfiles que coincidan con la búsqueda y los filtros.</p>
      </section>
    </div>
    <template #overlay>
      <ProfileDetailModal
        v-if="selectedProfile"
        :profile="selectedProfile"
        :cvs="selectedCvs"
        :loading-cvs="loadingCvs"
        @close="selectedProfile = null; selectedCvs = []"
        @download-cv="downloadCv"
      />
      <ApplicantContactModal
        v-if="selectedApplicant"
        :applicant-name="selectedApplicant.fullName"
        :applicant-email="selectedApplicant.email"
        :loading="notifying"
        :applications="contactApplications"
        :loading-applications="loadingContactApplications"
        :error="contactError"
        @close="selectedApplicant = null"
        @notify="notifyApplicant"
      />
    </template>

    <style scoped>
    .bolsa.bolsa--shared-filters { display: block; }
    </style>
  </SocioShell>
</template>

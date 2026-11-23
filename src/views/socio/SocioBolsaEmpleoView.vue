<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantFilters from '../../components/ApplicantFilters.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useApplicantFilters } from '../../composables/useApplicantFilters'
import { useServerList } from '../../composables/useServerList'
import { emptyApplicantPage, type ApplicantGroupPage } from '../../services/pagination'
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

const {
  search, selectedSector, selectedAvailability, selectedLicense, selectFilters, hasFilters, clearFilters, params,
} = useApplicantFilters()

// Búsqueda, filtros, orden y paginación (por postulante): los resuelve el backend.
const listado = useServerList<ApplicantGroupPage<ApplicantProfileCard>>({
  fetch: (page) => socioBolsaService.searchProfiles({
    ...params(), orden: sortBy.value === 'name' ? 'NOMBRE' : 'RECIENTES', page,
  }),
  filters: [...selectFilters, sortBy],
  search,
  initial: emptyApplicantPage(),
  onError: (cause) => { error.value = userFacingError(cause, 'cargar los perfiles') },
})
const loading = computed(() => listado.loading.value && !listado.data.value.pagina.content.length)
const sectorOptions = computed(() => listado.data.value.rubros)
const availabilityOptions = computed(() => listado.data.value.disponibilidades)

function loadProfiles() {
  error.value = null
  return listado.load(0)
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

// Los grupos ya vienen filtrados, ordenados y paginados por el servidor; solo se adaptan para la tarjeta.
const applicants = computed<ApplicantGroup[]>(() => listado.data.value.pagina.content
  .filter((group) => group.profiles.length > 0)
  .map((group) => {
    const first = group.profiles[0]!
    return {
      id: group.applicantId,
      fullName: first.fullName,
      email: first.email,
      phone: first.phone || '',
      initials: first.initials,
      profiles: group.profiles.map(toDisplayProfile),
    }
  }))

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
            Resultados: <b>{{ listado.data.value.perfiles }} perfiles visibles</b>
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
        <PaginationBar
          :page="listado.page.value"
          :total-pages="listado.data.value.pagina.totalPages"
          :total-elements="listado.data.value.pagina.totalElements"
          :loading="listado.loading.value"
          label="Paginación de postulantes"
          @change="listado.goTo"
        />
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
  </SocioShell>
</template>

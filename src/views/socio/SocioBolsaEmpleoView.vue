<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import FilterGroup from '../../components/socio/FilterGroup.vue'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ApplicantContactModal from '../../components/socio/ApplicantContactModal.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import {
  mockCompany,
  type MockApplicantProfile,
  type SortOption,
} from '../../data/mockSocioBolsa'
import { socioBolsaService } from '../../services/socioBolsaService'
import type { ApplicantProfileCard, SocioProfileCv } from '../../services/types'

const rubro = ref('Todos')
const zone = ref('Todos')
const availability = ref('Todos')
const vehicle = ref('Todos')
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

type ApplicantGroup = {
  id: number
  fullName: string
  email: string
  initials: string
  profiles: MockApplicantProfile[]
}

const rubroOptions = computed(() => ['Todos', ...new Set(applicantProfiles.value.flatMap((profile) => profile.sectors))])
const zoneOptions = computed(() => {
  const zones = applicantProfiles.value
    .map((profile) => (profile.location || '').trim())
    .filter(Boolean)
  return ['Todos', ...new Set(zones)]
})

function toDisplayProfile(profile: ApplicantProfileCard): MockApplicantProfile {
  return {
    id: String(profile.id),
    applicantId: profile.applicantId,
    fullName: profile.fullName,
    email: profile.email,
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
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los perfiles.'
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
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los CVs del perfil.'
  } finally {
    loadingCvs.value = false
  }
}

async function downloadCv(profileId: string, cvId?: number) {
  if (cvId === undefined) return
  const downloadWindow = window.open('', '_blank', 'noopener,noreferrer')
  try {
    const { url } = await socioBolsaService.downloadCv(Number(profileId), cvId)
    if (downloadWindow) downloadWindow.location.href = url
    else window.location.assign(url)
  } catch (cause) {
    downloadWindow?.close()
    error.value = cause instanceof Error ? cause.message : 'No se pudo descargar el CV.'
  }
}

const profiles = computed(() => {
  const filtered = applicantProfiles.value.map(toDisplayProfile).filter((profile) => {
    const matchesRubro = rubro.value === 'Todos' || profile.sectors.includes(rubro.value)
    const matchesZone = zone.value === 'Todos' || profile.location === zone.value
    const matchesAvailability = availability.value === 'Todos'
      || (availability.value === 'Full-time' && profile.availability === 'FULL_TIME')
      || (availability.value === 'Part-time' && profile.availability === 'PART_TIME')
    const matchesVehicle = vehicle.value === 'Todos'
      || (vehicle.value === 'Con vehículo' && profile.hasVehicle)
      || (vehicle.value === 'Sin vehículo' && !profile.hasVehicle)
    return matchesRubro && matchesZone && matchesAvailability && matchesVehicle
  })

  return [...filtered].sort((left, right) => {
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
      initials: profile.initials,
      profiles: [profile],
    })
  })
  return [...groups.values()]
})

function openContact(applicant: ApplicantGroup) {
  contactSuccess.value = null
  selectedApplicant.value = applicant
}

async function notifyApplicant(selected: boolean) {
  const applicant = selectedApplicant.value
  if (!applicant || !applicant.profiles.length) return
  notifying.value = true
  error.value = null
  try {
    const result = await socioBolsaService.notifyApplicant(Number(applicant.profiles[0].id), selected)
    contactSuccess.value = result.message
    selectedApplicant.value = null
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo enviar la notificación.'
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
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <div class="bolsa">
      <aside class="bolsa__filters" aria-label="Filtros de perfiles">
        <FilterGroup v-model="rubro" legend="Rubro laboral" :options="rubroOptions" />
        <FilterGroup v-model="zone" legend="Zona" :options="zoneOptions" />
        <FilterGroup v-model="availability" legend="Disponibilidad" :options="['Todos', 'Full-time', 'Part-time']" />
        <FilterGroup v-model="vehicle" legend="Vehículo" :options="['Todos', 'Con vehículo', 'Sin vehículo']" />
      </aside>

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
        <p v-else class="bolsa__empty">No hay perfiles que coincidan con los filtros.</p>
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
        @close="selectedApplicant = null"
        @notify="notifyApplicant"
      />
    </template>
  </SocioShell>
</template>

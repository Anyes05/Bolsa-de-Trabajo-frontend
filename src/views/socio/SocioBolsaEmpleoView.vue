<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import FilterGroup from '../../components/socio/FilterGroup.vue'
import ProfileCard from '../../components/socio/ProfileCard.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import {
  mockCompany,
  type MockApplicantProfile,
  type SortOption,
} from '../../data/mockSocioBolsa'
import { socioBolsaService } from '../../services/socioBolsaService'
import type { ApplicantProfileCard } from '../../services/types'

const rubro = ref('Todos')
const availability = ref('Todos')
const vehicle = ref('Todos')
const sortBy = ref<SortOption>('updated')
const selectedProfile = ref<MockApplicantProfile | null>(null)
const applicantProfiles = ref<ApplicantProfileCard[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const rubroOptions = computed(() => ['Todos', ...new Set(applicantProfiles.value.flatMap((profile) => profile.sectors))])

function toDisplayProfile(profile: ApplicantProfileCard): MockApplicantProfile {
  return {
    id: String(profile.id),
    fullName: profile.fullName,
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

async function downloadCv(profileId: string) {
  try {
    const { url } = await socioBolsaService.downloadCv(Number(profileId))
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo descargar el CV.'
  }
}

const profiles = computed(() => {
  const filtered = applicantProfiles.value.map(toDisplayProfile).filter((profile) => {
    const matchesRubro = rubro.value === 'Todos' || profile.sectors.includes(rubro.value)
    const matchesAvailability = availability.value === 'Todos'
      || (availability.value === 'Full-time' && profile.availability === 'FULL_TIME')
      || (availability.value === 'Part-time' && profile.availability === 'PART_TIME')
    const matchesVehicle = vehicle.value === 'Todos'
      || (vehicle.value === 'Con vehículo' && profile.hasVehicle)
      || (vehicle.value === 'Sin vehículo' && !profile.hasVehicle)
    return matchesRubro && matchesAvailability && matchesVehicle
  })

  return [...filtered].sort((left, right) => {
    if (sortBy.value === 'name') return left.fullName.localeCompare(right.fullName, 'es')
    return right.updatedAt.localeCompare(left.updatedAt)
  })
})

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
        <FilterGroup v-model="availability" legend="Disponibilidad" :options="['Todos', 'Full-time', 'Part-time']" />
        <FilterGroup v-model="vehicle" legend="Vehículo" :options="['Todos', 'Con vehículo', 'Sin vehículo']" />
      </aside>

      <section class="bolsa__results" aria-labelledby="bolsa-results-title">
        <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
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
        <div v-else-if="profiles.length" class="bolsa__grid">
          <ProfileCard
            v-for="profile in profiles"
            :key="profile.id"
            :profile="profile"
            @view="selectedProfile = profile"
          />
        </div>
        <p v-else class="bolsa__empty">No hay perfiles que coincidan con los filtros.</p>
      </section>
    </div>
    <template #overlay>
      <ProfileDetailModal
        v-if="selectedProfile"
        :profile="selectedProfile"
        @close="selectedProfile = null"
        @download-cv="downloadCv"
      />
    </template>
  </SocioShell>
</template>

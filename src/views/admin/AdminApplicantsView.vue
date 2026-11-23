<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ApplicantFilters from '../../components/ApplicantFilters.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useApplicantFilters } from '../../composables/useApplicantFilters'
import { useServerList } from '../../composables/useServerList'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import { adminApplicantService, type AdminApplicantEstado, type AdminApplicantPage } from '../../services/adminApplicantService'
import { emptyApplicantPage } from '../../services/pagination'
import type { AdminApplicantProfile, SocioProfileCv } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'
import { openCvInNewTab } from '../../utils/openCvInNewTab'

const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const expandedApplicantId = ref<number | null>(null)
const estadoFiltro = ref<AdminApplicantEstado>('TODOS')
const loadingCvs = ref(false)
const error = ref<string | null>(null)

const {
  search, selectedSector, selectedAvailability, selectedLicense, selectFilters, hasFilters, clearFilters, params,
} = useApplicantFilters()

// Búsqueda, filtros, estado y paginación (por postulante): los resuelve el backend.
const listado = useServerList<AdminApplicantPage>({
  fetch: (page) => adminApplicantService.list({ ...params(), estado: estadoFiltro.value, page }),
  filters: [...selectFilters, estadoFiltro],
  search,
  initial: { resultado: emptyApplicantPage(), activos: 0, inactivos: 0, totalPerfiles: 0 },
  onError: (cause) => { error.value = userFacingError(cause, 'cargar los postulantes') },
})
const loading = computed(() => listado.loading.value && !listado.data.value.resultado.pagina.content.length)
const sectorOptions = computed(() => listado.data.value.resultado.rubros)
const availabilityOptions = computed(() => listado.data.value.resultado.disponibilidades)
const activosCount = computed(() => listado.data.value.activos)
const inactivosCount = computed(() => listado.data.value.inactivos)
const totalPerfiles = computed(() => listado.data.value.totalPerfiles)

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

function loadProfiles() {
  error.value = null
  return listado.load(0)
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

// Los grupos ya vienen filtrados y paginados por el servidor; aquí solo se adaptan para la tarjeta.
const applicants = computed(() => listado.data.value.resultado.pagina.content
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
      estado: first.estado === 'ACTIVO' ? 'ACTIVO' as const : 'INACTIVO' as const,
      estadoDetalle: estadoDetalle(first),
      busquedaPausada: first.cuentaActiva && first.busquedaPausada,
    }
  }))

onMounted(loadProfiles)
</script>

<template>
  <AdminShell
    active="postulantes"
    title="Postulantes Registrados"
    :subtitle="`${activosCount} activos · ${inactivosCount} inactivos · ${totalPerfiles} perfiles`"
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
    <PaginationBar
      :page="listado.page.value"
      :total-pages="listado.data.value.resultado.pagina.totalPages"
      :total-elements="listado.data.value.resultado.pagina.totalElements"
      :loading="listado.loading.value"
      label="Paginación de postulantes"
      @change="listado.goTo"
    />
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
  border: 1px solid var(--t-line-cfd9d3);
  background: var(--t-bg-ffffff);
  color: var(--t-fg-2f4a3d);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.88rem;
  cursor: pointer;
}
.admin-applicants__chip--active {
  border-color: var(--t-line-1f5a42);
  background: var(--t-bg-e7f2ec);
  color: var(--t-fg-16382b);
  font-weight: 600;
}
</style>

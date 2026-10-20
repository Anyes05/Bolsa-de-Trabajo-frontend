<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ApplicantGroupCard from '../../components/socio/ApplicantGroupCard.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import { adminApplicantService } from '../../services/adminApplicantService'
import type { AdminApplicantProfile, SocioProfileCv } from '../../services/types'

const applicantProfiles = ref<AdminApplicantProfile[]>([])
const selectedProfile = ref<MockApplicantProfile | null>(null)
const selectedCvs = ref<SocioProfileCv[]>([])
const expandedApplicantId = ref<number | null>(null)
const search = ref('')
const loading = ref(false)
const loadingCvs = ref(false)
const error = ref<string | null>(null)

function toDisplayProfile(profile: AdminApplicantProfile): MockApplicantProfile {
  return {
    id: String(profile.id), applicantId: profile.applicantId, fullName: profile.fullName, email: profile.email,
    initials: profile.initials, profileName: profile.profileName, categoryLabel: profile.categoryLabel,
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
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los postulantes.'
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
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los CVs del perfil.'
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
    error.value = cause instanceof Error ? cause.message : 'No se pudo descargar el CV.'
  }
}

const applicants = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  const groups = new Map<number, { id: number; fullName: string; email: string; initials: string; profiles: MockApplicantProfile[] }>()
  applicantProfiles.value.map(toDisplayProfile).forEach((profile) => {
    const matches = !term || [profile.fullName, profile.email, profile.identityCard, profile.profileName]
      .some((value) => value.toLocaleLowerCase('es').includes(term))
    if (!matches) return
    const group = groups.get(profile.applicantId)
    if (group) group.profiles.push(profile)
    else groups.set(profile.applicantId, {
      id: profile.applicantId, fullName: profile.fullName, email: profile.email,
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
    <div class="applicant-toolbar">
      <label class="applicant-search">
        <Search :size="17" />
        <input v-model="search" placeholder="Buscar por nombre, correo, cédula o perfil...">
      </label>
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
    <p v-else class="bolsa__empty">No hay postulantes que coincidan con la búsqueda.</p>
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
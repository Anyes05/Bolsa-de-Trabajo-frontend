<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowLeft, MapPin } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../../components/AppButton.vue'
import ProfileDetailModal from '../../components/socio/ProfileDetailModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { mockCompany, type MockApplicantProfile } from '../../data/mockSocioBolsa'
import { offerService } from '../../services/offerService'
import { socioApplicationsService } from '../../services/socioApplicationsService'
import type { ApplicantApplication, JobOffer, ReceivedApplication } from '../../services/types'

const route = useRoute()
const router = useRouter()
const selectedProfile = ref<MockApplicantProfile | null>(null)
const offer = ref<JobOffer | null>(null)
const applications = ref<ReceivedApplication[]>([])
const loading = ref(true)
const savingId = ref<number | null>(null)
const error = ref<string | null>(null)

const offerId = computed(() => String(route.params.offerId ?? ''))
const subtitle = computed(() => `${applications.value.length} ${applications.value.length === 1 ? 'recibida' : 'recibidas'}`)

const statusLabels: Record<ApplicantApplication['estado'], string> = {
  RECIBIDA: 'Recibida',
  REVISADA: 'Revisada',
  CONTACTADA: 'Contactada',
  SELECCIONADA: 'Seleccionada',
  DESCARTADA: 'Descartada',
}

function allowedNextStatuses(status: ApplicantApplication['estado']) {
  const transitions: Record<ApplicantApplication['estado'], ApplicantApplication['estado'][]> = {
    RECIBIDA: ['REVISADA', 'DESCARTADA'],
    REVISADA: ['CONTACTADA', 'SELECCIONADA', 'DESCARTADA'],
    CONTACTADA: ['SELECCIONADA', 'DESCARTADA'],
    SELECCIONADA: [],
    DESCARTADA: [],
  }
  return [status, ...transitions[status]]
}

function profileFor(application: ReceivedApplication): MockApplicantProfile {
  return {
    id: String(application.id),
    fullName: application.fullName,
    initials: application.initials,
    profileName: application.profileName,
    categoryLabel: application.tags[0]?.toUpperCase() || 'PERFIL LABORAL',
    location: application.location || 'San José',
    identityCard: application.identityCard || '',
    age: 0,
    tags: application.tags,
    sectors: application.tags,
    interests: application.tags,
    availability: application.availability,
    license: application.license || 'No informada',
    hasVehicle: application.hasVehicle,
    experienceSummary: application.experienceSummary || '',
    latestJob: application.latestJob || '',
    cvFileName: application.cvFileName || '',
    cvMeta: application.cvMeta || '',
    updatedAt: application.appliedOn,
    hasApplication: true,
    hasCv: application.cvId !== null,
  }
}

function openProfile(application: ReceivedApplication) {
  selectedProfile.value = profileFor(application)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const id = Number(offerId.value)
    const [offers, received] = await Promise.all([
      offerService.list(),
      socioApplicationsService.list(id),
    ])
    offer.value = offers.find((candidate) => candidate.id === id) ?? null
    applications.value = received
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar las postulaciones.'
  } finally {
    loading.value = false
  }
}

async function updateStatus(application: ReceivedApplication, event: Event) {
  const status = (event.target as HTMLSelectElement).value as ApplicantApplication['estado']
  if (status === application.status) return
  savingId.value = application.id
  error.value = null
  try {
    const updated = await socioApplicationsService.updateStatus(application.id, status)
    application.status = updated.status
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.'
  } finally {
    savingId.value = null
  }
}

async function downloadCv(applicationId: string) {
  const downloadWindow = window.open('about:blank', '_blank')
  try {
    const { url } = await socioApplicationsService.downloadCv(Number(applicationId))
    if (!downloadWindow) throw new Error('El navegador bloqueó la ventana de descarga.')
    downloadWindow.opener = null
    downloadWindow.location.href = url
  } catch (cause) {
    downloadWindow?.close()
    error.value = cause instanceof Error ? cause.message : 'No se pudo descargar el CV.'
  }
}

onMounted(load)
</script>

<template>
  <SocioShell
    v-if="offer"
    active-nav="ofertas"
    :title="`Postulaciones — ${offer.titulo}`"
    :subtitle="subtitle"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton variant="secondary" type="button" @click="router.push({ name: 'socio-mis-ofertas' })">
        <ArrowLeft :size="15" aria-hidden="true" />
        Volver
      </AppButton>
    </template>

    <section class="socio-applications" aria-label="Postulaciones de la oferta">
      <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
      <p v-if="loading">Cargando postulaciones...</p>
      <article
        v-for="application in loading ? [] : applications"
        :key="application.id"
        class="socio-application-card"
      >
        <button type="button" class="socio-application-card__main" @click="openProfile(application)">
          <span class="socio-application-card__avatar" aria-hidden="true">{{ application.initials }}</span>
          <div>
            <h2>{{ application.fullName }}</h2>
            <p>
              Perfil: {{ application.profileName }}
              <span>
                <MapPin :size="12" aria-hidden="true" />
                {{ application.location }}
              </span>
            </p>
            <ul>
              <li v-for="tag in application.tags" :key="tag">{{ tag }}</li>
            </ul>
          </div>
        </button>
        <div class="socio-application-card__status" :class="`socio-application-card__status--${application.status.toLowerCase()}`">
          <label>
            <span class="sr-only">Estado de {{ application.fullName }}</span>
            <select :value="application.status" :disabled="savingId === application.id" @change="updateStatus(application, $event)">
              <option v-for="status in allowedNextStatuses(application.status)" :key="status" :value="status">{{ statusLabels[status] }}</option>
            </select>
          </label>
          <time>{{ application.appliedOn }}</time>
        </div>
      </article>
      <p v-if="!loading && !applications.length" class="socio-applications__empty">Todavía no hay postulaciones para esta oferta.</p>
    </section>

    <template #overlay>
      <ProfileDetailModal
        v-if="selectedProfile"
        :profile="selectedProfile"
        @close="selectedProfile = null"
        @download-cv="downloadCv"
      />
    </template>
  </SocioShell>
  <SocioShell
    v-else
    active-nav="ofertas"
    title="Postulaciones"
    :subtitle="loading ? 'Cargando postulaciones...' : error || 'Oferta no encontrada'"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton variant="secondary" type="button" @click="router.push({ name: 'socio-mis-ofertas' })">
        <ArrowLeft :size="15" aria-hidden="true" />
        Volver
      </AppButton>
    </template>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
  </SocioShell>
</template>

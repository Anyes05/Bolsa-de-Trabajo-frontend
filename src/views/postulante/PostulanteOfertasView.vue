<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { applicantOfferService } from '../../services/applicantOfferService'
import { postulanteService } from '../../services/postulanteService'
import type { ApplicantApplication, CvResponse, JobOffer, ProfessionalProfile, RubroOption } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const activeTab = ref<'activas' | 'postulaciones'>('activas')
const showModal = ref(false)
const selectedOffer = ref<JobOffer | null>(null)
const selectedProfileId = ref(0)
const offers = ref<JobOffer[]>([])
const applications = ref<ApplicantApplication[]>([])
const profiles = ref<ProfessionalProfile[]>([])
const cvs = ref<CvResponse[]>([])
const sectors = ref<RubroOption[]>([])
const selectedSectorId = ref<number | null>(null)
const loading = ref(false)
const submitting = ref(false)
const message = ref<string | null>(null)
const messageTone = ref<'error' | 'success' | 'info'>('info')

const eligibleProfiles = computed(() => profiles.value.filter((profile) =>
  profile.visible && cvs.value.some((cv) => cv.perfilLaboralId === profile.id && cv.activo),
))
const applicationByOffer = computed(() => new Map(applications.value.map((application) => [application.ofertaId, application])))
const filteredOffers = computed(() => selectedSectorId.value
  ? offers.value.filter((offer) => offer.rubroId === selectedSectorId.value)
  : offers.value)
const selectedProfileCv = computed(() => cvs.value.find((cv) => cv.perfilLaboralId === selectedProfileId.value && cv.activo) ?? null)

async function load() {
  loading.value = true
  message.value = null
  try {
    const [loadedOffers, loadedApplications, loadedProfiles, loadedCvs, loadedSectors] = await Promise.all([
      applicantOfferService.list(),
      applicantOfferService.listApplications(),
      postulanteService.listProfiles(auth.token ?? undefined),
      postulanteService.listCvs(auth.token ?? undefined),
      applicantOfferService.listRubros(),
    ])
    offers.value = loadedOffers
    applications.value = loadedApplications
    profiles.value = loadedProfiles
    cvs.value = loadedCvs
    sectors.value = loadedSectors
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudieron cargar las ofertas.'
  } finally {
    loading.value = false
  }
}

function openApplyModal(offer: JobOffer) {
  if (!eligibleProfiles.value.length) {
    messageTone.value = 'error'
    message.value = 'Necesitas un perfil visible con un CV activo asociado para postularte.'
    return
  }
  selectedOffer.value = offer
  selectedProfileId.value = eligibleProfiles.value[0].id
  showModal.value = true
}

function closeApplyModal() {
  showModal.value = false
}

async function confirmApply() {
  if (!selectedOffer.value || !selectedProfileCv.value) return
  submitting.value = true
  try {
    await applicantOfferService.apply(selectedOffer.value.id, selectedProfileId.value)
    applications.value = await applicantOfferService.listApplications()
    messageTone.value = 'success'
    message.value = 'Tu postulación fue enviada.'
    showModal.value = false
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudo enviar la postulación.'
  } finally {
    submitting.value = false
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Fecha no disponible'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const availabilityLabels: Record<JobOffer['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo', PART_TIME: 'Part-time', INDEFINIDO: 'Cualquier horario',
}
const applicationStatusLabels: Record<ApplicantApplication['estado'], string> = {
  RECIBIDA: 'Recibida', REVISADA: 'Revisada', CONTACTADA: 'Contactada',
  SELECCIONADA: 'Seleccionada', DESCARTADA: 'Descartada',
}

onMounted(load)
</script>

<template>
  <PostulanteShell
    title="Ofertas de Empleo"
    subtitle="Explora las búsquedas laborales de socios de San José"
    active-section="ofertas"
  >
    <section class="postulante-offers">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <AppAlert v-else-if="loading" tone="info">Cargando ofertas y perfiles...</AppAlert>

      <nav class="postulante-offers__tabs" aria-label="Ofertas y postulaciones">
        <button
          type="button"
          class="postulante-offers__tab"
          :class="{ 'postulante-offers__tab--active': activeTab === 'activas' }"
          @click="activeTab = 'activas'"
        >
          Ofertas activas ({{ filteredOffers.length }})
        </button>
        <button
          type="button"
          class="postulante-offers__tab"
          :class="{ 'postulante-offers__tab--active': activeTab === 'postulaciones' }"
          @click="activeTab = 'postulaciones'"
        >
          Mis postulaciones ({{ applications.length }})
        </button>
      </nav>

      <label v-if="activeTab === 'activas'" class="postulante-offers__filter">
        Filtrar por rubro
        <select v-model.number="selectedSectorId">
          <option :value="null">Todos los rubros</option>
          <option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.nombreRubro }}</option>
        </select>
      </label>

      <div v-if="activeTab === 'activas'" class="postulante-offers__list">
        <article v-for="offer in filteredOffers" :key="offer.id" class="offer-card">
          <header class="offer-card__header">
            <div>
              <h2 class="offer-card__title">{{ offer.titulo }}</h2>
              <p class="offer-card__company">{{ offer.socioNombre }}</p>
            </div>
            <span class="offer-card__category">{{ offer.rubro }}</span>
          </header>
          <p class="offer-card__meta">
            {{ offer.zona || 'San José' }} · {{ availabilityLabels[offer.disponibilidadHoraria] }} · Publicada {{ formatDate(offer.fechaPublicacion) }}
          </p>
          <p class="offer-card__description">{{ offer.descripcion }}</p>
          <footer class="offer-card__footer">
            <p v-if="applicationByOffer.get(offer.id)" class="offer-card__applied">Ya te postulaste el {{ formatDate(applicationByOffer.get(offer.id)!.fecha) }}</p>
            <span v-else></span>
            <AppButton
              :variant="applicationByOffer.has(offer.id) ? 'secondary' : 'primary'"
              :disabled="applicationByOffer.has(offer.id) || loading"
              @click="openApplyModal(offer)"
            >
              {{ applicationByOffer.has(offer.id) ? 'Postulado' : 'Postularme' }}
            </AppButton>
          </footer>
        </article>
        <AppAlert v-if="!loading && !filteredOffers.length" tone="info">No hay ofertas activas para este rubro.</AppAlert>
      </div>

      <div v-else class="postulante-offers__list">
        <article v-for="application in applications" :key="application.id" class="application-card">
          <header class="application-card__header">
            <div class="application-card__icon" aria-hidden="true">▦</div>
            <div>
              <h2 class="application-card__title">{{ application.ofertaTitulo }}</h2>
              <p class="application-card__company">{{ application.socioNombre }} · {{ application.rubro }}</p>
            </div>
          </header>

          <div class="application-card__body">
            <p><strong>Perfil utilizado:</strong> <span class="application-card__pill">{{ application.perfilNombre || 'Perfil anterior' }}</span></p>
            <p>{{ formatDate(application.fecha) }}<template v-if="application.cvNombre"> · CV: {{ application.cvNombre }}</template></p>
          </div>

          <footer class="application-card__footer">
            <p><strong>Estado de la postulación:</strong> <span class="application-card__status" :class="`application-card__status--${application.estado.toLowerCase()}`">{{ applicationStatusLabels[application.estado] }}</span></p>
          </footer>
        </article>
        <AppAlert v-if="!applications.length" tone="info">Todavía no tienes postulaciones.</AppAlert>
      </div>
    </section>

    <div v-if="showModal && selectedOffer" class="modal" aria-modal="true" aria-labelledby="apply-modal-title">
      <div class="modal__backdrop" @click="closeApplyModal"></div>
      <section class="modal__panel">
        <header class="modal__header">
          <h3 id="apply-modal-title">Seleccionar Perfil</h3>
        </header>
        <p class="modal__text">Para postularte a <b>{{ selectedOffer.titulo }}</b>, elige el perfil y su CV activo.</p>

        <div class="modal__options">
          <label
            v-for="profile in eligibleProfiles"
            :key="profile.id"
            class="modal-profile"
            :class="{ 'modal-profile--active': selectedProfileId === profile.id }"
          >
            <input v-model="selectedProfileId" type="radio" :value="profile.id">
            <div>
              <strong>{{ profile.nombre }}</strong>
              <small>{{ profile.rubros.join(' · ') || 'Sin rubros indicados' }} · {{ cvs.find((cv) => cv.perfilLaboralId === profile.id && cv.activo)?.nombreArchivo || 'CV activo' }}</small>
            </div>
          </label>
        </div>

        <footer class="modal__actions">
          <AppButton variant="secondary" @click="closeApplyModal">Cancelar</AppButton>
          <AppButton :loading="submitting" :disabled="!selectedProfileCv" @click="confirmApply">Confirmar Postulación</AppButton>
        </footer>
      </section>
    </div>
  </PostulanteShell>
</template>

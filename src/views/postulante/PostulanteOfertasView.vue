<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { ofertasActivasMock, postulacionesMock, type OfertaActiva } from '../../data/mockPostulanteBolsa'
import { postulanteService } from '../../services/postulanteService'
import type { CvResponse } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const activeTab = ref<'activas' | 'postulaciones'>('activas')
const showModal = ref(false)
const selectedOffer = ref<OfertaActiva | null>(null)
const selectedCvId = ref(0)
const cvs = ref<CvResponse[]>([])
const loadingCvs = ref(false)
const message = ref<string | null>(null)
const messageTone = ref<'error' | 'success' | 'info'>('info')

const cvsForApply = computed(() => cvs.value)

function openApplyModal(offer: OfertaActiva) {
  if (!cvs.value.length) {
    messageTone.value = 'error'
    message.value = 'Necesitas subir al menos un CV en Mis Perfiles antes de postularte.'
    return
  }
  selectedOffer.value = offer
  selectedCvId.value = cvs.value.find((cv) => cv.activo)?.id ?? cvs.value[0]?.id ?? 0
  showModal.value = true
}

function closeApplyModal() {
  showModal.value = false
}

function confirmApply() {
  messageTone.value = 'info'
    message.value = 'Flujo de postulación pendiente: backend de ofertas en siguiente iteración.'
  showModal.value = false
}

async function loadCvs() {
  loadingCvs.value = true
  try {
    cvs.value = await postulanteService.listCvs(auth.token ?? undefined)
  } catch (error) {
    messageTone.value = 'error'
    message.value = error instanceof Error ? error.message : 'No se pudieron cargar tus CVs.'
  } finally {
    loadingCvs.value = false
  }
}

onMounted(loadCvs)
</script>

<template>
  <PostulanteShell
    title="Ofertas de Empleo"
    subtitle="Explora las búsquedas laborales de socios de San José"
    active-section="ofertas"
  >
    <section class="postulante-offers">
      <AppAlert v-if="message" :tone="messageTone">{{ message }}</AppAlert>
      <AppAlert v-else-if="loadingCvs" tone="info">Cargando CVs para postulación...</AppAlert>

      <nav class="postulante-offers__tabs" aria-label="Ofertas y postulaciones">
        <button
          type="button"
          class="postulante-offers__tab"
          :class="{ 'postulante-offers__tab--active': activeTab === 'activas' }"
          @click="activeTab = 'activas'"
        >
          Ofertas activas ({{ ofertasActivasMock.length }})
        </button>
        <button
          type="button"
          class="postulante-offers__tab"
          :class="{ 'postulante-offers__tab--active': activeTab === 'postulaciones' }"
          @click="activeTab = 'postulaciones'"
        >
          Mis postulaciones ({{ postulacionesMock.length }})
        </button>
      </nav>

      <div v-if="activeTab === 'activas'" class="postulante-offers__list">
        <article v-for="offer in ofertasActivasMock" :key="offer.id" class="offer-card">
          <header class="offer-card__header">
            <div>
              <h2 class="offer-card__title">{{ offer.title }}</h2>
              <p class="offer-card__company">{{ offer.company }}</p>
            </div>
            <span class="offer-card__category">{{ offer.category }}</span>
          </header>
          <p class="offer-card__meta">
            {{ offer.location }} · {{ offer.schedule }} · {{ offer.publishedAgo }}
          </p>
          <p class="offer-card__description">{{ offer.description }}</p>
          <footer class="offer-card__footer">
            <p v-if="offer.applied" class="offer-card__applied">Ya te postulaste a esta oferta el {{ offer.appliedDate }}</p>
            <span v-else></span>
            <AppButton
              :variant="offer.applied ? 'secondary' : 'primary'"
              :disabled="offer.applied"
              @click="openApplyModal(offer)"
            >
              {{ offer.applied ? 'Postulado' : 'Postularme' }}
            </AppButton>
          </footer>
        </article>
      </div>

      <div v-else class="postulante-offers__list">
        <article v-for="application in postulacionesMock" :key="application.id" class="application-card">
          <header class="application-card__header">
            <div class="application-card__icon" aria-hidden="true">▦</div>
            <div>
              <h2 class="application-card__title">{{ application.title }}</h2>
              <p class="application-card__company">{{ application.company }}</p>
            </div>
          </header>

          <div class="application-card__body">
            <p><strong>Perfil utilizado:</strong> <span class="application-card__pill">{{ application.profileName }}</span></p>
            <p>{{ application.appliedDate }} · {{ application.location }}</p>
          </div>

          <footer class="application-card__footer">
            <p><strong>Estado de la postulación:</strong> <span class="application-card__status">{{ application.status }}</span></p>
            <AppButton variant="secondary">Ver perfil postulado</AppButton>
          </footer>
        </article>
      </div>
    </section>

    <div v-if="showModal && selectedOffer" class="modal" aria-modal="true" aria-labelledby="apply-modal-title">
      <div class="modal__backdrop" @click="closeApplyModal"></div>
      <section class="modal__panel">
        <header class="modal__header">
          <h3 id="apply-modal-title">Seleccionar Perfil</h3>
        </header>
        <p class="modal__text">Para postularte a <b>{{ selectedOffer.title }}</b>, elige cuál perfil quieres enviar.</p>

        <div class="modal__options">
          <label
            v-for="cv in cvsForApply"
            :key="cv.id"
            class="modal-profile"
            :class="{ 'modal-profile--active': selectedCvId === cv.id }"
          >
            <input v-model="selectedCvId" type="radio" :value="cv.id">
            <div>
              <strong>{{ cv.nombreArchivo || `CV v${cv.version}` }}</strong>
              <small>{{ cv.activo ? 'Activo' : 'Inactivo' }} · {{ cv.resumen || 'Sin resumen' }}</small>
            </div>
          </label>
        </div>

        <footer class="modal__actions">
          <AppButton variant="secondary" @click="closeApplyModal">Cancelar</AppButton>
          <AppButton @click="confirmApply">Confirmar Postulación</AppButton>
        </footer>
      </section>
    </div>
  </PostulanteShell>
</template>

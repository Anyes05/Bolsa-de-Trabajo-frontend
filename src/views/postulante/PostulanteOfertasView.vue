<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../../components/AppButton.vue'
import PostulanteShell from '../../components/postulante/PostulanteShell.vue'
import { ofertasActivasMock, perfilesMock, postulacionesMock, type OfertaActiva } from '../../data/mockPostulanteBolsa'

const activeTab = ref<'activas' | 'postulaciones'>('activas')
const showModal = ref(false)
const selectedOffer = ref<OfertaActiva | null>(null)
const selectedProfileId = ref(perfilesMock[0]?.id ?? 0)

const profilesForApply = computed(() => perfilesMock)

function openApplyModal(offer: OfertaActiva) {
  selectedOffer.value = offer
  selectedProfileId.value = perfilesMock[0]?.id ?? 0
  showModal.value = true
}

function closeApplyModal() {
  showModal.value = false
}

function confirmApply() {
  showModal.value = false
}
</script>

<template>
  <PostulanteShell
    title="Ofertas de Empleo"
    subtitle="Explora las busquedas laborales de empresas de San Jose"
    active-section="ofertas"
  >
    <section class="postulante-offers">
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
            <p><strong>Estado de la postulacion:</strong> <span class="application-card__status">{{ application.status }}</span></p>
            <AppButton variant="secondary">Ver perfil postulado</AppButton>
          </footer>
        </article>
      </div>
    </section>

    <div v-if="showModal && selectedOffer" class="modal" role="dialog" aria-modal="true" aria-labelledby="apply-modal-title">
      <div class="modal__backdrop" @click="closeApplyModal"></div>
      <section class="modal__panel">
        <header class="modal__header">
          <h3 id="apply-modal-title">Seleccionar Perfil</h3>
        </header>
        <p class="modal__text">Para postularte a <b>{{ selectedOffer.title }}</b>, elegi cual perfil queres enviar.</p>

        <div class="modal__options">
          <label
            v-for="profile in profilesForApply"
            :key="profile.id"
            class="modal-profile"
            :class="{ 'modal-profile--active': selectedProfileId === profile.id }"
          >
            <input v-model="selectedProfileId" type="radio" :value="profile.id">
            <div>
              <strong>{{ profile.name }}</strong>
              <small>{{ profile.skills.slice(0, 2).join(' · ') }}</small>
            </div>
          </label>
        </div>

        <footer class="modal__actions">
          <AppButton variant="secondary" @click="closeApplyModal">Cancelar</AppButton>
          <AppButton @click="confirmApply">Confirmar Postulacion</AppButton>
        </footer>
      </section>
    </div>
  </PostulanteShell>
</template>

<script setup lang="ts">
import { Pencil, Pause, Play, Plus, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import AppButton from '../../components/AppButton.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { availabilityLabel, mockCompany } from '../../data/mockSocioBolsa'
import { emptyOfferForm, type MockSocioOffer } from '../../data/mockSocioOfertas'
import { useSocioOffersStore } from '../../stores/socioOffers'

const offers = useSocioOffersStore()
const formMode = ref<'create' | 'edit' | null>(null)
const formOffer = ref<MockSocioOffer | null>(null)

const subtitle = computed(() => `${offers.offerCount} ${offers.offerCount === 1 ? 'oferta' : 'ofertas'}`)

function openCreate() {
  formMode.value = 'create'
  formOffer.value = emptyOfferForm()
}

function openEdit(offer: MockSocioOffer) {
  formMode.value = 'edit'
  formOffer.value = { ...offer }
}

function closeForm() {
  formMode.value = null
  formOffer.value = null
}

function saveForm(offer: MockSocioOffer) {
  offers.saveOffer(offer)
  closeForm()
}

function applicationsLabel(offerId: string) {
  const total = offers.applicationsFor(offerId).length
  return `${total} ${total === 1 ? 'postulacion' : 'postulaciones'}`
}
</script>

<template>
  <SocioShell
    active-nav="ofertas"
    title="Gestion de Ofertas Laborales"
    :subtitle="subtitle"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <template #header-actions>
      <AppButton type="button" @click="openCreate">
        <Plus :size="15" aria-hidden="true" />
        Publicar Oferta
      </AppButton>
    </template>

    <section class="socio-offers" aria-label="Mis ofertas">
      <article
        v-for="offer in offers.offers"
        :key="offer.id"
        class="socio-offer-card"
        :class="`socio-offer-card--${offer.status.toLowerCase()}`"
      >
        <div class="socio-offer-card__body">
          <header class="socio-offer-card__header">
            <h2>{{ offer.title }}</h2>
            <span class="socio-offer-card__status">{{ offer.status }}</span>
          </header>
          <p class="socio-offer-card__meta">
            <span>{{ offer.sector }}</span>
            <span>{{ offer.zone || 'Sin zona' }}</span>
            <span>{{ availabilityLabel[offer.availability] }}</span>
            <span v-if="offer.salary">{{ offer.salary }}</span>
          </p>
          <p class="socio-offer-card__text">{{ offer.description }}</p>
          <RouterLink class="socio-offer-card__apps" :to="{ name: 'socio-oferta-postulaciones', params: { offerId: offer.id } }">
            {{ applicationsLabel(offer.id) }}
          </RouterLink>
        </div>
        <aside class="socio-offer-card__actions">
          <button v-if="offer.status !== 'Cerrada'" class="socio-offer-card__edit" type="button" @click="openEdit(offer)">
            <Pencil :size="13" aria-hidden="true" /> Editar
          </button>
          <button
            v-if="offer.status === 'Activa'"
            class="socio-offer-card__pause"
            type="button"
            @click="offers.setStatus(offer.id, 'Pausada')"
          >
            <Pause :size="12" aria-hidden="true" /> Pausar
          </button>
          <button
            v-else-if="offer.status === 'Pausada'"
            class="socio-offer-card__resume"
            type="button"
            @click="offers.setStatus(offer.id, 'Activa')"
          >
            <Play :size="12" aria-hidden="true" /> Reactivar
          </button>
          <button
            v-if="offer.status !== 'Cerrada'"
            class="socio-offer-card__close"
            type="button"
            @click="offers.setStatus(offer.id, 'Cerrada')"
          >
            <X :size="13" aria-hidden="true" /> Cerrar
          </button>
        </aside>
      </article>
    </section>

    <template #overlay>
      <OfferFormModal
        v-if="formMode"
        :mode="formMode"
        :offer="formOffer"
        @close="closeForm"
        @save="saveForm"
      />
    </template>
  </SocioShell>
</template>

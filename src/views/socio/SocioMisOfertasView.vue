<script setup lang="ts">
import { Pencil, Pause, Play, Plus, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import AppButton from '../../components/AppButton.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockCompany } from '../../data/mockSocioBolsa'
import { offerService } from '../../services/offerService'
import type { JobOffer, JobOfferPayload, RubroOption } from '../../services/types'

const offers = ref<JobOffer[]>([])
const sectors = ref<RubroOption[]>([])
const busy = ref(false)
const error = ref('')
const formMode = ref<'create' | 'edit' | null>(null)
const formOffer = ref<JobOffer | null>(null)
const availabilityLabels: Record<JobOffer['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Part-time',
  INDEFINIDO: 'Cualquier horario',
}

const subtitle = computed(() => `${offers.value.length} ${offers.value.length === 1 ? 'oferta' : 'ofertas'}`)

async function load() {
  busy.value = true
  error.value = ''
  try {
    const [loadedOffers, loadedSectors] = await Promise.all([offerService.list(), offerService.listRubros()])
    offers.value = loadedOffers
    sectors.value = loadedSectors
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar las ofertas.'
  } finally {
    busy.value = false
  }
}

onMounted(load)

function openCreate() {
  formMode.value = 'create'
  formOffer.value = null
}

function openEdit(offer: JobOffer) {
  formMode.value = 'edit'
  formOffer.value = { ...offer }
}

function closeForm() {
  formMode.value = null
  formOffer.value = null
}

async function saveForm(offer: JobOfferPayload) {
  error.value = ''
  try {
    if (formOffer.value) await offerService.update(formOffer.value.id, offer)
    else await offerService.create(offer)
    closeForm()
    await load()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible guardar la oferta.'
  }
}

function applicationsLabel(total: number) {
  return `${total} ${total === 1 ? 'postulación' : 'postulaciones'}`
}

async function setStatus(offer: JobOffer, status: JobOffer['estado']) {
  try {
    const updated = await offerService.setStatus(offer.id, status)
    offers.value = offers.value.map((current) => current.id === updated.id ? updated : current)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cambiar el estado.'
  }
}

function displayStatus(status: JobOffer['estado']) {
  return { ACTIVA: 'Activa', PAUSADA: 'Pausada', CERRADA: 'Cerrada', VENCIDA: 'Vencida' }[status]
}
</script>

<template>
  <SocioShell
    active-nav="ofertas"
    title="Gestión de Ofertas Laborales"
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
        v-for="offer in offers"
        :key="offer.id"
        class="socio-offer-card"
        :class="`socio-offer-card--${offer.estado.toLowerCase()}`"
      >
        <div class="socio-offer-card__body">
          <header class="socio-offer-card__header">
            <h2>{{ offer.titulo }}</h2>
            <span class="socio-offer-card__status">{{ displayStatus(offer.estado) }}</span>
          </header>
          <p class="socio-offer-card__meta">
            <span>{{ offer.rubro }}</span>
            <span>{{ offer.zona || 'Sin zona' }}</span>
            <span>{{ availabilityLabels[offer.disponibilidadHoraria] }}</span>
            <span v-if="offer.salario">{{ offer.salario }}</span>
            <span>{{ offer.fechaCierre || 'Indefinida' }}</span>
          </p>
          <p class="socio-offer-card__text">{{ offer.descripcion }}</p>
          <RouterLink class="socio-offer-card__apps" :to="{ name: 'socio-oferta-postulaciones', params: { offerId: offer.id } }">
            {{ applicationsLabel(offer.postulaciones) }}
          </RouterLink>
        </div>
        <aside class="socio-offer-card__actions">
          <button v-if="offer.estado === 'ACTIVA' || offer.estado === 'PAUSADA'" class="socio-offer-card__edit" type="button" @click="openEdit(offer)">
            <Pencil :size="13" aria-hidden="true" /> Editar
          </button>
          <button
            v-if="offer.estado === 'ACTIVA'"
            class="socio-offer-card__pause"
            type="button"
            @click="setStatus(offer, 'PAUSADA')"
          >
            <Pause :size="12" aria-hidden="true" /> Pausar
          </button>
          <button
            v-else-if="offer.estado === 'PAUSADA'"
            class="socio-offer-card__resume"
            type="button"
            @click="setStatus(offer, 'ACTIVA')"
          >
            <Play :size="12" aria-hidden="true" /> Reactivar
          </button>
          <button
            v-if="offer.estado === 'ACTIVA' || offer.estado === 'PAUSADA'"
            class="socio-offer-card__close"
            type="button"
            @click="setStatus(offer, 'CERRADA')"
          >
            <X :size="13" aria-hidden="true" /> Cerrar
          </button>
        </aside>
      </article>
      <p v-if="busy">Cargando ofertas...</p>
      <p v-else-if="!offers.length">No tienes ofertas laborales todavía.</p>
    </section>

    <template #overlay>
      <OfferFormModal
        v-if="formMode"
        :mode="formMode"
        :offer="formOffer"
        :sectors="sectors"
        :admin-mode="false"
        @close="closeForm"
        @save="saveForm"
      />
    </template>
  </SocioShell>
</template>

<script setup lang="ts">
import { Pencil, Pause, Play, Plus, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { useServerList } from '../../composables/useServerList'
import { offerService } from '../../services/offerService'
import { emptyPage, type Page } from '../../services/pagination'
import type { JobOffer, JobOfferPayload, RubroOption } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'

const sectors = ref<RubroOption[]>([])
const catalogBusy = ref(false)
const error = ref('')
/** Si el socio tiene alguna oferta (sin filtro); distingue "sin ofertas" de "ninguna en este estado". */
const hasAnyOffer = ref(false)
const formMode = ref<'create' | 'edit' | null>(null)
const formOffer = ref<JobOffer | null>(null)
const statusFilter = ref<'TODAS' | JobOffer['estado']>('TODAS')
const availabilityLabels: Record<JobOffer['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo',
  PART_TIME: 'Part-time',
  INDEFINIDO: 'Cualquier horario',
}
const statusLabels: Record<JobOffer['estado'], string> = {
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  CERRADA: 'Cerrada',
  VENCIDA: 'Vencida',
}

// Estado y paginación: los resuelve el backend (el socio solo recibe sus propias ofertas).
const listado = useServerList<Page<JobOffer>>({
  fetch: async (page) => {
    const result = await offerService.list({ estado: statusFilter.value === 'TODAS' ? null : statusFilter.value, page })
    if (statusFilter.value === 'TODAS') hasAnyOffer.value = result.totalElements > 0
    else if (result.totalElements > 0) hasAnyOffer.value = true
    return result
  },
  filters: [statusFilter],
  initial: emptyPage(),
  onError: (exception) => { error.value = userFacingError(exception, 'cargar tus ofertas') },
})
const filteredOffers = computed(() => listado.data.value.content)
const busy = computed(() => catalogBusy.value || (listado.loading.value && !filteredOffers.value.length))

const subtitle = computed(() => {
  const total = listado.data.value.totalElements
  return `${total} ${total === 1 ? 'oferta' : 'ofertas'}${statusFilter.value !== 'TODAS' ? ` · ${statusLabels[statusFilter.value]}` : ''}`
})

async function load() {
  catalogBusy.value = true
  error.value = ''
  try {
    const [loadedSectors] = await Promise.all([offerService.listRubros(), listado.load()])
    sectors.value = loadedSectors
  } catch (exception) {
    error.value = userFacingError(exception, 'cargar tus ofertas')
  } finally {
    catalogBusy.value = false
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
    error.value = userFacingError(exception, 'guardar la oferta')
  }
}

function applicationsLabel(total: number) {
  return `${total} ${total === 1 ? 'postulación' : 'postulaciones'}`
}

async function setStatus(offer: JobOffer, status: JobOffer['estado']) {
  error.value = ''
  try {
    await offerService.setStatus(offer.id, status)
    // Con un filtro de estado activo la oferta puede salir de la página: se recarga desde el servidor.
    await listado.load()
  } catch (exception) {
    error.value = userFacingError(exception, 'cambiar el estado de la oferta')
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
  >
    <template #header-actions>
      <AppButton type="button" @click="openCreate">
        <Plus :size="15" aria-hidden="true" />
        Publicar Oferta
      </AppButton>
    </template>

    <section class="socio-offers" aria-label="Mis ofertas">
      <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
      <div class="offers-status-filters" aria-label="Filtrar ofertas por estado">
        <button
          v-for="filter in (['TODAS', 'ACTIVA', 'PAUSADA', 'CERRADA', 'VENCIDA'] as const)"
          :key="filter"
          class="cash-filter offers-status-filters__cash-filter"
          :class="{ 'cash-filter--active': statusFilter === filter }"
          type="button"
          @click="statusFilter = filter"
        >
          {{ filter === 'TODAS' ? 'Todas' : filter === 'ACTIVA' ? 'Activas' : statusLabels[filter] }}
        </button>
      </div>

      <article
        v-for="offer in filteredOffers"
        :key="offer.id"
        class="socio-offer-card"
        :class="`socio-offer-card--${offer.estado.toLowerCase()}`"
      >
        <div class="socio-offer-card__body">
          <header class="socio-offer-card__header">
            <h2 class="socio-offer-card__header-heading">{{ offer.titulo }}</h2>
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
          <p v-if="offer.mostrarNombreEmpresa === false" class="socio-offer-card__meta">Nombre de la empresa reservado para postulantes.</p>
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
      <p v-else-if="!hasAnyOffer">No tienes ofertas laborales todavía.</p>
      <p v-else-if="!filteredOffers.length">No hay ofertas en este estado.</p>
      <PaginationBar
        :page="listado.page.value"
        :total-pages="listado.data.value.totalPages"
        :total-elements="listado.data.value.totalElements"
        :loading="listado.loading.value"
        label="Paginación de mis ofertas"
        @change="listado.goTo"
      />
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

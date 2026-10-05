<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil, Pause, Play, Plus, Search, X } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import { offerService } from '../../services/offerService'
import type { ActiveSocioOption, JobOffer, JobOfferPayload } from '../../services/types'

const offers = ref<JobOffer[]>([])
const sectors = ref<{ id: number; nombreRubro: string }[]>([])
const socios = ref<ActiveSocioOption[]>([])
const loading = ref(false)
const error = ref('')
const modalOpen = ref(false)
const selectedOffer = ref<JobOffer | null>(null)
const search = ref('')
const statusFilter = ref('TODAS')

const filteredOffers = computed(() => offers.value.filter((offer) => {
  const matchesSearch = `${offer.titulo} ${offer.socioNombre} ${offer.rubro}`.toLowerCase().includes(search.value.toLowerCase())
  return matchesSearch && (statusFilter.value === 'TODAS' || offer.estado === statusFilter.value)
}))

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [offerList, sectorList, partnerList] = await Promise.all([
      offerService.list(),
      offerService.listRubros(),
      offerService.listActiveSocios(),
    ])
    offers.value = offerList
    sectors.value = sectorList
    socios.value = partnerList
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar las ofertas.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  selectedOffer.value = null
  modalOpen.value = true
}

function openEdit(offer: JobOffer) {
  selectedOffer.value = offer
  modalOpen.value = true
}

async function saveOffer(payload: JobOfferPayload) {
  error.value = ''
  try {
    if (selectedOffer.value) await offerService.update(selectedOffer.value.id, payload)
    else await offerService.create(payload)
    modalOpen.value = false
    await loadData()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar la oferta.'
  }
}

async function changeStatus(offer: JobOffer, status: JobOffer['estado']) {
  error.value = ''
  try {
    await offerService.setStatus(offer.id, status)
    await loadData()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo actualizar el estado.'
  }
}

const statusLabels: Record<JobOffer['estado'], string> = {
  ACTIVA: 'Activa', PAUSADA: 'Pausada', CERRADA: 'Cerrada', VENCIDA: 'Vencida',
}
const availabilityLabels: Record<JobOffer['disponibilidadHoraria'], string> = {
  FULL_TIME: 'Tiempo completo', PART_TIME: 'Part-time', INDEFINIDO: 'Cualquier horario',
}

onMounted(loadData)
</script>

<template>
  <AdminShell active="ofertas" title="Ofertas Laborales" subtitle="Vacantes publicadas por los socios de San José">
    <template #header-actions>
      <button class="offers-publish" type="button" @click="openCreate"><Plus :size="15" /> Nueva oferta</button>
    </template>

    <AppAlert v-if="error">{{ error }}</AppAlert>

    <div class="admin-toolbar">
      <label class="admin-search">
        <Search :size="16" aria-hidden="true" />
        <input v-model="search" type="search" placeholder="Buscar oferta o socio..." aria-label="Buscar oferta o socio">
      </label>
      <div class="cash-filters" aria-label="Filtrar ofertas por estado">
        <button
          v-for="filter in ['TODAS', 'ACTIVA', 'PAUSADA', 'CERRADA', 'VENCIDA']"
          :key="filter"
          class="cash-filter"
          :class="{ 'cash-filter--active': statusFilter === filter }"
          type="button"
          @click="statusFilter = filter"
        >{{ filter === 'TODAS' ? 'Todas' : statusLabels[filter as JobOffer['estado']] }}</button>
      </div>
    </div>

    <p v-if="loading" class="company-empty">Cargando ofertas...</p>
    <p v-else-if="!filteredOffers.length" class="company-empty">No hay ofertas para mostrar.</p>
    <section v-else class="socio-offers" aria-label="Ofertas laborales">
      <article
        v-for="offer in filteredOffers"
        :key="offer.id"
        class="socio-offer-card"
        :class="`socio-offer-card--${offer.estado === 'VENCIDA' ? 'cerrada' : offer.estado.toLowerCase()}`"
      >
        <div class="socio-offer-card__body">
          <header class="socio-offer-card__header">
            <h2>{{ offer.titulo }}</h2>
            <span class="socio-offer-card__status">{{ statusLabels[offer.estado] }}</span>
          </header>
          <p class="socio-offer-card__meta">
            <span>{{ offer.socioNombre }} · {{ offer.rubro }}</span>
            <span>{{ offer.zona || 'Sin zona' }}</span>
            <span>{{ availabilityLabels[offer.disponibilidadHoraria] }}</span>
            <span v-if="offer.salario">{{ offer.salario }}</span>
            <span>{{ offer.fechaCierre || 'Indefinida' }}</span>
            <span>{{ offer.vacantes }} {{ offer.vacantes === 1 ? 'vacante' : 'vacantes' }}</span>
          </p>
          <p class="socio-offer-card__text">{{ offer.descripcion }}</p>
          <RouterLink class="socio-offer-card__apps" :to="{ name: 'admin-offer-applications', params: { offerId: offer.id } }">
            {{ offer.postulaciones }} {{ offer.postulaciones === 1 ? 'postulación' : 'postulaciones' }}
          </RouterLink>
        </div>
        <aside class="socio-offer-card__actions">
          <button v-if="offer.estado === 'ACTIVA' || offer.estado === 'PAUSADA'" class="socio-offer-card__edit" type="button" @click="openEdit(offer)">
            <Pencil :size="13" aria-hidden="true" /> Editar
          </button>
          <button v-if="offer.estado === 'ACTIVA'" class="socio-offer-card__pause" type="button" @click="changeStatus(offer, 'PAUSADA')">
            <Pause :size="12" aria-hidden="true" /> Pausar
          </button>
          <button v-else-if="offer.estado === 'PAUSADA'" class="socio-offer-card__resume" type="button" @click="changeStatus(offer, 'ACTIVA')">
            <Play :size="12" aria-hidden="true" /> Reactivar
          </button>
          <button v-if="offer.estado === 'ACTIVA' || offer.estado === 'PAUSADA'" class="socio-offer-card__close" type="button" @click="changeStatus(offer, 'CERRADA')">
            <X :size="13" aria-hidden="true" /> Cerrar
          </button>
        </aside>
      </article>
    </section>

    <OfferFormModal
      v-if="modalOpen"
      :mode="selectedOffer ? 'edit' : 'create'"
      :offer="selectedOffer"
      :admin-mode="true"
      :sectors="sectors"
      :socios="socios"
      @close="modalOpen = false"
      @save="saveOffer"
    />
  </AdminShell>
</template>

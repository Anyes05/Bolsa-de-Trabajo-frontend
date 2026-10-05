<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '../../components/AppButton.vue'
import OfferFormModal from '../../components/socio/OfferFormModal.vue'
import { offerService } from '../../services/offerService'
import type { ActiveSocioOption, JobOffer, JobOfferPayload } from '../../services/types'

const offers = ref<JobOffer[]>([])
const sectors = ref<{ id: number; nombreRubro: string }[]>([])
const socios = ref<ActiveSocioOption[]>([])
const loading = ref(false)
const saving = ref(false)
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
  saving.value = true
  error.value = ''
  try {
    if (selectedOffer.value) await offerService.update(selectedOffer.value.id, payload)
    else await offerService.create(payload)
    modalOpen.value = false
    await loadData()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar la oferta.'
  } finally {
    saving.value = false
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
  <section class="admin-offers">
    <header class="page-heading">
      <div>
        <p class="eyebrow">GESTIÓN DE EMPLEO</p>
        <h1>Ofertas laborales</h1>
        <p class="subtitle">Administrá las vacantes publicadas por los socios.</p>
      </div>
      <AppButton variant="primary" @click="openCreate">Nueva oferta</AppButton>
    </header>

    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>

    <div class="toolbar">
      <input v-model="search" type="search" placeholder="Buscar oferta o socio" aria-label="Buscar oferta o socio">
      <select v-model="statusFilter" aria-label="Filtrar por estado">
        <option value="TODAS">Todos los estados</option>
        <option value="ACTIVA">Activas</option>
        <option value="PAUSADA">Pausadas</option>
        <option value="CERRADA">Cerradas</option>
        <option value="VENCIDA">Vencidas</option>
      </select>
    </div>

    <p v-if="loading" class="feedback">Cargando ofertas...</p>
    <p v-else-if="!filteredOffers.length" class="feedback">No hay ofertas para mostrar.</p>
    <div v-else class="offer-list">
      <article v-for="offer in filteredOffers" :key="offer.id" class="offer-row">
        <div class="offer-main">
          <div class="offer-title-line">
            <h2>{{ offer.titulo }}</h2>
            <span class="status" :class="`status-${offer.estado.toLowerCase()}`">{{ statusLabels[offer.estado] }}</span>
          </div>
          <p class="partner">{{ offer.socioNombre }} · {{ offer.rubro }}</p>
          <p class="meta">{{ offer.zona || 'Zona no especificada' }} · {{ availabilityLabels[offer.disponibilidadHoraria] }} · {{ offer.fechaCierre || 'Vigencia indefinida' }}</p>
        </div>
        <div class="actions">
          <button class="icon-button" type="button" title="Editar oferta" aria-label="Editar oferta" :disabled="offer.estado === 'CERRADA' || offer.estado === 'VENCIDA'" @click="openEdit(offer)">Editar</button>
          <button v-if="offer.estado === 'ACTIVA'" class="icon-button" type="button" @click="changeStatus(offer, 'PAUSADA')">Pausar</button>
          <button v-if="offer.estado === 'PAUSADA'" class="icon-button" type="button" @click="changeStatus(offer, 'ACTIVA')">Reanudar</button>
          <button v-if="offer.estado === 'ACTIVA' || offer.estado === 'PAUSADA'" class="icon-button danger" type="button" @click="changeStatus(offer, 'CERRADA')">Cerrar</button>
        </div>
      </article>
    </div>

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
  </section>
</template>

<style scoped>
.admin-offers { display: grid; gap: 1.25rem; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.eyebrow { margin: 0 0 .3rem; color: #47755b; font-size: .72rem; font-weight: 700; letter-spacing: .08em; }
h1 { margin: 0; color: #173e2c; font-size: 1.65rem; }
.subtitle, .partner, .meta { margin: .35rem 0 0; color: #64736a; }
.toolbar { display: flex; gap: .75rem; }
.toolbar input, .toolbar select { min-height: 2.6rem; padding: .5rem .75rem; border: 1px solid #d4ddd6; border-radius: 6px; background: white; color: #26372d; }
.toolbar input { flex: 1; }
.offer-list { border-top: 1px solid #dce4dd; }
.offer-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem .25rem; border-bottom: 1px solid #dce4dd; }
.offer-title-line, .actions { display: flex; align-items: center; gap: .65rem; }
h2 { margin: 0; color: #20382a; font-size: 1rem; }
.status { padding: .2rem .5rem; border-radius: 999px; background: #edf3ee; color: #31563e; font-size: .75rem; }
.status-pausada { background: #fff4df; color: #805a12; }
.status-cerrada, .status-vencida { background: #f2eeee; color: #685454; }
.icon-button { border: 0; background: transparent; color: #326544; cursor: pointer; font: inherit; font-size: .85rem; }
.icon-button:disabled { color: #9ca7a0; cursor: not-allowed; }
.danger { color: #9b4242; }
.feedback { margin: 0; padding: .75rem 0; color: #607067; }
.error { color: #a33d3d; }
@media (max-width: 760px) { .page-heading, .offer-row { align-items: flex-start; flex-direction: column; } .toolbar { flex-direction: column; } .actions { flex-wrap: wrap; } }
</style>

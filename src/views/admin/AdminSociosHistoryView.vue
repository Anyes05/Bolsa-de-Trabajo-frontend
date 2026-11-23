<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays, History, Search } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import AppButton from '../../components/AppButton.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useServerList } from '../../composables/useServerList'
import { ApiRequestError } from '../../services/http'
import { emptyPage, type Page } from '../../services/pagination'
import { socioService, type SocioSubscriptionEntry } from '../../services/socioService'
import type { SocioRecord } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'

const route = useRoute()
const query = ref('')
const selected = ref<SocioRecord | null>(null)
const entries = ref<SocioSubscriptionEntry[]>([])
const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const error = ref('')
const detailError = ref('')
const success = ref('')
const fecha = ref('')
let detailRevision = 0
const labels = { ALTA: 'Alta inicial', BAJA: 'Baja', REINGRESO: 'Reingreso', REINGRESO_PROGRAMADO: 'Reingreso programado' }
const states = { REGISTRADO: 'Registrado', PENDIENTE: 'Pendiente', APLICADO: 'Aplicado', CANCELADO: 'Cancelado' }
// Búsqueda y paginación de socios: las resuelve el backend.
const listado = useServerList<Page<SocioRecord>>({
  fetch: (page) => socioService.pageSocios({ q: query.value, page }),
  search: query,
  initial: emptyPage(),
  onError: (cause) => { error.value = userFacingError(cause, 'cargar el historial de socios') },
})
const filtered = computed(() => listado.data.value.content)
const pending = computed(() => entries.value.find(e => e.estado === 'PENDIENTE'))
const minimum = computed(() => entries.value.filter(e => ['ALTA', 'BAJA', 'REINGRESO'].includes(e.tipo)).map(e => e.fecha).sort().at(-1))
const invalidDate = computed(() => !!fecha.value && !!minimum.value && fecha.value < minimum.value)
function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('es-UY')
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const id = Number(route.query.socio)
    // El socio preseleccionado se pide por id: puede no estar en la primera página.
    const [, socio] = await Promise.all([
      listado.load(0),
      Number.isInteger(id) && id > 0
        ? socioService.getSocioById(id).catch((cause: unknown) => {
          if (cause instanceof ApiRequestError && cause.status === 404) return null
          throw cause
        })
        : null,
    ])
    if (socio) await select(socio)
  } catch (cause) {
    error.value = userFacingError(cause, 'cargar el historial de socios')
  } finally {
    loading.value = false
  }
}
async function select(socio: SocioRecord) {
  if (saving.value) return
  const revision = ++detailRevision
  selected.value = socio
  entries.value = []
  fecha.value = ''
  success.value = ''
  detailError.value = ''
  detailLoading.value = true
  try {
    const result = await socioService.subscriptionHistory(socio.id)
    if (revision === detailRevision) entries.value = result
  } catch (cause) {
    if (revision === detailRevision) detailError.value = userFacingError(cause, 'cargar los movimientos de suscripción')
  } finally {
    if (revision === detailRevision) detailLoading.value = false
  }
}
async function resume() {
  if (!selected.value || !fecha.value || invalidDate.value || saving.value || pending.value) return
  const id = selected.value.id
  saving.value = true
  detailError.value = ''
  success.value = ''
  try {
    const updated = await socioService.activateSocio(id, fecha.value)
    const current = listado.data.value
    listado.data.value = { ...current, content: current.content.map(s => s.id === id ? updated : s) }
    selected.value = updated
    entries.value = await socioService.subscriptionHistory(id)
    success.value = updated.activo ? 'Suscripción reanudada correctamente.' : 'Reingreso programado. El socio seguirá inactivo hasta la fecha elegida.'
    fecha.value = ''
  } catch (cause) {
    detailError.value = userFacingError(cause, 'reanudar la suscripción')
  } finally {
    saving.value = false
  }
}
async function cancel() {
  if (!selected.value || saving.value || !window.confirm('¿Cancelar el reingreso programado? El socio seguirá inactivo y la programación quedará registrada como cancelada.')) return
  saving.value = true
  detailError.value = ''
  success.value = ''
  try {
    await socioService.cancelReentry(selected.value.id)
    entries.value = await socioService.subscriptionHistory(selected.value.id)
    success.value = 'Programación cancelada.'
  } catch (cause) {
    detailError.value = userFacingError(cause, 'cancelar el reingreso programado')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <AdminShell title="Historial de gestión de socios" subtitle="Altas, bajas y reingresos de las suscripciones" active="socios-historial">
    <AppAlert v-if="error">{{ error }} <button type="button" @click="load">Reintentar</button></AppAlert>
    <p v-if="loading" role="status">Cargando socios...</p>
    <div v-else class="subscription-layout">
      <section class="subscription-panel" aria-label="Seleccionar socio">
        <label class="subscription-search"><Search :size="18" aria-hidden="true" /><input v-model="query" class="subscription-search__input" placeholder="Razón social, RUT / Cédula..." aria-label="Buscar socio para ver historial"></label>
        <div class="subscription-companies">
          <button v-for="socio in filtered" :key="socio.id" type="button" class="subscription-company" :class="{ 'subscription-company--selected': selected?.id === socio.id }" :aria-pressed="selected?.id === socio.id" :disabled="saving" @click="select(socio)">
            <span><strong class="subscription-company__strong">{{ socio.razonSocial }}</strong><small class="subscription-company__note">{{ socio.rut || socio.cedula || 'Sin RUT / Cédula' }}</small></span>
            <span class="subscription-badge" :class="{ 'subscription-badge--inactive': !socio.activo }">{{ socio.activo ? 'Activo' : 'Inactivo' }}</span>
          </button>
          <p v-if="!filtered.length && !listado.loading.value" class="subscription-empty">No hay socios que coincidan con la búsqueda.</p>
        </div>
        <PaginationBar
          :page="listado.page.value"
          :total-pages="listado.data.value.totalPages"
          :total-elements="listado.data.value.totalElements"
          :loading="listado.loading.value"
          label="Paginación de socios"
          @change="listado.goTo"
        />
      </section>
      <section class="subscription-panel subscription-detail" aria-live="polite">
        <template v-if="selected">
          <header><h2 class="subscription-detail__heading">{{ selected.razonSocial }}</h2><p class="subscription-detail__text">El alta original y cada cambio de suscripción se conservan en este historial.</p></header>
          <p v-if="detailLoading" class="subscription-detail__text" role="status">Cargando historial...</p>
          <AppAlert v-if="detailError" text-class="subscription-detail__text">{{ detailError }} <button v-if="!saving" type="button" @click="select(selected)">Actualizar historial</button></AppAlert>
          <AppAlert v-if="success" text-class="subscription-detail__text" tone="success">{{ success }}</AppAlert>
          <template v-if="!detailLoading && !detailError">
            <div v-if="pending" class="subscription-resume">
              <h3 class="subscription-resume__subheading"><CalendarDays :size="18" /> Reingreso programado</h3>
              <p class="subscription-detail__text">Fecha: <strong>{{ formatDate(pending.fecha) }}</strong>. La suscripción se reactivará automáticamente ese día (hora de Uruguay).</p>
              <AppButton variant="secondary" :disabled="saving" @click="cancel">Cancelar programación</AppButton>
            </div>
            <form v-else-if="!selected.activo" class="subscription-resume" @submit.prevent="resume">
              <h3 class="subscription-resume__subheading"><CalendarDays :size="18" /> Reanudar suscripción</h3>
              <label class="subscription-resume__label">Fecha de reingreso<input v-model="fecha" class="subscription-resume__input" type="date" required :min="minimum" :disabled="saving"></label>
              <p class="subscription-detail__text">Una fecha futura programa el reingreso. Se conservan las deudas y pagos; no se generan cuotas retroactivas automáticamente.</p>
              <AppAlert v-if="invalidDate" text-class="subscription-detail__text">La fecha no puede ser anterior a la última alta o baja.</AppAlert>
              <AppButton type="submit" :loading="saving" :disabled="!fecha || invalidDate">Confirmar reingreso</AppButton>
            </form>
            <ol class="subscription-timeline">
              <li v-for="entry in entries" :key="entry.id" class="subscription-timeline__item">
                <span class="subscription-dot" :class="`subscription-dot--${entry.tipo}`"></span>
                <div><h3 class="subscription-timeline__subheading">{{ labels[entry.tipo] }}</h3><time class="subscription-timeline__time" :datetime="entry.fecha">{{ formatDate(entry.fecha) }}</time><small v-if="entry.tipo === 'REINGRESO_PROGRAMADO'" class="subscription-timeline__note">{{ states[entry.estado] }}</small><small v-if="entry.origen === 'MIGRACION'" class="subscription-timeline__note">Fecha recuperada de los datos existentes</small></div>
              </li>
            </ol>
            <p v-if="!entries.length" class="subscription-empty subscription-detail__text">No hay movimientos registrados.</p>
          </template>
        </template>
        <div v-else class="subscription-empty"><History :size="32" /><h2 class="subscription-detail__heading">Historial de suscripción</h2><p class="subscription-detail__text">Seleccioná un socio para consultar sus fechas de alta, baja y reingreso.</p></div>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.subscription-layout { display: grid; grid-template-columns: minmax(240px, 340px) minmax(0, 1fr); gap: 24px; align-items: start; }
.subscription-panel { min-width: 0; background: var(--t-bg-ffffff); border: 1px solid var(--t-line-dce8df); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 18px #163c2908; }
.subscription-search { display: flex; align-items: center; gap: 10px; padding: 18px; color: var(--t-fg-64736a); border-bottom: 1px solid var(--t-line-e6eee8); }
.subscription-search__input { width: 100%; min-width: 0; border: 0; background: transparent; font: inherit; }
.subscription-companies { max-height: 620px; overflow-y: auto; }
.subscription-company { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 18px; border: 0; border-bottom: 1px solid var(--t-line-edf2ee); background: var(--t-bg-ffffff); text-align: left; color: var(--t-fg-24352b); cursor: pointer; }
.subscription-company--selected, .subscription-company:hover { background: var(--t-bg-eaf5ee); }
.subscription-company__strong { display: block; overflow-wrap: anywhere; }
.subscription-company__note { display: block; margin-top: 6px; color: var(--t-fg-64736a); }
.subscription-badge { padding: 5px 9px; border-radius: 20px; font-size: .75rem; background: var(--t-bg-e4f3e9); color: var(--t-fg-087c42); }
.subscription-badge--inactive { background: var(--t-bg-f7eee3); color: var(--t-fg-886322); }
.subscription-detail { padding: 24px; display: grid; gap: 20px; }
.subscription-detail__heading { margin: 0 0 8px; font-size: 1.2rem; color: var(--t-fg-24352b); overflow-wrap: anywhere; }
.subscription-detail__text { margin: 0; font-size: .875rem; line-height: 1.6; color: var(--t-fg-64736a); }
.subscription-resume { display: grid; gap: 14px; padding: 20px; border: 1px solid var(--t-line-dce8df); border-radius: 12px; background: var(--t-bg-f8fbf9); }
.subscription-resume__subheading { display: flex; gap: 8px; align-items: center; margin: 0; color: var(--t-fg-087c42); font-size: 1rem; }
.subscription-resume__label { display: grid; gap: 8px; color: var(--t-fg-344b3d); font-size: .875rem; }
.subscription-resume__input { padding: 10px 12px; min-width: 0; border: 1px solid var(--t-line-cfd9d3); border-radius: 8px; background: var(--t-bg-ffffff); color: var(--t-fg-24352b); font: inherit; }
.subscription-timeline { list-style: none; padding: 0; margin: 0; }
.subscription-timeline__item { position: relative; display: flex; gap: 16px; padding: 0 0 24px; }
.subscription-timeline__item:not(:last-child)::before { content: ''; position: absolute; top: 14px; bottom: 0; left: 5px; width: 2px; background: var(--t-bg-e0eae3); }
.subscription-dot { z-index: 1; width: 12px; height: 12px; margin-top: 4px; flex-shrink: 0; border-radius: 50%; background: var(--t-bg-078844); }
.subscription-dot--BAJA { background: var(--t-bg-b86145); }
.subscription-dot--REINGRESO_PROGRAMADO { background: var(--t-bg-ad842b); }
.subscription-timeline__subheading { margin: 0 0 6px; color: var(--t-fg-24352b); font-size: .95rem; }
.subscription-timeline__time { color: var(--t-fg-344b3d); font-size: .875rem; }
.subscription-timeline__note { display: block; margin-top: 6px; color: var(--t-fg-718177); }
.subscription-empty { padding: 24px; text-align: center; color: var(--t-fg-718177); }
.subscription-layout :is(button,input):focus-visible { outline: 2px solid var(--t-line-078844); outline-offset: -2px; }
@media (max-width: 850px) { .subscription-layout { grid-template-columns: 1fr; } .subscription-companies { max-height: 260px; } .subscription-detail { padding: 20px; } }
</style>

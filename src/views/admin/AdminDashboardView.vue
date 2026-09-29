<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, Download, LockKeyhole, Search, UsersRound, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { cajaService } from '../../services/cajaService'
import { estadoMorosidadLabel, estadoMorosidadTone } from '../../services/socioService'
import type { CajaResumen, CuentaCaja, EstadoMorosidad, HistorialCaja, MetodoPago } from '../../services/types'

type CajaFilter = 'TODOS' | 'DEUDA' | EstadoMorosidad

const resumen = ref<CajaResumen | null>(null)
const query = ref('')
const filter = ref<CajaFilter>('TODOS')
const error = ref('')
const busy = ref(false)
const selectedCompany = ref<CuentaCaja | null>(null)
const selectedHistory = ref<HistorialCaja | null>(null)
const historyBusy = ref(false)
const historyError = ref('')
const paymentMethod = ref<MetodoPago>('EFECTIVO')
const timbreAmount = ref('')
const timbreRecurrent = ref(false)
const chargeBusy = ref(false)
const chargeError = ref('')

const filters: Array<{ key: CajaFilter; label: string }> = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'AL_DIA', label: 'Al dia' },
  { key: 'DEUDA', label: 'En deuda' },
  { key: 'INACTIVO', label: 'Inactivo' },
]

const metrics = computed(() => [
  { label: 'Total Socios', value: resumen.value?.totalSocios ?? 0, icon: UsersRound, tone: 'blue' },
  { label: 'Al Dia', value: resumen.value?.alDia ?? 0, icon: CheckCircle2, tone: 'green' },
  { label: 'Pendiente', value: resumen.value?.pendiente ?? 0, icon: Clock3, tone: 'orange' },
  { label: 'Inactivos', value: resumen.value?.inactivos ?? 0, icon: AlertCircle, tone: 'red' },
])

const companies = computed(() => {
  const term = query.value.trim().toLowerCase()
  return (resumen.value?.cuentas ?? []).filter((company) => {
    const matchesFilter = filter.value === 'TODOS'
      || (filter.value === 'DEUDA' && (company.estadoMorosidad === 'DEUDA_2_MESES' || company.estadoMorosidad === 'MOROSO'))
      || company.estadoMorosidad === filter.value
    const matchesQuery = !term || [company.razonSocial, company.bps, company.nombreRubro, company.telefono]
      .some((value) => (value ?? '').toLowerCase().includes(term))
    return matchesFilter && matchesQuery
  })
})

const canCharge = computed(() => selectedCompany.value?.cuotaId != null
  && selectedCompany.value.estadoCuota === 'PENDIENTE'
  && selectedCompany.value.estadoMorosidad !== 'INACTIVO')

const timbreValue = computed(() => {
  const value = Number(timbreAmount.value)
  return Number.isFinite(value) && value > 0 ? value : 0
})

const totalToCharge = computed(() => (selectedCompany.value?.montoCuota ?? 0) + timbreValue.value)

onMounted(loadResumen)

async function loadResumen() {
  busy.value = true
  error.value = ''
  try {
    resumen.value = await cajaService.getResumen()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar el control de caja.'
  } finally {
    busy.value = false
  }
}

function openCharge(company: CuentaCaja) {
  selectedCompany.value = company
  paymentMethod.value = 'EFECTIVO'
  timbreAmount.value = company.montoTimbre ? String(company.montoTimbre) : ''
  timbreRecurrent.value = company.timbreRecurrente
  chargeError.value = ''
}

async function openHistory(company: CuentaCaja) {
  selectedHistory.value = null
  historyError.value = ''
  historyBusy.value = true
  try {
    selectedHistory.value = await cajaService.getHistorial(company.socioId)
  } catch (exception) {
    historyError.value = exception instanceof Error ? exception.message : 'No fue posible cargar el historial.'
  } finally {
    historyBusy.value = false
  }
}

function closeHistory() {
  selectedHistory.value = null
  historyError.value = ''
}

async function confirmCharge() {
  if (!selectedCompany.value?.cuotaId) return
  if (Number(timbreAmount.value) < 0) {
    chargeError.value = 'El importe de timbre no puede ser negativo.'
    return
  }
  chargeBusy.value = true
  chargeError.value = ''
  try {
    await cajaService.registrarCobro({
      cuotaId: selectedCompany.value.cuotaId,
      metodoPago: paymentMethod.value,
      montoTimbre: timbreValue.value,
      timbreRecurrente: timbreValue.value > 0 && timbreRecurrent.value,
    })
    selectedCompany.value = null
    await loadResumen()
  } catch (exception) {
    chargeError.value = exception instanceof Error ? exception.message : 'No fue posible registrar el cobro.'
  } finally {
    chargeBusy.value = false
  }
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return 'Sin cuota emitida'
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function canChargeCompany(company: CuentaCaja) {
  return company.estadoMorosidad !== 'INACTIVO'
}

function cuotaLabel(company: CuentaCaja) {
  if (!company.cuotaId) return 'Sin cuota emitida'
  if (company.estadoCuota === 'PAGADO') return 'Pagada'
  if (company.estadoCuota === 'ANULADA') return 'Anulada'
  return 'Pendiente'
}

function paymentLabel(method: MetodoPago | null) {
  if (method === 'TRANSFERENCIA') return 'Transferencia'
  if (method === 'COBRADOR') return 'Cobrador'
  return 'Efectivo'
}
</script>

<template>
  <AdminShell active="dashboard" title="Control de Caja y Cobranza" subtitle="Gestion de cuotas y cobros">
    <section class="cash-metrics" aria-label="Resumen de cobranza">
      <article v-for="metric in metrics" :key="metric.label" class="cash-metric">
        <span class="cash-metric__icon" :class="`cash-metric__icon--${metric.tone}`"><component :is="metric.icon" :size="20" /></span>
        <div><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></div>
      </article>
    </section>

    <section class="cash-toolbar">
      <label class="cash-search"><Search :size="17" /><input v-model="query" placeholder="Buscar socio, BPS o rubro..."></label>
      <div class="cash-filters">
        <button v-for="option in filters" :key="option.key" class="cash-filter" :class="{ 'cash-filter--active': filter === option.key }" type="button" @click="filter = option.key">{{ option.label }}</button>
      </div>
      <button class="cash-download" type="button"><Download :size="16" /> Descargar Excel</button>
    </section>

    <AppAlert v-if="error">{{ error }}</AppAlert>
    <p v-else-if="busy" class="company-empty">Cargando control de caja...</p>
    <p v-else-if="!companies.length" class="company-empty">No hay socios para mostrar.</p>
    <section v-else class="cash-table-card">
      <div class="cash-table-wrap"><table class="cash-table"><thead><tr><th>N°</th><th>Razon social</th><th>BPS</th><th>Rubro</th><th>Telefono</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="company in companies" :key="company.socioId"><td class="cash-table__number">#S{{ String(company.socioId).padStart(3, '0') }}</td><td class="cash-table__company">{{ company.razonSocial }}</td><td>{{ company.bps || '-' }}</td><td>{{ company.nombreRubro || '-' }}</td><td>{{ company.telefono || '-' }}</td><td><span class="cash-status" :class="`cash-status--${estadoMorosidadTone(company.estadoMorosidad)}`"><i />{{ estadoMorosidadLabel[company.estadoMorosidad] }}</span></td><td class="cash-table__actions"><button v-if="canChargeCompany(company)" class="cash-charge" type="button" @click="openCharge(company)">+ Cobro</button><button class="cash-history" type="button" @click="openHistory(company)">Historial</button></td></tr></tbody></table></div>
    </section>

    <div v-if="selectedCompany" class="cash-modal-layer" @click.self="selectedCompany = null">
      <section class="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-modal-title">
        <header class="cash-modal__header"><div><h2 id="cash-modal-title">Registrar Cobro</h2><p>{{ selectedCompany.razonSocial }}</p></div><button type="button" aria-label="Cerrar" @click="selectedCompany = null"><X :size="18" /></button></header>
        <div class="cash-modal__body">
          <fieldset class="cash-payment"><legend>Metodo de pago</legend><div><button v-for="method in [{ key: 'EFECTIVO', label: 'Efectivo' }, { key: 'TRANSFERENCIA', label: 'Transferencia' }, { key: 'COBRADOR', label: 'Cobrador' }]" :key="method.key" type="button" :class="{ 'cash-payment__option--active': paymentMethod === method.key }" @click="paymentMethod = method.key as MetodoPago">{{ method.label }}</button></div></fieldset>
          <label class="cash-amount">Monto de cuota<input :value="formatMoney(selectedCompany.montoCuota)" readonly></label>
          <fieldset class="cash-timbre"><legend>Timbre / gasto extra</legend><label>Importe<input v-model="timbreAmount" type="number" min="0" step="0.01" placeholder="0"></label><label class="cash-timbre__repeat"><input v-model="timbreRecurrent" type="checkbox" :disabled="timbreValue === 0"> Mantener para el próximo mes</label></fieldset>
          <label class="cash-amount">Total a cobrar<input :value="formatMoney(totalToCharge)" readonly></label>
          <dl class="cash-receipt-detail"><div><dt>Socio N°</dt><dd>#S{{ String(selectedCompany.socioId).padStart(3, '0') }}</dd></div><div><dt>BPS</dt><dd>{{ selectedCompany.bps || '-' }}</dd></div><div><dt>Concepto</dt><dd>Cuota {{ formatDate(selectedCompany.periodo) }}</dd></div><div><dt>Vencimiento</dt><dd>{{ formatDate(selectedCompany.fechaVencimiento) }}</dd></div></dl>
          <AppAlert v-if="chargeError">{{ chargeError }}</AppAlert>
        </div>
        <footer class="cash-modal__footer"><button class="cash-modal__confirm" type="button" :disabled="!canCharge || chargeBusy" @click="confirmCharge">{{ chargeBusy ? 'Registrando...' : 'Confirmar Cobro' }}</button></footer>
      </section>
    </div>

    <div v-if="historyBusy || selectedHistory || historyError" class="cash-modal-layer" @click.self="closeHistory">
      <section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <header class="history-modal__header"><div><p>BITACORA DE MOVIMIENTOS</p><h2 id="history-modal-title">{{ selectedHistory?.razonSocial || 'Historial' }}</h2><span>{{ selectedHistory?.bps || '-' }} - {{ selectedHistory?.nombreRubro || 'Sin rubro' }}</span></div><button type="button" aria-label="Cerrar" @click="closeHistory"><X :size="18" /></button></header>
        <AppAlert v-if="historyError">{{ historyError }}</AppAlert>
        <p v-else-if="historyBusy" class="company-empty">Cargando historial...</p>
        <template v-else-if="selectedHistory">
          <div class="history-summary"><div><span>Estado actual</span><strong>{{ estadoMorosidadLabel[selectedHistory.estadoMorosidad] }}</strong></div><div><span>Registros</span><b>{{ selectedHistory.movimientos.length }}</b></div><em><LockKeyhole :size="11" /> Registro inmutable</em></div>
          <div class="history-list"><article v-for="movement in selectedHistory.movimientos" :key="movement.cuotaId" class="history-entry"><i class="history-entry__dot" :class="movement.estadoCuota === 'PAGADO' ? 'history-entry__dot--green' : 'history-entry__dot--red'" /><div><span class="history-entry__tag" :class="movement.estadoCuota === 'PAGADO' ? 'history-entry__tag--green' : 'history-entry__tag--red'">{{ movement.estadoCuota === 'PAGADO' ? 'PAGO' : 'CARGO' }}</span><strong>{{ movement.estadoCuota === 'PAGADO' ? 'Cobro de cuota' : 'Cuota pendiente' }}</strong><p>{{ movement.metodoPago ? paymentLabel(movement.metodoPago) : `Vence ${formatDate(movement.fechaVencimiento)}` }}<template v-if="movement.montoTimbre > 0"> · Timbre {{ formatMoney(movement.montoTimbre) }}<template v-if="movement.timbreRecurrente"> (continúa)</template></template></p><time>{{ formatDate(movement.fechaCobro || movement.periodo) }}</time></div><aside><b>{{ movement.estadoCuota === 'PAGADO' ? '+' : '-' }}{{ formatMoney(movement.estadoCuota === 'PAGADO' ? movement.montoCobrado : movement.montoCuota) }}</b></aside></article><p v-if="!selectedHistory.movimientos.length" class="company-empty">No hay movimientos registrados.</p></div>
        </template>
        <footer class="history-modal__footer"><span>La bitacora refleja las cuotas y cobros registrados.</span><button type="button" @click="closeHistory">Cerrar</button></footer>
      </section>
    </div>
  </AdminShell>
</template>
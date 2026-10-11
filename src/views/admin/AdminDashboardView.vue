<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, Download, LockKeyhole, Plus, Save, Search, UsersRound, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { cajaService } from '../../services/cajaService'
import { estadoMorosidadLabel, estadoMorosidadTone } from '../../services/socioService'
import type { CajaResumen, CuentaCaja, EstadoMorosidad, HistorialCaja, MetodoPago, ReintegroProgramado } from '../../services/types'

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
const receivedAmount = ref('')
const chargeHistory = ref<HistorialCaja | null>(null)
const chargeLoading = ref(false)
const expenseCompany = ref<CuentaCaja | null>(null)
const expenseConcept = ref('')
const expenseAmount = ref('')
const expenseDate = ref(localDate())
const expenseRecurring = ref(false)
const expenseBusy = ref(false)
const expenseLoading = ref(false)
const expenseError = ref('')
const expenseSuccess = ref('')
const programmed = ref<ReintegroProgramado[]>([])
const externalReference = ref('')
const paymentNotes = ref('')
const chargeBusy = ref(false)
const chargeError = ref('')

const filters: Array<{ key: CajaFilter; label: string }> = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'AL_DIA', label: 'Al dia' },
  { key: 'DEUDA', label: 'Con deuda' },
  { key: 'INACTIVO', label: 'Inactivo' },
]

const paymentMethods: Array<{ key: MetodoPago; label: string }> = [
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'TRANSFERENCIA', label: 'Transferencia' },
  { key: 'COBRADOR', label: 'Cobrador' },
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
      || (filter.value === 'DEUDA' && company.saldo > 0)
      || company.estadoMorosidad === filter.value
    const matchesQuery = !term || [company.razonSocial, company.bps, company.nombreRubro, company.telefono]
      .some((value) => (value ?? '').toLowerCase().includes(term))
    return matchesFilter && matchesQuery
  })
})

const canCharge = computed(() => selectedCompany.value?.estadoMorosidad !== 'INACTIVO'
  && !!chargeHistory.value && !chargeLoading.value && validAmount(receivedAmount.value))
const balanceAfterPayment = computed(() => {
  const currentBalance = chargeHistory.value?.saldo ?? 0
  const paymentAmount = Number(receivedAmount.value || 0)
  return Math.round((currentBalance - paymentAmount) * 100) / 100
})

const historyMovements = computed(() => [...(selectedHistory.value?.movimientos ?? [])].reverse())

const chargeTotals = computed(() => {
  const entries = chargeHistory.value?.movimientos ?? []
  const total = (type: 'CUOTA' | 'REINTEGRO' | 'PAGO') => entries
    .filter((entry) => entry.tipo === type)
    .reduce((sum, entry) => sum + entry.monto, 0)
  return {
    cuotas: total('CUOTA'),
    reintegros: total('REINTEGRO'),
    pagos: total('PAGO'),
  }
})

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

async function openCharge(company: CuentaCaja) {
  selectedCompany.value = company
  paymentMethod.value = 'EFECTIVO'
  receivedAmount.value = ''
  chargeHistory.value = null
  externalReference.value = ''
  paymentNotes.value = ''
  chargeError.value = ''
  chargeLoading.value = true
  try {
    chargeHistory.value = await cajaService.getHistorial(company.socioId)
    receivedAmount.value = String(Math.max(chargeHistory.value.saldo, 0))
  } catch (exception) {
    chargeError.value = exception instanceof Error ? exception.message : 'No fue posible cargar la cuenta.'
  } finally {
    chargeLoading.value = false
  }
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
  if (!selectedCompany.value || chargeBusy.value || chargeLoading.value) return
  if (!validAmount(receivedAmount.value)) {
    chargeError.value = 'Ingrese un monto recibido mayor a cero, con hasta dos decimales.'
    return
  }
  chargeBusy.value = true
  chargeError.value = ''
  try {
    await cajaService.registrarCobro({
      socioId: selectedCompany.value.socioId,
      metodoPago: paymentMethod.value,
      montoRecibido: Number(receivedAmount.value),
      nroCobranzaExterno: externalReference.value.trim() || null,
      observaciones: paymentNotes.value.trim() || null,
    })
    selectedCompany.value = null
    await loadResumen()
  } catch (exception) {
    chargeError.value = exception instanceof Error ? exception.message : 'No fue posible registrar el cobro.'
  } finally {
    chargeBusy.value = false
  }
}

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function validAmount(value: string | number) {
  return /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0 && Number(value) < 10000000000
}

function balanceLabel(value: number) {
  if (value < 0) return `${formatMoney(Math.abs(value))} a favor`
  if (value === 0) return 'Sin deuda'
  return `${formatMoney(value)} de deuda`
}

async function openExpense(company: CuentaCaja) {
  expenseCompany.value = company
  expenseConcept.value = ''
  expenseAmount.value = ''
  expenseDate.value = localDate()
  expenseRecurring.value = false
  expenseError.value = ''
  expenseSuccess.value = ''
  programmed.value = []
  expenseLoading.value = true
  try {
    const history = await cajaService.getHistorial(company.socioId)
    programmed.value = history.reintegrosProgramados.map(entry => ({ ...entry }))
  } catch (exception) {
    expenseError.value = exception instanceof Error ? exception.message : 'No fue posible cargar los reintegros.'
  } finally {
    expenseLoading.value = false
  }
}

async function saveExpense() {
  if (!expenseCompany.value || expenseBusy.value) return
  expenseError.value = ''
  expenseSuccess.value = ''
  if (!expenseConcept.value.trim() || !validAmount(expenseAmount.value) || !expenseDate.value || expenseDate.value > localDate()) {
    expenseError.value = 'Ingrese concepto, monto positivo con hasta dos decimales y una fecha no futura.'
    return
  }
  expenseBusy.value = true
  try {
    const account = await cajaService.registrarReintegro(expenseCompany.value.socioId, {
      concepto: expenseConcept.value.trim(),
      monto: Number(expenseAmount.value),
      fecha: expenseDate.value,
      recurrente: expenseRecurring.value,
    })
    await loadResumen()
    await openExpense(account)
    expenseSuccess.value = 'Reintegro registrado en la cuenta.'
  } catch (exception) {
    expenseError.value = exception instanceof Error ? exception.message : 'No fue posible registrar el reintegro.'
  } finally {
    expenseBusy.value = false
  }
}

async function saveProgrammed(entry: ReintegroProgramado) {
  if (!expenseCompany.value || expenseBusy.value) return
  expenseError.value = ''
  expenseSuccess.value = ''
  if (!entry.concepto.trim() || !validAmount(entry.monto)) {
    expenseError.value = 'El reintegro recurrente necesita concepto y monto positivo con hasta dos decimales.'
    return
  }
  expenseBusy.value = true
  try {
    await cajaService.actualizarProgramado(expenseCompany.value.socioId, entry)
    expenseSuccess.value = 'Configuración guardada. Los cargos anteriores no se modificaron.'
  } catch (exception) {
    expenseError.value = exception instanceof Error ? exception.message : 'No fue posible guardar la configuración.'
  } finally {
    expenseBusy.value = false
  }
}

function closeCharge() {
  if (!chargeBusy.value && !chargeLoading.value) selectedCompany.value = null
}

function closeExpense() {
  if (!expenseBusy.value && !expenseLoading.value) expenseCompany.value = null
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return 'Sin cuota emitida'
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function canChargeCompany(company: CuentaCaja) {
  return company.estadoMorosidad !== 'INACTIVO'
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
      <div class="cash-table-wrap">
        <table class="cash-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Razón social</th>
              <th>BPS</th>
              <th>Rubro</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="company in companies" :key="company.socioId">
              <td class="cash-table__number">#S{{ String(company.socioId).padStart(3, '0') }}</td>
              <td class="cash-table__company">{{ company.razonSocial }}</td>
              <td>{{ company.bps || '-' }}</td>
              <td>{{ company.nombreRubro || '-' }}</td>
              <td :class="{ 'account-credit': company.saldo < 0 }">{{ balanceLabel(company.saldo) }}</td>
              <td>
                <span class="cash-status" :class="`cash-status--${estadoMorosidadTone(company.estadoMorosidad)}`">
                  <i />{{ estadoMorosidadLabel[company.estadoMorosidad] }}
                </span>
              </td>
              <td class="cash-table__actions">
                <button v-if="canChargeCompany(company)" class="cash-charge" type="button" @click="openCharge(company)">
                  <Plus :size="12" /> Cobro
                </button>
                <button v-if="canChargeCompany(company)" class="cash-history" type="button" @click="openExpense(company)">
                  <Plus :size="12" /> Reintegro
                </button>
                <button class="cash-history" type="button" @click="openHistory(company)">Historial</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="selectedCompany" class="cash-modal-layer" @click.self="closeCharge">
      <section class="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-modal-title">
        <header class="cash-modal__header"><div><h2 id="cash-modal-title">Registrar Cobro</h2><p>{{ selectedCompany.razonSocial }}</p></div><button type="button" aria-label="Cerrar" :disabled="chargeBusy || chargeLoading" @click="closeCharge"><X :size="18" /></button></header>
        <div class="cash-modal__body">
          <p v-if="chargeLoading" role="status">Cargando estado de cuenta...</p>
          <dl v-if="chargeHistory" class="account-summary">
            <div><dt>Cuotas emitidas</dt><dd>{{ formatMoney(chargeTotals.cuotas) }}</dd></div>
            <div><dt>Reintegros registrados</dt><dd>{{ formatMoney(chargeTotals.reintegros) }}</dd></div>
            <div><dt>Pagos anteriores</dt><dd>{{ formatMoney(chargeTotals.pagos) }}</dd></div>
            <div><dt>Saldo actual</dt><dd>{{ balanceLabel(chargeHistory.saldo) }}</dd></div>
            <div><dt>Deuda vencida</dt><dd>{{ formatMoney(chargeHistory.deudaVencida) }}</dd></div>
          </dl>
          <fieldset class="cash-payment">
            <legend>Metodo de pago</legend>
            <div>
              <button
                v-for="method in paymentMethods"
                :key="method.key"
                type="button"
                :class="{ 'cash-payment__option--active': paymentMethod === method.key }"
                @click="paymentMethod = method.key"
              >
                {{ method.label }}
              </button>
            </div>
          </fieldset>
          <label class="cash-amount">Monto recibido<input v-model="receivedAmount" type="number" min="0.01" max="9999999999.99" step="0.01" :disabled="chargeLoading || chargeBusy"></label>
          <p v-if="validAmount(receivedAmount)" class="account-result" role="status">Saldo después del pago: <strong>{{ balanceLabel(balanceAfterPayment) }}</strong></p>
          <label class="cash-payment-detail">Referencia de cobranza<input v-model="externalReference" maxlength="80" placeholder="Opcional"></label>
          <label class="cash-payment-detail">Observaciones<textarea v-model="paymentNotes" maxlength="2000" placeholder="Opcional"></textarea></label>
          <dl class="cash-receipt-detail"><div><dt>Socio N°</dt><dd>#S{{ String(selectedCompany.socioId).padStart(3, '0') }}</dd></div><div><dt>BPS</dt><dd>{{ selectedCompany.bps || '-' }}</dd></div></dl>
          <AppAlert v-if="chargeError">{{ chargeError }}</AppAlert>
        </div>
        <footer class="cash-modal__footer"><button class="cash-history" type="button" :disabled="chargeBusy || chargeLoading" @click="closeCharge">Cancelar</button><button class="cash-modal__confirm" type="button" :disabled="!canCharge || chargeBusy" @click="confirmCharge">{{ chargeBusy ? 'Registrando...' : 'Confirmar Cobro' }}</button></footer>
      </section>
    </div>

    <div v-if="historyBusy || selectedHistory || historyError" class="cash-modal-layer" @click.self="closeHistory">
      <section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <header class="history-modal__header"><div><p>BITACORA DE MOVIMIENTOS</p><h2 id="history-modal-title">{{ selectedHistory?.razonSocial || 'Historial' }}</h2><span>{{ selectedHistory?.bps || '-' }} - {{ selectedHistory?.nombreRubro || 'Sin rubro' }}</span></div><button type="button" aria-label="Cerrar" @click="closeHistory"><X :size="18" /></button></header>
        <AppAlert v-if="historyError">{{ historyError }}</AppAlert>
        <p v-else-if="historyBusy" class="company-empty">Cargando historial...</p>
        <template v-else-if="selectedHistory">
          <div class="history-summary">
            <div><span>Saldo actual</span><strong>{{ balanceLabel(selectedHistory.saldo) }}</strong></div>
            <div><span>Deuda vencida</span><b>{{ formatMoney(selectedHistory.deudaVencida) }}</b></div>
            <em><LockKeyhole :size="11" /> Registro inmutable</em>
          </div>
          <div class="history-list">
            <article v-for="movement in historyMovements" :key="`${movement.tipo}:${movement.id}`" class="history-entry">
              <i
                class="history-entry__dot"
                :class="movement.tipo === 'PAGO' ? 'history-entry__dot--green' : 'history-entry__dot--red'"
              />
              <div>
                <span
                  class="history-entry__tag"
                  :class="movement.tipo === 'PAGO' ? 'history-entry__tag--green' : 'history-entry__tag--red'"
                >
                  {{ movement.tipo }}
                </span>
                <strong>{{ movement.concepto }}</strong>
                <p>{{ movement.metodoPago ? paymentLabel(movement.metodoPago) : `Vence ${formatDate(movement.fechaVencimiento)}` }}</p>
                <p v-if="movement.referencia">Referencia: {{ movement.referencia }}</p>
                <p v-if="movement.observaciones">{{ movement.observaciones }}</p>
                <time>{{ formatDate(movement.fecha) }}</time>
                <p>Saldo anterior: {{ balanceLabel(movement.saldoAnterior) }}</p>
                <p>Saldo resultante: {{ balanceLabel(movement.saldoResultante) }}</p>
                <p v-if="movement.tipo !== 'PAGO'">Pendiente: {{ formatMoney(movement.pendiente) }}</p>
              </div>
              <aside>
                <b :class="movement.tipo === 'PAGO' ? 'account-credit' : 'account-debt'">
                  {{ movement.tipo === 'PAGO' ? '-' : '+' }}{{ formatMoney(movement.monto) }}
                </b>
              </aside>
            </article>
            <p v-if="!historyMovements.length" class="company-empty">No hay movimientos registrados.</p>
          </div>
        </template>
        <footer class="history-modal__footer"><span>La bitacora refleja las cuotas y cobros registrados.</span><button type="button" @click="closeHistory">Cerrar</button></footer>
      </section>
    </div>

    <div v-if="expenseCompany" class="cash-modal-layer" @click.self="closeExpense">
      <section class="cash-modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title">
        <header class="cash-modal__header"><div><h2 id="expense-title">Reintegros de gastos</h2><p>{{ expenseCompany.razonSocial }}</p></div><button type="button" aria-label="Cerrar" :disabled="expenseBusy || expenseLoading" @click="closeExpense"><X :size="18" /></button></header>
        <div class="cash-modal__body">
          <form @submit.prevent="saveExpense">
            <label class="cash-payment-detail">Concepto<input v-model="expenseConcept" maxlength="200" required placeholder="Timbre, fotocopias, trámite..."></label>
            <label class="cash-payment-detail">Importe<input v-model="expenseAmount" type="number" min="0.01" max="9999999999.99" step="0.01" required></label>
            <label class="cash-payment-detail">Fecha del gasto<input v-model="expenseDate" type="date" :max="localDate()" required></label>
            <label class="expense-recurring"><input v-model="expenseRecurring" type="checkbox"> Recurrente mensual</label>
            <button class="cash-charge expense-add" type="submit" :disabled="expenseBusy || expenseLoading"><Plus :size="14" /> {{ expenseBusy ? 'Guardando...' : 'Registrar reintegro' }}</button>
          </form>
          <p v-if="expenseLoading" role="status">Cargando reintegros recurrentes...</p>
          <section v-if="programmed.length" class="expense-programmed">
            <h3>Reintegros recurrentes</h3>
            <form
              v-for="entry in programmed"
              :key="entry.id"
              class="expense-programmed__entry"
              @submit.prevent="saveProgrammed(entry)"
            >
              <label class="cash-payment-detail">
                Concepto
                <input v-model="entry.concepto" maxlength="200" required>
              </label>
              <label class="cash-payment-detail">
                Importe mensual
                <input v-model.number="entry.monto" type="number" min="0.01" max="9999999999.99" step="0.01" required>
              </label>
              <label class="expense-recurring"><input v-model="entry.activo" type="checkbox"> Activo</label>
              <button class="cash-history" type="submit" :disabled="expenseBusy">
                <Save :size="14" /> Guardar configuración
              </button>
            </form>
          </section>
          <AppAlert v-if="expenseError">{{ expenseError }}</AppAlert>
          <p v-if="expenseSuccess" class="expense-success" role="status">{{ expenseSuccess }}</p>
        </div>
        <footer class="cash-modal__footer"><button class="cash-history" type="button" :disabled="expenseBusy || expenseLoading" @click="closeExpense">Cerrar</button></footer>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.cash-modal, .history-modal { display: flex; flex-direction: column; max-height: calc(100dvh - 40px); border-radius: 8px; }
.cash-modal__body, .history-list { overflow-y: auto; min-height: 0; }
.cash-modal__header, .cash-modal__footer, .history-modal__header, .history-modal__footer { flex-shrink: 0; }
.cash-table__actions button, .expense-add, .expense-programmed button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
.cash-table__actions { min-width: 260px; }
.account-summary { display: grid; gap: 9px; margin: 0 0 20px; font-size: 12px; }
.account-summary div { display: flex; justify-content: space-between; gap: 12px; }
.account-summary dt { color: #68737c; }
.account-summary dd { margin: 0; font-weight: 700; text-align: right; }
.account-result { color: #34473b; background: #eef8f2; padding: 10px; font-size: 12px; line-height: 1.5; }
.account-credit { color: #08775f !important; }
.account-debt { color: #a52c32 !important; }
.history-summary { grid-template-columns: 1fr 1fr; }
.history-summary strong { font-size: 14px; }
.history-entry { padding-bottom: 16px; grid-template-columns: 14px minmax(0, 1fr) auto; }
.history-entry p, .history-entry strong { overflow-wrap: anywhere; }
.expense-modal { width: min(100%, 480px); }
.expense-recurring { display: flex; align-items: center; gap: 8px; margin: 16px 0; color: #526159; font-size: 12px; }
.expense-recurring input { accent-color: #07974e; }
.expense-add { min-height: 36px; }
.expense-programmed { margin-top: 24px; border-top: 1px solid #e0e6eb; }
.expense-programmed h3 { font-size: 14px; margin: 18px 0 0; }
.expense-programmed__entry { padding-bottom: 16px; border-bottom: 1px solid #e0e6eb; }
.expense-success { color: #08775f; font-size: 12px; }
button:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 450px) {
  .cash-modal-layer { padding: 10px; }
  .cash-modal, .history-modal { max-height: calc(100dvh - 20px); }
  .history-entry { grid-template-columns: 12px minmax(0, 1fr); }
  .history-entry aside { grid-column: 2; justify-items: start; padding-top: 0; }
}
</style>
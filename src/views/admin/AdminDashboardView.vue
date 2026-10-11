<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, Download, LockKeyhole, Pencil, Plus, Save, Search, Trash2, UsersRound, X } from 'lucide-vue-next'
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
const historyFrom = ref('')
const historyTo = ref('')
const paymentMethod = ref<MetodoPago>('EFECTIVO')
const receivedAmount = ref('')
const chargeHistory = ref<HistorialCaja | null>(null)
const chargeLoading = ref(false)
const expenseCompany = ref<CuentaCaja | null>(null)
const expenseTab = ref<'GASTOS' | 'RECURRENTES'>('GASTOS')
const expenseConcept = ref('')
const expenseAmount = ref('')
const expenseRecurring = ref(false)
const expenseBusy = ref(false)
const expenseLoading = ref(false)
const expenseError = ref('')
const expenseSuccess = ref('')
const programmed = ref<ReintegroProgramado[]>([])
const programmedEditing = ref<ReintegroProgramado | null>(null)
const programmedToDelete = ref<number | null>(null)
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

const historyRangeInvalid = computed(() => !!historyFrom.value && !!historyTo.value
  && historyFrom.value > historyTo.value)

const historyMovements = computed(() => {
  if (historyRangeInvalid.value) return []
  return (selectedHistory.value?.movimientos ?? [])
    .filter((movement) => {
      const date = movement.fecha.slice(0, 10)
      return (!historyFrom.value || date >= historyFrom.value)
        && (!historyTo.value || date <= historyTo.value)
    })
    .reverse()
})

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
  clearHistoryDates()
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

function clearHistoryDates() {
  historyFrom.value = ''
  historyTo.value = ''
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
  expenseTab.value = 'GASTOS'
  expenseConcept.value = ''
  expenseAmount.value = ''
  expenseRecurring.value = false
  expenseError.value = ''
  expenseSuccess.value = ''
  programmed.value = []
  programmedEditing.value = null
  programmedToDelete.value = null
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
  if (!expenseConcept.value.trim() || !validAmount(expenseAmount.value)) {
    expenseError.value = 'Ingrese concepto y monto positivo con hasta dos decimales.'
    return
  }
  expenseBusy.value = true
  try {
    const account = await cajaService.registrarReintegro(expenseCompany.value.socioId, {
      concepto: expenseConcept.value.trim(),
      monto: Number(expenseAmount.value),
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
    const saved = await cajaService.actualizarProgramado(expenseCompany.value.socioId, entry)
    programmed.value = programmed.value.map((item) => item.id === saved.id ? saved : item)
    programmedEditing.value = null
    expenseSuccess.value = 'Configuración guardada. Los cambios se aplicarán desde el próximo mes; el cargo de este mes y los anteriores se conservan.'
  } catch (exception) {
    expenseError.value = exception instanceof Error ? exception.message : 'No fue posible guardar la configuración.'
  } finally {
    expenseBusy.value = false
  }
}

function toggleProgrammed(entry: ReintegroProgramado, event: Event) {
  const checkbox = event.target as HTMLInputElement
  const active = checkbox.checked
  checkbox.checked = entry.activo
  void saveProgrammed({ ...entry, activo: active })
}

function editProgrammed(entry: ReintegroProgramado) {
  if (expenseBusy.value) return
  programmedEditing.value = { ...entry }
  programmedToDelete.value = null
  expenseError.value = ''
  expenseSuccess.value = ''
}

function requestProgrammedDeletion(entry: ReintegroProgramado) {
  if (expenseBusy.value) return
  programmedToDelete.value = entry.id
  programmedEditing.value = null
  expenseError.value = ''
  expenseSuccess.value = ''
}

async function deleteProgrammed(entry: ReintegroProgramado) {
  if (!expenseCompany.value || expenseBusy.value || programmedToDelete.value !== entry.id) return
  expenseError.value = ''
  expenseSuccess.value = ''
  expenseBusy.value = true
  try {
    await cajaService.eliminarProgramado(expenseCompany.value.socioId, entry.id)
    programmed.value = programmed.value.filter((item) => item.id !== entry.id)
    programmedToDelete.value = null
    expenseSuccess.value = 'Reintegro recurrente eliminado. No se generarán nuevos cargos; el cargo de este mes y los anteriores se conservan.'
  } catch (exception) {
    expenseError.value = exception instanceof Error ? exception.message : 'No fue posible eliminar el reintegro recurrente.'
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

function selectExpenseTab(tab: 'GASTOS' | 'RECURRENTES') {
  if (expenseBusy.value || expenseTab.value === tab) return
  expenseTab.value = tab
  programmedEditing.value = null
  programmedToDelete.value = null
  expenseError.value = ''
  expenseSuccess.value = ''
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
          <div class="history-date-filters">
            <label>
              Desde
              <input v-model="historyFrom" type="date" :max="historyTo || undefined" :aria-invalid="historyRangeInvalid" :aria-describedby="historyRangeInvalid ? 'history-date-error' : undefined">
            </label>
            <label>
              Hasta
              <input v-model="historyTo" type="date" :min="historyFrom || undefined" :aria-invalid="historyRangeInvalid" :aria-describedby="historyRangeInvalid ? 'history-date-error' : undefined">
            </label>
            <button type="button" title="Limpiar filtro de fechas" aria-label="Limpiar filtro de fechas" :disabled="!historyFrom && !historyTo" @click="clearHistoryDates">
              <X :size="16" />
            </button>
          </div>
          <p v-if="historyRangeInvalid" id="history-date-error" class="history-date-error" role="alert">La fecha desde no puede ser posterior a la fecha hasta.</p>
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
            <p v-if="!historyMovements.length && !historyRangeInvalid" class="company-empty">
              {{ selectedHistory.movimientos.length ? 'No hay movimientos en el rango seleccionado.' : 'No hay movimientos registrados.' }}
            </p>
          </div>
        </template>
        <footer class="history-modal__footer"><span>La bitacora refleja las cuotas y cobros registrados.</span><button type="button" @click="closeHistory">Cerrar</button></footer>
      </section>
    </div>

    <div v-if="expenseCompany" class="cash-modal-layer" @click.self="closeExpense">
      <section class="cash-modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title">
        <header class="cash-modal__header"><div><h2 id="expense-title">Reintegros</h2><p>{{ expenseCompany.razonSocial }}</p></div><button type="button" aria-label="Cerrar" :disabled="expenseBusy || expenseLoading" @click="closeExpense"><X :size="18" /></button></header>
        <div class="expense-tabs" role="tablist" aria-label="Tipo de reintegro">
          <button
            id="expense-tab-gastos"
            type="button"
            role="tab"
            aria-controls="expense-panel-gastos"
            :aria-selected="expenseTab === 'GASTOS'"
            :disabled="expenseBusy"
            @click="selectExpenseTab('GASTOS')"
          >
            Reintegro de gastos
          </button>
          <button
            id="expense-tab-recurrentes"
            type="button"
            role="tab"
            aria-controls="expense-panel-recurrentes"
            :aria-selected="expenseTab === 'RECURRENTES'"
            :disabled="expenseBusy"
            @click="selectExpenseTab('RECURRENTES')"
          >
            Reintegros recurrentes
          </button>
        </div>
        <div class="cash-modal__body">
          <form
            v-show="expenseTab === 'GASTOS'"
            id="expense-panel-gastos"
            role="tabpanel"
            aria-labelledby="expense-tab-gastos"
            @submit.prevent="saveExpense"
          >
            <label class="cash-payment-detail">Concepto<input v-model="expenseConcept" maxlength="200" required placeholder="Timbre, fotocopias, trámite..."></label>
            <label class="cash-payment-detail">Importe<input v-model="expenseAmount" type="number" min="0.01" max="9999999999.99" step="0.01" required></label>
            <label class="expense-recurring"><input v-model="expenseRecurring" type="checkbox"> Recurrente mensual</label>
          </form>
          <section
            v-show="expenseTab === 'RECURRENTES'"
            id="expense-panel-recurrentes"
            class="expense-programmed"
            role="tabpanel"
            aria-labelledby="expense-tab-recurrentes"
          >
            <h3 v-if="!expenseLoading">
              Reintegros registrados
              <span class="expense-programmed__count">{{ programmed.filter((entry) => entry.activo).length }} activos · {{ programmed.filter((entry) => !entry.activo).length }} inactivos</span>
            </h3>
            <p class="expense-programmed__notice" role="note">
              <AlertCircle :size="16" aria-hidden="true" />
              <span>Las modificaciones y la activación o desactivación se aplican desde el próximo mes. El reintegro de este mes y los gastos anteriores no cambian.</span>
            </p>
            <p v-if="expenseLoading" role="status">Cargando reintegros recurrentes...</p>
            <p v-else-if="!programmed.length && !expenseError" class="company-empty">No hay reintegros recurrentes registrados.</p>
            <article
              v-for="entry in programmed"
              :key="entry.id"
              class="expense-programmed__entry"
            >
              <div class="expense-programmed__header">
                <div class="expense-programmed__detail">
                  <strong>{{ entry.concepto }}</strong>
                  <span>{{ formatMoney(entry.monto) }}</span>
                  <label class="expense-programmed__toggle" :class="{ 'expense-programmed__status--active': entry.activo }">
                    <input
                      type="checkbox"
                      :checked="entry.activo"
                      :disabled="expenseBusy"
                      :aria-label="`${entry.activo ? 'Desactivar' : 'Activar'} ${entry.concepto}`"
                      @change="toggleProgrammed(entry, $event)"
                    >
                    {{ entry.activo ? 'Activo' : 'Inactivo' }}
                  </label>
                </div>
                <div class="expense-programmed__actions">
                  <button
                    class="expense-programmed__edit"
                    type="button"
                    :disabled="expenseBusy"
                    :aria-label="`Modificar ${entry.concepto}`"
                    title="Modificar reintegro recurrente"
                    @click="editProgrammed(entry)"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    class="expense-programmed__delete"
                    type="button"
                    :disabled="expenseBusy"
                    :aria-label="`Eliminar ${entry.concepto}`"
                    title="Eliminar reintegro recurrente"
                    @click="requestProgrammedDeletion(entry)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </div>
              <form
                v-if="programmedEditing && programmedEditing.id === entry.id"
                @submit.prevent="saveProgrammed(programmedEditing)"
              >
                <label class="cash-payment-detail">
                  Concepto
                  <input v-model="programmedEditing.concepto" maxlength="200" required :disabled="expenseBusy">
                </label>
                <label class="cash-payment-detail">
                  Importe mensual
                  <input v-model.number="programmedEditing.monto" type="number" min="0.01" max="9999999999.99" step="0.01" required :disabled="expenseBusy">
                </label>
                <label class="expense-recurring">
                  <input v-model="programmedEditing.activo" type="checkbox" :disabled="expenseBusy">
                  Activo
                </label>
                <div class="expense-programmed__actions">
                  <button class="cash-history" type="button" :disabled="expenseBusy" @click="programmedEditing = null">Cancelar</button>
                  <button class="cash-history" type="submit" :disabled="expenseBusy">
                    <Save :size="14" /> {{ expenseBusy ? 'Guardando...' : 'Guardar cambios' }}
                  </button>
                </div>
              </form>
              <div v-if="programmedToDelete === entry.id" class="expense-programmed__confirmation">
                <p>¿Estás seguro de que querés eliminar el reintegro recurrente «{{ entry.concepto }}»? No se generarán cargos desde el próximo mes. El reintegro de este mes y los gastos anteriores se conservarán. Esta acción no se puede deshacer.</p>
                <div class="expense-programmed__actions">
                  <button class="cash-history" type="button" :disabled="expenseBusy" @click="programmedToDelete = null">Cancelar</button>
                  <button class="expense-programmed__delete" type="button" :disabled="expenseBusy" @click="deleteProgrammed(entry)">
                    <Trash2 :size="14" /> Sí, eliminar
                  </button>
                </div>
              </div>
            </article>
          </section>
          <AppAlert v-if="expenseError">{{ expenseError }}</AppAlert>
          <p v-if="expenseSuccess" class="expense-success" role="status">{{ expenseSuccess }}</p>
        </div>
        <footer class="cash-modal__footer expense-modal__footer">
          <button class="cash-history" type="button" :disabled="expenseBusy || expenseLoading" @click="closeExpense">Cerrar</button>
          <button
            v-if="expenseTab === 'GASTOS'"
            class="cash-history"
            type="submit"
            form="expense-panel-gastos"
            :disabled="expenseBusy || expenseLoading"
          >
            {{ expenseBusy ? 'Guardando...' : 'Registrar reintegro' }}
          </button>
        </footer>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.cash-modal, .history-modal { display: flex; flex-direction: column; max-height: calc(100dvh - 40px); border-radius: 8px; }
.cash-modal__body, .history-list { overflow-y: auto; min-height: 0; }
.cash-modal__header, .cash-modal__footer, .history-modal__header, .history-modal__footer { flex-shrink: 0; }
.cash-table__actions button, .expense-programmed button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
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
.history-date-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) 36px; align-items: end; gap: 14px; width: calc(100% - 48px); max-width: 480px; margin: 8px auto 24px; flex-shrink: 0; }
.history-date-filters label { display: grid; gap: 6px; min-width: 0; color: #526159; font-size: 12px; }
.history-date-filters input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 36px; padding: 6px 8px; border: 1px solid #e0e6eb; border-radius: 6px; background: #fff; color: #34473b; font: inherit; }
.history-date-filters button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid #e0e6eb; border-radius: 6px; background: #fff; color: #526159; cursor: pointer; }
.history-date-filters input:focus-visible, .history-date-filters button:focus-visible { outline: 2px solid #07974e; outline-offset: 2px; }
.history-date-error { width: calc(100% - 48px); max-width: 480px; margin: 0 auto 16px; color: #a52c32; font-size: 12px; }
.history-entry { padding-bottom: 16px; grid-template-columns: 14px minmax(0, 1fr) auto; }
.history-entry p, .history-entry strong { overflow-wrap: anywhere; }
.expense-modal { width: min(100%, 480px); }
.expense-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); flex-shrink: 0; border-bottom: 1px solid #e0e6eb; }
.expense-tabs button { min-height: 48px; padding: 12px 8px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #526159; font: inherit; font-size: 12px; font-weight: 600; line-height: 1.4; cursor: pointer; overflow-wrap: anywhere; }
.expense-tabs button[aria-selected="true"] { border-bottom-color: #07974e; color: #08775f; background: #eef8f2; }
.expense-tabs button:focus-visible { outline: 2px solid #07974e; outline-offset: -4px; }
.expense-recurring { display: flex; align-items: center; gap: 8px; margin: 16px 0; color: #526159; font-size: 12px; }
.expense-recurring input { accent-color: #07974e; }
.expense-modal__footer { display: flex; gap: 12px; }
.expense-modal__footer button { flex: 1; min-width: 0; width: auto; min-height: 36px; white-space: normal; }
.expense-programmed { margin-top: 0; }
.expense-programmed h3 { margin: 16px 0; font-size: 14px; line-height: 1.5; }
.expense-programmed__count { display: block; color: #68737c; font-size: 12px; font-weight: 400; }
.expense-programmed__notice { display: flex; align-items: flex-start; gap: 8px; margin: 16px 0; padding: 12px 0; border-top: 1px solid #e0e6eb; border-bottom: 1px solid #e0e6eb; color: #526159; font-size: 12px; line-height: 1.5; }
.expense-programmed__notice svg { flex-shrink: 0; margin-top: 2px; }
.expense-programmed__entry { padding: 16px 0; border-bottom: 1px solid #e0e6eb; }
.expense-programmed__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.expense-programmed__detail { display: grid; gap: 4px; min-width: 0; font-size: 12px; overflow-wrap: anywhere; }
.expense-programmed__detail strong { font-size: 13px; }
.expense-programmed__header .expense-programmed__actions { flex-shrink: 0; }
.expense-programmed__toggle { display: inline-flex; align-items: center; gap: 8px; color: #68737c; font-size: 12px; font-weight: 600; cursor: pointer; }
.expense-programmed__toggle input { margin: 0; accent-color: #07974e; }
.expense-programmed__status--active { color: #08775f; }
.expense-programmed__edit, .expense-programmed__delete { min-width: 36px; min-height: 36px; padding: 6px 10px; border: 1px solid #e0e6eb; border-radius: 6px; background: #fff; font: inherit; font-size: 12px; cursor: pointer; }
.expense-programmed__edit { color: #08775f; }
.expense-programmed__edit:focus-visible { outline: 2px solid #08775f; outline-offset: 2px; }
.expense-programmed__delete { color: #a52c32; }
.expense-programmed__delete:focus-visible { outline: 2px solid #a52c32; outline-offset: 2px; }
.expense-programmed__confirmation { margin-top: 16px; color: #a52c32; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.expense-programmed__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.expense-success { color: #08775f; font-size: 12px; }
button:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 450px) {
  .cash-modal-layer { padding: 10px; }
  .cash-modal, .history-modal { max-height: calc(100dvh - 20px); }
  .history-date-filters, .history-date-error { width: calc(100% - 32px); }
  .history-date-filters { gap: 10px; }
  .history-entry { grid-template-columns: 12px minmax(0, 1fr); }
  .history-entry aside { grid-column: 2; justify-items: start; padding-top: 0; }
}
</style>
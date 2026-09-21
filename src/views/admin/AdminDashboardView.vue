<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, Download, LockKeyhole, Printer, Search, UsersRound, X } from 'lucide-vue-next'
import { ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'

const metrics = [
  { label: 'Total Empresas', value: '10', icon: UsersRound, tone: 'blue' },
  { label: 'Al Día', value: '6', icon: CheckCircle2, tone: 'green' },
  { label: 'Pendiente', value: '2', icon: Clock3, tone: 'orange' },
  { label: 'Inactivos', value: '2', icon: AlertCircle, tone: 'red' },
]

const companies = [
  ['#S001', 'Distribuidora Fernández Hnos.', '21234567', 'Distribución', '099 123 456', 'Al Día', 'green'],
  ['#S002', 'Supermercado Don Carlos', '31234567', 'Comercio', '098 765 432', 'Al Día', 'green'],
  ['#S003', 'Mueblería La Estrella', '41234567', 'Mueblería', '095 555 444', 'Pendiente', 'orange'],
  ['#S004', 'Taller Mecánico Rodríguez', '51234567', 'Automotriz', '092 111 222', 'Inactivo', 'red'],
  ['#S005', 'Ferretería El Martillo', '61234567', 'Ferretería', '091 999 888', 'Al Día', 'green'],
  ['#S006', 'Panadería San José S.A.', '71234567', 'Alimentación', '097 333 444', 'Inactivo', 'red'],
]

const selectedCompany = ref<string[] | null>(null)
const selectedHistory = ref<string[] | null>(null)
const paymentMethod = ref('Efectivo')

function openCharge(company: string[]) {
  selectedCompany.value = company
  paymentMethod.value = 'Efectivo'
}

function openHistory(company: string[]) {
  selectedHistory.value = company
}
</script>

<template>
  <AdminShell active="dashboard" title="Control de Caja y Cobranza" subtitle="Gestión de cuotas y cobros">
    <section class="cash-metrics" aria-label="Resumen de cobranza">
      <article v-for="metric in metrics" :key="metric.label" class="cash-metric">
        <span class="cash-metric__icon" :class="`cash-metric__icon--${metric.tone}`"><component :is="metric.icon" :size="20" /></span>
        <div><strong>{{ metric.value }}</strong><span>{{ metric.label }}</span></div>
      </article>
    </section>

    <section class="cash-toolbar">
      <label class="cash-search"><Search :size="17" /><input placeholder="Buscar empresa o N°..."></label>
      <div class="cash-filters"><button class="cash-filter cash-filter--active" type="button">Todos</button><button class="cash-filter" type="button">Al Día</button><button class="cash-filter" type="button">Pendiente</button><button class="cash-filter" type="button">Inactivo</button></div>
      <button class="cash-download" type="button"><Download :size="16" /> Descargar Excel (10)</button>
    </section>

    <section class="cash-table-card">
      <div class="cash-table-wrap"><table class="cash-table"><thead><tr><th>N°</th><th>Razón social</th><th>BPS</th><th>Rubro</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="company in companies" :key="company[0]"><td class="cash-table__number">{{ company[0] }}</td><td class="cash-table__company">{{ company[1] }}</td><td>{{ company[2] }}</td><td>{{ company[3] }}</td><td>{{ company[4] }}</td><td><span class="cash-status" :class="`cash-status--${company[6]}`"><i />{{ company[5] }}</span></td><td class="cash-table__actions"><button v-if="company[5] !== 'Inactivo'" class="cash-charge" type="button" @click="openCharge(company)">+ Cobro</button><button class="cash-history" type="button" @click="openHistory(company)">▣ Historial</button></td></tr></tbody></table></div>
    </section>

    <div v-if="selectedCompany" class="cash-modal-layer" @click.self="selectedCompany = null">
      <section class="cash-modal" role="dialog" aria-modal="true" aria-labelledby="cash-modal-title">
        <header class="cash-modal__header"><div><h2 id="cash-modal-title">Registrar Cobro</h2><p>{{ selectedCompany[1] }}</p></div><button type="button" aria-label="Cerrar" @click="selectedCompany = null"><X :size="18" /></button></header>
        <div class="cash-modal__body">
          <fieldset class="cash-payment"><legend>Método de pago</legend><div><button v-for="method in ['💵 Efectivo', '🏦 Transf.', '▤ Cobrador']" :key="method" type="button" :class="{ 'cash-payment__option--active': paymentMethod === method.split(' ')[1] }" @click="paymentMethod = method.split(' ')[1]">{{ method }}</button></div></fieldset>
          <label class="cash-amount">Monto a cobrar<input value="$ 3.500" readonly></label>
          <dl class="cash-receipt-detail"><div><dt>Empresa N°</dt><dd>{{ selectedCompany[0].toLowerCase() }}</dd></div><div><dt>BPS</dt><dd>{{ selectedCompany[2] }}</dd></div><div><dt>Concepto</dt><dd>Cuota mensual</dd></div><div><dt>Fecha</dt><dd>25/02/2026</dd></div></dl>
        </div>
        <footer class="cash-modal__footer"><button class="cash-modal__print" type="button"><Printer :size="14" /> Imprimir Recibo</button><button class="cash-modal__confirm" type="button" @click="selectedCompany = null">Confirmar Cobro</button></footer>
      </section>
    </div>

    <div v-if="selectedHistory" class="cash-modal-layer" @click.self="selectedHistory = null">
      <section class="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <header class="history-modal__header"><div><p>BITÁCORA DE MOVIMIENTOS</p><h2 id="history-modal-title">{{ selectedHistory[1] }}</h2><span>{{ selectedHistory[0].toLowerCase() }} · {{ selectedHistory[3] }}</span></div><button type="button" aria-label="Cerrar" @click="selectedHistory = null"><X :size="18" /></button></header>
        <div class="history-summary"><div><span>Estado actual</span><strong>Al día ✓</strong></div><div><span>Cuota Mensual</span><b>$3.500</b></div><div><span>Registros</span><b>8</b></div><em><LockKeyhole :size="11" /> Registro inmutable</em></div>
        <div class="history-list"><article class="history-entry"><i class="history-entry__dot history-entry__dot--green" /><div><span class="history-entry__tag history-entry__tag--green">PAGO</span><strong>Cobro de cuota - Recibo #R-4890</strong><p>Efectivo · Operador: admin1</p><time>25 Feb, 2026</time></div><aside><b>+$3.500</b><span>Saldo: $0</span></aside></article><article class="history-entry"><i class="history-entry__dot history-entry__dot--red" /><div><span class="history-entry__tag history-entry__tag--red">CARGO</span><strong>Generación cuota mensual febrero</strong><p>Sistema automático</p><time>01 Feb, 2026</time></div><aside><b>-$3.500</b><span>Saldo: -$3.500</span></aside></article><article class="history-entry"><i class="history-entry__dot history-entry__dot--green" /><div><span class="history-entry__tag history-entry__tag--green">PAGO</span><strong>Cobro de cuota - Recibo #R-4310</strong><p>Transferencia · Operador: admin2</p><time>15 Ene, 2026</time></div><aside><b>+$3.500</b><span>Saldo: $0</span></aside></article><article class="history-entry"><i class="history-entry__dot history-entry__dot--green" /><div><span class="history-entry__tag history-entry__tag--blue">AJUSTE</span><strong>Ajuste de saldo a favor inicial</strong><p>Resolución de directiva</p><time>05 Ene, 2026</time></div><aside><b>+$1.200</b><span>Saldo: +$1.200</span></aside></article></div>
        <footer class="history-modal__footer"><span>La bitácora refleja todas las operaciones sin excepción.</span><button type="button" @click="selectedHistory = null">Cerrar</button></footer>
      </section>
    </div>
  </AdminShell>
</template>

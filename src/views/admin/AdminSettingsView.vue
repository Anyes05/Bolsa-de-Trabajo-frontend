<script setup lang="ts">
import { AlertTriangle, CheckCircle2, FilePlus2, Save } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import { tarifaService } from '../../services/tarifaService'
import type { Tarifa } from '../../services/types'

const today = new Date()
const billingPeriod = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const year = ref(today.getFullYear())
const amount = ref('')
const dueDay = ref('')
const history = ref<Tarifa[]>([])
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

function toIsoPeriod() {
  return `${billingPeriod.value}-01`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(value)
}

async function loadTariffs() {
  loading.value = true
  try {
    history.value = await tarifaService.list()
    const selectedTariff = history.value.find((tariff) => tariff.anio === year.value)
    amount.value = selectedTariff ? String(selectedTariff.montoBase) : ''
    dueDay.value = selectedTariff ? String(selectedTariff.diaVencimiento) : ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No fue posible cargar las tarifas.'
  } finally {
    loading.value = false
  }
}

async function saveAmount() {
  errorMessage.value = ''
  successMessage.value = ''
  const numericAmount = Number(amount.value)
  const numericDueDay = Number(dueDay.value)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isInteger(numericDueDay) || numericDueDay < 1 || numericDueDay > 31) {
    errorMessage.value = 'Ingrese un monto mayor a cero y un día de vencimiento entre 1 y 31.'
    return
  }

  saving.value = true
  try {
    await tarifaService.save({ anio: year.value, montoBase: numericAmount, diaVencimiento: numericDueDay })
    successMessage.value = 'Tarifa anual guardada. Se aplicará a cada cuota mensual de este año.'
    await loadTariffs()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No fue posible guardar la tarifa.'
  } finally {
    saving.value = false
  }
}

async function generateBilling() {
  errorMessage.value = ''
  successMessage.value = ''
  generating.value = true
  try {
    const result = await tarifaService.generateBilling(toIsoPeriod())
    successMessage.value = `Facturación emitida: ${result.cuotasGeneradas} cuotas nuevas y ${result.cuotasExistentes} ya existentes.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No fue posible generar la facturación.'
  } finally {
    generating.value = false
  }
}

onMounted(loadTariffs)
</script>

<template>
  <AdminShell active="configuracion" title="Configuración de Cuota" subtitle="Monto mensual para socios del CCISJ">
    <div class="fee-settings">
      <section class="fee-panel fee-current">
        <div class="fee-current__intro"><h2>Tarifa anual</h2><p>Define el valor mensual de la cuota social para todo el año. Este monto se aplicará automáticamente a los socios activos al emitir cada mes.</p></div>
        <div class="fee-config-fields"><label>Año<input v-model.number="year" type="number" min="2000" max="9999" @change="loadTariffs"></label><label>Día de vencimiento mensual<input v-model="dueDay" type="number" min="1" max="31" step="1"></label></div>
        <div class="fee-current__control"><label class="fee-input"><span>$</span><input v-model="amount" type="number" min="0.01" step="0.01" aria-label="Monto de cuota vigente"></label><button class="fee-save" type="button" :disabled="saving || loading" @click="saveAmount"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar monto' }}</button></div>
        <p v-if="successMessage" class="fee-success"><CheckCircle2 :size="15" /> {{ successMessage }}</p>
        <p v-if="errorMessage" class="fee-warning"><AlertTriangle :size="15" /> {{ errorMessage }}</p>
        <p class="fee-warning"><AlertTriangle :size="15" /> La tarifa no puede modificarse cuando ya generó cuotas. Las cuotas ya emitidas no se alteran.</p>
      </section>

      <section class="fee-panel fee-current">
        <div class="fee-current__intro"><h2>Generar facturación</h2><p>Emite las cuotas del mes seleccionado usando la tarifa anual correspondiente.</p></div>
        <label class="billing-period">Mes a facturar<input v-model="billingPeriod" type="month" @change="year = Number(billingPeriod.slice(0, 4)); loadTariffs()"></label>
        <button class="fee-save" type="button" :disabled="generating || loading" @click="generateBilling"><FilePlus2 :size="16" /> {{ generating ? 'Generando...' : 'Generar cuotas' }}</button>
      </section>

      <section class="fee-panel fee-history"><h2>Historial de tarifas</h2><div v-for="entry in history" :key="entry.id" class="fee-history__entry"><span>$</span><div><strong>{{ formatMoney(entry.montoBase) }} / mes</strong><small>Año {{ entry.anio }} · Vence el día {{ entry.diaVencimiento }} de cada mes</small></div><b v-if="entry.anio === year">Seleccionada</b></div></section>
    </div>
  </AdminShell>
</template>

<style scoped>
.fee-config-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fee-config-fields label { display: grid; gap: 6px; color: #303943; font-size: 11px; font-weight: 800; }
.fee-config-fields input { width: 100%; height: 36px; border: 1px solid #dfe5eb; border-radius: 7px; padding: 0 10px; color: #303943; font: inherit; outline: 0; }
.fee-config-fields input:focus { border-color: #07984c; }
.billing-period { display: grid; gap: 6px; color: #303943; font-size: 11px; font-weight: 800; }
.billing-period input { width: 100%; height: 36px; border: 1px solid #dfe5eb; border-radius: 7px; padding: 0 10px; color: #303943; font: inherit; outline: 0; }
button:disabled { cursor: not-allowed; opacity: .65; }
@media (max-width: 650px) { .fee-config-fields { grid-template-columns: 1fr; } }
</style>

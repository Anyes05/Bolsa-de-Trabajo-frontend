<script setup lang="ts">
import { AlertTriangle, CheckCircle2, FilePlus2, Save } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import { tarifaService } from '../../services/tarifaService'
import type { Tarifa } from '../../services/types'

const today = new Date()
const period = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const amount = ref('')
const dueDate = ref('')
const history = ref<Tarifa[]>([])
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

function toIsoPeriod() {
  return `${period.value}-01`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(value)
}

function formatPeriod(value: string) {
  return new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

async function loadTariffs() {
  loading.value = true
  try {
    history.value = await tarifaService.list()
    const selectedTariff = history.value.find((tariff) => tariff.periodo === toIsoPeriod())
    amount.value = selectedTariff ? String(selectedTariff.montoBase) : ''
    dueDate.value = selectedTariff?.fechaVencimiento ?? ''
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
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !dueDate.value) {
    errorMessage.value = 'Ingrese un monto mayor a cero y una fecha de vencimiento.'
    return
  }

  saving.value = true
  try {
    await tarifaService.save({ periodo: toIsoPeriod(), montoBase: numericAmount, fechaVencimiento: dueDate.value })
    successMessage.value = 'Tarifa guardada. Se aplicará al emitir las cuotas de este período.'
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
        <div class="fee-current__intro"><h2>Monto de cuota vigente</h2><p>Define el valor mensual de la cuota social. Este monto se aplicará automáticamente a todos los socios activos al momento de generar la facturación.</p></div>
        <div class="fee-config-fields"><label>Período<input v-model="period" type="month" @change="loadTariffs"></label><label>Vencimiento<input v-model="dueDate" type="date"></label></div>
        <div class="fee-current__control"><label class="fee-input"><span>$</span><input v-model="amount" type="number" min="0.01" step="0.01" aria-label="Monto de cuota vigente"></label><button class="fee-save" type="button" :disabled="saving || loading" @click="saveAmount"><Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar monto' }}</button></div>
        <p v-if="successMessage" class="fee-success"><CheckCircle2 :size="15" /> {{ successMessage }}</p>
        <p v-if="errorMessage" class="fee-warning"><AlertTriangle :size="15" /> {{ errorMessage }}</p>
        <p class="fee-warning"><AlertTriangle :size="15" /> El cambio solo impacta en cuotas nuevas. Las cuotas ya emitidas no se modifican.</p>
      </section>

      <section class="fee-panel fee-current">
        <div class="fee-current__intro"><h2>Generar facturación</h2><p>Emite las cuotas del período seleccionado para todos los socios activos.</p></div>
        <button class="fee-save" type="button" :disabled="generating || loading" @click="generateBilling"><FilePlus2 :size="16" /> {{ generating ? 'Generando...' : 'Generar cuotas' }}</button>
      </section>

      <section class="fee-panel fee-history"><h2>Historial de tarifas</h2><div v-for="entry in history" :key="entry.id" class="fee-history__entry"><span>$</span><div><strong>{{ formatMoney(entry.montoBase) }} / mes</strong><small>{{ formatPeriod(entry.periodo) }} · Vence {{ entry.fechaVencimiento }}</small></div><b v-if="entry.periodo === toIsoPeriod()">Seleccionada</b></div></section>
    </div>
  </AdminShell>
</template>

<style scoped>
.fee-config-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fee-config-fields label { display: grid; gap: 6px; color: #303943; font-size: 11px; font-weight: 800; }
.fee-config-fields input { width: 100%; height: 36px; border: 1px solid #dfe5eb; border-radius: 7px; padding: 0 10px; color: #303943; font: inherit; outline: 0; }
.fee-config-fields input:focus { border-color: #07984c; }
button:disabled { cursor: not-allowed; opacity: .65; }
@media (max-width: 650px) { .fee-config-fields { grid-template-columns: 1fr; } }
</style>

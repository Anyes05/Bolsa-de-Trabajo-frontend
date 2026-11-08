<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Save } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import { tarifaService } from '../../services/tarifaService'
import type { Tarifa } from '../../services/types'
import { userFacingError } from '../../utils/userMessage'

const year = ref(new Date().getFullYear())
const amount = ref('')
const history = ref<Tarifa[]>([])
const loading = ref(false)
const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

function formatMoney(value: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 2 }).format(value)
}

async function loadTariffs() {
  loading.value = true
  try {
    history.value = await tarifaService.list()
    const selectedTariff = history.value.find((tariff) => tariff.anio === year.value)
    amount.value = selectedTariff ? String(selectedTariff.montoBase) : ''
  } catch (error) {
    errorMessage.value = userFacingError(error, 'cargar las tarifas')
  } finally {
    loading.value = false
  }
}

async function saveAmount() {
  errorMessage.value = ''
  successMessage.value = ''
  const numericAmount = Number(amount.value)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.value)) {
    errorMessage.value = 'Ingrese un monto mayor a cero con hasta dos decimales.'
    return
  }

  saving.value = true
  try {
    await tarifaService.save({ anio: year.value, montoBase: numericAmount, diaVencimiento: 31 })
    successMessage.value = 'Monto de cuota guardado. Se aplicará a las cuotas mensuales de este año.'
    await loadTariffs()
  } catch (error) {
    errorMessage.value = userFacingError(error, 'guardar la tarifa')
  } finally {
    saving.value = false
  }
}

onMounted(loadTariffs)
</script>

<template>
  <AdminShell active="configuracion" title="Configuración de Cuota" subtitle="Monto mensual para socios del CCISJ">
    <div class="fee-settings">
      <section class="fee-panel fee-current">
        <div class="fee-current__intro">
          <h2>Monto de cuota</h2>
          <p>Define el valor mensual de la cuota social. Las cuotas y los reintegros recurrentes activos se generan automáticamente cada mes, con horario de Uruguay.</p>
        </div>
        <div class="fee-current__control">
          <label class="fee-input">
            <span>$</span>
            <input v-model="amount" type="number" min="0.01" step="0.01" aria-label="Monto de cuota vigente">
          </label>
          <button class="fee-save" type="button" :disabled="saving || loading" @click="saveAmount">
            <Save :size="16" /> {{ saving ? 'Guardando...' : 'Guardar monto' }}
          </button>
        </div>
        <p v-if="successMessage" class="fee-success"><CheckCircle2 :size="15" /> {{ successMessage }}</p>
        <p v-if="errorMessage" class="fee-warning"><AlertTriangle :size="15" /> {{ errorMessage }}</p>
        <p class="fee-warning"><AlertTriangle :size="15" /> La tarifa no puede modificarse cuando ya generó cuotas. Las cuotas ya emitidas no se alteran.</p>
      </section>

      <section class="fee-panel fee-history">
        <h2>Historial de tarifas</h2>
        <div v-for="entry in history" :key="entry.id" class="fee-history__entry">
          <span>$</span>
          <div>
            <strong>{{ formatMoney(entry.montoBase) }} / mes</strong>
            <small>Año {{ entry.anio }}</small>
          </div>
          <b v-if="entry.anio === year">Vigente</b>
        </div>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.fee-settings {
  width: 100%;
  max-width: none;
  margin: 0;
}

.fee-current__intro p,
.fee-warning,
.fee-success,
.fee-history__entry small {
  font-size: 1rem;
  line-height: 1.5;
}

.fee-history__entry strong {
  font-size: 1.0625rem;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>

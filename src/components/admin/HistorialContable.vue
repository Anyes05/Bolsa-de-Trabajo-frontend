<script setup lang="ts">
import { ref, watch } from 'vue'
import AppAlert from '../AppAlert.vue'
import { cajaService, type AsientoContable } from '../../services/cajaService'
import { userFacingError } from '../../utils/userMessage'

const props = defineProps<{ socioId: number }>()
const emit = defineEmits<{ actualizado: [] }>()
const asientos = ref<AsientoContable[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const cuota = ref<AsientoContable | null>(null)
const motivo = ref('')
let revision = 0

async function load() {
  const current = ++revision
  loading.value = true
  error.value = ''
  try {
    const data = await cajaService.historialContable(props.socioId)
    if (current === revision) asientos.value = data
  } catch (cause) {
    if (current === revision) error.value = userFacingError(cause, 'cargar el historial contable')
  } finally {
    if (current === revision) loading.value = false
  }
}
function canAnnul(entry: AsientoContable) {
  return entry.entidad === 'CUOTA' && entry.tipo === 'EMISION'
    && !asientos.value.some(a => a.originalId === entry.id || a.entidad === 'PAGO')
}
async function annul() {
  if (!cuota.value || !motivo.value.trim() || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await cajaService.anularCuota(props.socioId, cuota.value.entidadId, motivo.value.trim())
    cuota.value = null
    motivo.value = ''
    await load()
    emit('actualizado')
  } catch (cause) {
    error.value = userFacingError(cause, 'anular la cuota')
  } finally {
    saving.value = false
  }
}
watch(() => props.socioId, () => {
  asientos.value = []
  cuota.value = null
  motivo.value = ''
  void load()
}, { immediate: true })
</script>

<template>
  <section class="accounting-history" aria-label="Historial contable inmutable">
    <h3>Historial contable inmutable</h3>
    <p>Registro independiente del saldo operativo. Las anulaciones conservan el asiento original. Importes negativos: créditos o reversos de cargos.</p>
    <p>Solo se anulan cuotas sin pagos en la cuenta ni reintegros vinculados. Corregir pagos aplicados requiere conciliación; no se eliminan movimientos.</p>
    <p v-if="loading" role="status">Cargando asientos...</p>
    <AppAlert v-if="error">{{ error }} <button type="button" :disabled="saving" @click="load">Reintentar</button></AppAlert>
    <form v-if="cuota" @submit.prevent="annul">
      <label>Motivo de anulación de cuota #{{ cuota.entidadId }}
        <textarea v-model="motivo" required maxlength="1000" :disabled="saving" />
      </label>
      <button type="submit" :disabled="saving || !motivo.trim()">Confirmar anulación</button>
      <button type="button" :disabled="saving" @click="cuota = null">Cancelar</button>
    </form>
    <ol v-if="!loading">
      <li v-for="entry in asientos" :key="entry.id">
        <strong>#{{ entry.id }} · {{ entry.tipo }} {{ entry.entidad }} #{{ entry.entidadId }} · {{ Number(entry.monto).toLocaleString('es-UY', { style: 'currency', currency: 'UYU' }) }}</strong>
        <p>{{ entry.autor }} · {{ new Date(entry.registradoEn).toLocaleString('es-UY') }}</p>
        <p>{{ entry.motivo }} <span v-if="entry.originalId">· Reversa del asiento #{{ entry.originalId }}</span></p>
        <details><summary>Datos originales (incluyen fecha del movimiento)</summary><pre>{{ entry.datos }}</pre></details>
        <button v-if="canAnnul(entry)" type="button" :disabled="saving" @click="cuota = entry; motivo = ''">Anular cuota conservando original</button>
      </li>
    </ol>
    <p v-if="!loading && !error && !asientos.length">No hay asientos registrados.</p>
  </section>
</template>

<style scoped>
.accounting-history { border-top: 1px solid #d5dce5; margin-top: 1rem; padding-top: 1rem; }
li { margin: 1rem 0; }
p { margin: .4rem 0; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
textarea { display: block; width: 100%; }
</style>

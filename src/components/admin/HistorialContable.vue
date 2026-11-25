<script setup lang="ts">
import { ref, watch } from 'vue'
import AppAlert from '../AppAlert.vue'
import { cajaService, type AsientoContable } from '../../services/cajaService'
import { userFacingError } from '../../utils/userMessage'

const props = defineProps<{ socioId: number }>()
const asientos = ref<AsientoContable[]>([])
const loading = ref(false)
const error = ref('')
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

watch(() => props.socioId, () => {
  asientos.value = []
  void load()
}, { immediate: true })
</script>

<template>
  <section class="accounting-history" aria-labelledby="accounting-history-title">
    <h3 id="accounting-history-title" class="accounting-history__title">Historial contable inmutable</h3>
    <p class="accounting-history__text">Registro independiente del saldo operativo: cada cuota, pago y reintegro queda asentado y no se puede modificar ni borrar. Importes negativos: pagos que reducen la deuda.</p>
    <p v-if="loading" class="accounting-history__text" role="status">Cargando asientos...</p>
    <AppAlert v-if="error">{{ error }} <button type="button" class="accounting-history__retry" @click="load">Reintentar</button></AppAlert>
    <ol v-if="!loading" class="accounting-history__list">
      <li v-for="entry in asientos" :key="entry.id" class="accounting-history__item">
        <strong class="accounting-history__heading">#{{ entry.id }} · {{ entry.tipo }} {{ entry.entidad }} #{{ entry.entidadId }} · {{ Number(entry.monto).toLocaleString('es-UY', { style: 'currency', currency: 'UYU' }) }}</strong>
        <p class="accounting-history__text">{{ entry.autor }} · {{ new Date(entry.registradoEn).toLocaleString('es-UY') }}</p>
        <p class="accounting-history__text">{{ entry.motivo }}</p>
        <details class="accounting-history__details">
          <summary class="accounting-history__summary">Datos originales (incluyen fecha del movimiento)</summary>
          <pre class="accounting-history__data">{{ entry.datos }}</pre>
        </details>
      </li>
    </ol>
    <p v-if="!loading && !error && !asientos.length" class="accounting-history__text">No hay asientos registrados.</p>
  </section>
</template>

<style scoped>
.accounting-history { border-top: 1px solid var(--t-line-d5dce5); margin-top: 1rem; padding-top: 1rem; }
.accounting-history__item { margin: 1rem 0; }
.accounting-history__text { margin: .4rem 0; }
.accounting-history__data { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>

<script setup lang="ts">
import { FileSpreadsheet, Upload } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { socioService, type ImportacionFila, type ImportacionPreview, type ImportacionResultado } from '../../services/socioService'
import { labelsCamposFicticios } from '../../utils/camposFicticios'
import { userFacingError } from '../../utils/userMessage'

const file = ref<File | null>(null)
const preview = ref<ImportacionPreview | null>(null)
const resultado = ref<ImportacionResultado | null>(null)
const error = ref('')
const busy = ref(false)
const importing = ref(false)

const canImport = computed(() => Boolean(file.value && preview.value && preview.value.resumen.importables > 0 && !busy.value && !importing.value))

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  preview.value = null
  resultado.value = null
  error.value = ''
}

function estadoTone(estado: string) {
  if (estado === 'IMPORTABLE') return 'green'
  if (estado === 'DUPLICADO') return 'yellow'
  return 'red'
}

function estadoLabel(estado: string) {
  if (estado === 'IMPORTABLE') return 'Se va a importar'
  if (estado === 'DUPLICADO') return 'Duplicado'
  return 'Error'
}

async function runPreview() {
  if (!file.value) {
    error.value = 'Seleccioná un archivo Excel (.xlsx o .xls).'
    return
  }
  busy.value = true
  error.value = ''
  resultado.value = null
  try {
    preview.value = await socioService.previewImportacion(file.value)
  } catch (exception) {
    preview.value = null
    error.value = userFacingError(exception, 'previsualizar el Excel')
  } finally {
    busy.value = false
  }
}

async function confirmar() {
  if (!file.value || !canImport.value) return
  importing.value = true
  error.value = ''
  try {
    resultado.value = await socioService.confirmarImportacion(file.value)
  } catch (exception) {
    error.value = userFacingError(exception, 'importar los socios')
  } finally {
    importing.value = false
  }
}

function ficticios(fila: ImportacionFila) {
  return labelsCamposFicticios(fila.camposFicticios)
}
</script>

<template>
  <AdminShell
    active="importacion"
    title="Carga masiva de socios"
    subtitle="Subí el padrón Excel, revisá los datos provisionales y confirmá la importación"
  >
    <section class="fee-panel fee-current">
      <div class="fee-current__intro">
        <h2>1. Subir Excel</h2>
        <p>
          La primera fila tiene que ser el encabezado (razón social, dirección, celular, localidad, giro, mail, RUT, BPS, inicio, fecha de afiliación).
          WhatsApp, lista de difusión, mes y número se ignoran. Los campos vacíos se completan con datos provisionales bien marcados.
        </p>
      </div>
      <label class="import-file">
        <FileSpreadsheet :size="18" />
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" @change="onFileChange">
        <span>{{ file ? file.name : 'Elegir archivo .xlsx' }}</span>
      </label>
      <button class="fee-save" type="button" :disabled="!file || busy" @click="runPreview">
        <Upload :size="16" /> {{ busy ? 'Leyendo...' : 'Previsualizar' }}
      </button>
    </section>

    <AppAlert v-if="error">{{ error }}</AppAlert>

    <section v-if="preview" class="fee-panel">
      <div class="fee-current__intro">
        <h2>2. Previsualización</h2>
        <p>Revisá qué se va a crear. Los duplicados y las filas sin razón social no se importan.</p>
      </div>
      <div class="import-stats">
        <article><strong>{{ preview.resumen.total }}</strong><span>Filas</span></article>
        <article><strong>{{ preview.resumen.importables }}</strong><span>A importar</span></article>
        <article><strong>{{ preview.resumen.conFicticios }}</strong><span>Con datos provisionales</span></article>
        <article><strong>{{ preview.resumen.duplicados }}</strong><span>Duplicados</span></article>
        <article><strong>{{ preview.resumen.errores }}</strong><span>Errores</span></article>
      </div>
      <div class="cash-table-wrap">
        <table class="cash-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>Estado</th>
              <th>Razón social</th>
              <th>BPS</th>
              <th>RUT</th>
              <th>Datos provisionales</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in preview.filas" :key="fila.filaExcel">
              <td>{{ fila.filaExcel }}</td>
              <td>
                <span class="cash-status" :class="`cash-status--${estadoTone(fila.estado)}`">
                  <i />{{ estadoLabel(fila.estado) }}
                </span>
              </td>
              <td>{{ fila.razonSocial || '—' }}</td>
              <td>{{ fila.bps || '—' }}</td>
              <td>{{ fila.rut || '—' }}</td>
              <td>
                <span v-if="ficticios(fila).length" class="import-tags">
                  <b v-for="label in ficticios(fila)" :key="label">{{ label }}</b>
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ fila.motivo || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="fee-save" type="button" :disabled="!canImport" @click="confirmar">
        {{ importing ? 'Importando...' : `Confirmar importación (${preview.resumen.importables})` }}
      </button>
    </section>

    <section v-if="resultado" class="fee-panel">
      <div class="fee-current__intro">
        <h2>3. Resultado</h2>
        <p>
          Se crearon <strong>{{ resultado.resumen.creados }}</strong> socios.
          Quedan visibles en Gestión de Socios y en Caja, sin acceso al sistema hasta que completes BPS y email reales y habilites el ingreso.
        </p>
      </div>
    </section>
  </AdminShell>
</template>

<style scoped>
.import-file {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 16px;
  padding: 10px 14px;
  border: 1px dashed #b7c4bc;
  border-radius: 10px;
  color: #445249;
  font-weight: 600;
  cursor: pointer;
}

.import-file input {
  display: none;
}

.import-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}

.import-stats article {
  padding: 12px 14px;
  border: 1px solid #e4e9ee;
  border-radius: 10px;
  background: #fff;
}

.import-stats strong {
  display: block;
  color: #0a7a3e;
  font-size: 1.4rem;
}

.import-stats span {
  color: #5a6870;
  font-size: 0.85rem;
}

.import-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.import-tags b {
  padding: 3px 7px;
  border-radius: 999px;
  background: #fef9c3;
  color: #854d0e;
  font-size: 11px;
  font-weight: 700;
}

.fee-save {
  margin-top: 16px;
}

@media (max-width: 800px) {
  .import-stats {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileSpreadsheet, Upload } from 'lucide-vue-next'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useServerList } from '../../composables/useServerList'
import { cajaService, type HistorialCajaImportPreview } from '../../services/cajaService'
import { emptyPage, type Page } from '../../services/pagination'
import { socioService } from '../../services/socioService'
import type { SocioRecord } from '../../services/types'
import { cajaHistorialImportacionExcel } from '../../services/cajaHistorialImportacionExcel'
import { userFacingError } from '../../utils/userMessage'

const query = ref('')
const selectedSocio = ref<SocioRecord | null>(null)
const file = ref<File | null>(null)
const preview = ref<HistorialCajaImportPreview | null>(null)
const result = ref<HistorialCajaImportPreview | null>(null)
const error = ref('')
const loadingTemplate = ref(false)
const previewing = ref(false)
const importing = ref(false)

const listado = useServerList<Page<SocioRecord>>({
  fetch: (page) => socioService.pageSocios({ q: query.value, page, size: 8 }),
  search: query,
  initial: emptyPage(),
  onError: (cause) => { error.value = userFacingError(cause, 'cargar los socios') },
})

const canPreview = computed(() => Boolean(selectedSocio.value && file.value && !previewing.value && !importing.value))
const canImport = computed(() => Boolean(
  preview.value
  && preview.value.resumen.importables > 0
  && preview.value.resumen.errores === 0
  && !previewing.value
  && !importing.value,
))

function selectSocio(socio: SocioRecord) {
  selectedSocio.value = socio
  preview.value = null
  result.value = null
  error.value = ''
}

function onFileChange(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  file.value = input.files?.[0] ?? null
  preview.value = null
  result.value = null
  error.value = ''
}

async function downloadTemplate() {
  loadingTemplate.value = true
  error.value = ''
  try {
    await cajaHistorialImportacionExcel.downloadTemplate()
  } catch (cause) {
    error.value = userFacingError(cause, 'descargar la plantilla')
  } finally {
    loadingTemplate.value = false
  }
}

async function previsualizar() {
  if (!selectedSocio.value || !file.value) return
  previewing.value = true
  error.value = ''
  result.value = null
  try {
    preview.value = await cajaService.previewHistorialImportacion(selectedSocio.value.id, file.value)
  } catch (cause) {
    preview.value = null
    error.value = userFacingError(cause, 'previsualizar el historial')
  } finally {
    previewing.value = false
  }
}

async function confirmar() {
  if (!selectedSocio.value || !file.value || !canImport.value) return
  const confirmed = window.confirm(
    `Se crearán cuotas y pagos con fechas históricas para ${selectedSocio.value.razonSocial}. La auditoría contable no se puede borrar desde la aplicación. ¿Continuar?`,
  )
  if (!confirmed) return

  importing.value = true
  error.value = ''
  try {
    result.value = await cajaService.importarHistorial(selectedSocio.value.id, file.value)
    preview.value = null
  } catch (cause) {
    error.value = userFacingError(cause, 'importar el historial')
  } finally {
    importing.value = false
  }
}

function estadoLabel(estado: string) {
  if (estado === 'IMPORTABLE') return 'A importar'
  if (estado === 'IMPORTADO') return 'Importado'
  if (estado === 'DUPLICADO') return 'Duplicado'
  return 'Error'
}

function estadoTone(estado: string) {
  if (estado === 'IMPORTABLE' || estado === 'IMPORTADO') return 'green'
  if (estado === 'DUPLICADO') return 'yellow'
  return 'red'
}

function displaySocioId(id: number) {
  return `#S${String(id).padStart(3, '0')}`
}

onMounted(() => { void listado.load(0) })
</script>

<template>
  <AdminShell
    active="historial-caja-importacion"
    title="Importar historial de cuotas"
    subtitle="Carga cuotas mensuales ya pagadas para un socio desde Excel"
  >
    <AppAlert tone="warning">
      Herramienta temporal de prueba. Úsala solo en la base de datos de desarrollo: las cuotas, pagos y registros de auditoría que se creen son permanentes.
    </AppAlert>

    <section class="subscription-layout">
      <section class="subscription-panel" aria-label="Seleccionar socio">
        <h2 class="subscription-detail__heading">1. Elegir socio</h2>
        <label class="subscription-search">
          <input
            v-model="query"
            class="subscription-search__input"
            type="search"
            aria-label="Buscar socio"
            placeholder="Razón social, RUT o cédula..."
          >
        </label>
        <div class="subscription-companies">
          <button
            v-for="socio in listado.data.value.content"
            :key="socio.id"
            type="button"
            class="subscription-company"
            :class="{ 'subscription-company--selected': selectedSocio?.id === socio.id }"
            :aria-pressed="selectedSocio?.id === socio.id"
            :disabled="importing"
            @click="selectSocio(socio)"
          >
            <span>
              <strong class="subscription-company__strong">{{ socio.razonSocial }}</strong>
              <small class="subscription-company__note">{{ socio.rut || socio.cedula || 'Sin RUT / Cédula' }} · {{ displaySocioId(socio.id) }}</small>
            </span>
            <span class="subscription-badge" :class="{ 'subscription-badge--inactive': !socio.activo }">
              {{ socio.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </button>
          <p v-if="listado.loading.value" role="status">Cargando socios...</p>
          <p v-else-if="!listado.data.value.content.length" class="subscription-empty">No hay socios que coincidan.</p>
        </div>
        <PaginationBar
          :page="listado.page.value"
          :total-pages="listado.data.value.totalPages"
          :total-elements="listado.data.value.totalElements"
          :loading="listado.loading.value"
          label="Paginación de socios"
          @change="listado.goTo"
        />
      </section>

      <section class="subscription-panel subscription-detail">
        <h2 class="subscription-detail__heading">2. Preparar archivo</h2>
        <p class="subscription-detail__text">
          Cada fila representa un pago de una cuota. Si el socio pagó una cuota en varios pagos, repetí el período, monto y vencimiento en cada fila;
          la suma de esos pagos debe cubrir exactamente la cuota. Los períodos ya existentes se omiten para no duplicar cargos.
        </p>
        <div class="import-actions">
          <button class="fee-save" type="button" :disabled="loadingTemplate" @click="downloadTemplate">
            <FileSpreadsheet :size="16" /> {{ loadingTemplate ? 'Generando...' : 'Descargar plantilla Excel' }}
          </button>
        </div>
        <label class="import-file">
          <FileSpreadsheet :size="18" />
          <input
            class="import-file__input"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            :disabled="importing"
            @change="onFileChange"
          >
          <span>{{ file?.name || 'Elegir archivo .xlsx' }}</span>
        </label>
        <p v-if="selectedSocio" class="subscription-detail__text">
          Socio seleccionado: <strong>{{ selectedSocio.razonSocial }}</strong> ({{ displaySocioId(selectedSocio.id) }})
        </p>
        <div class="import-actions">
          <button class="fee-save fee-panel__fee-save" type="button" :disabled="!canPreview" @click="previsualizar">
            <Upload :size="16" /> {{ previewing ? 'Validando...' : 'Previsualizar Excel' }}
          </button>
        </div>
        <AppAlert v-if="error">{{ error }}</AppAlert>

        <template v-if="preview">
          <h3>Vista previa</h3>
          <div class="import-stats">
            <article class="import-stats__article"><strong class="import-stats__strong">{{ preview.resumen.total }}</strong><span class="import-stats__inline">Filas</span></article>
            <article class="import-stats__article"><strong class="import-stats__strong">{{ preview.resumen.importables }}</strong><span class="import-stats__inline">A importar</span></article>
            <article class="import-stats__article"><strong class="import-stats__strong">{{ preview.resumen.duplicados }}</strong><span class="import-stats__inline">Duplicados</span></article>
            <article class="import-stats__article"><strong class="import-stats__strong">{{ preview.resumen.errores }}</strong><span class="import-stats__inline">Errores</span></article>
          </div>
          <div class="cash-table-wrap">
            <table class="cash-table">
              <thead>
                <tr>
                  <th class="cash-table__header-cell">Fila</th>
                  <th class="cash-table__header-cell">Período</th>
                  <th class="cash-table__header-cell">Cuota</th>
                  <th class="cash-table__header-cell">Vencimiento</th>
                  <th class="cash-table__header-cell">Fecha de pago</th>
                  <th class="cash-table__header-cell">Pagado</th>
                  <th class="cash-table__header-cell">Método</th>
                  <th class="cash-table__header-cell">Estado</th>
                  <th class="cash-table__header-cell">Detalle</th>
                </tr>
              </thead>
              <tbody class="cash-table__tbody">
                <tr v-for="row in preview.filas" :key="row.filaExcel" class="cash-table__row">
                  <td class="cash-table__cell">{{ row.filaExcel }}</td>
                  <td class="cash-table__cell">{{ row.periodo || '—' }}</td>
                  <td class="cash-table__cell">{{ row.montoCuota ?? '—' }}</td>
                  <td class="cash-table__cell">{{ row.fechaVencimiento || '—' }}</td>
                  <td class="cash-table__cell">{{ row.fechaPago || '—' }}</td>
                  <td class="cash-table__cell">{{ row.montoPagado ?? '—' }}</td>
                  <td class="cash-table__cell">{{ row.metodoPago || '—' }}</td>
                  <td class="cash-table__cell">
                    <span class="cash-status" :class="`cash-status--${estadoTone(row.estado)}`">
                      <i class="cash-status__italic" />{{ estadoLabel(row.estado) }}
                    </span>
                  </td>
                  <td class="cash-table__cell">{{ row.motivo || row.referencia || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="import-actions">
            <button class="fee-save" type="button" :disabled="!canImport" @click="confirmar">
              {{ importing ? 'Importando...' : `Confirmar e importar (${preview.resumen.importables})` }}
            </button>
          </div>
        </template>

        <AppAlert v-if="result" tone="success">
          Se importaron {{ result.resumen.creados }} cuotas pagadas.
          <template v-if="result.resumen.duplicados"> Se omitieron {{ result.resumen.duplicados }} períodos duplicados.</template>
        </AppAlert>
      </section>
    </section>
  </AdminShell>
</template>

<style scoped>
.subscription-layout {
  display: grid;
  grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.subscription-panel {
  min-width: 0;
  background: var(--t-bg-ffffff);
  border: 1px solid var(--t-line-dce8df);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 18px #163c2908;
}

.subscription-search {
  display: flex;
  align-items: center;
  padding: 18px;
  color: var(--t-fg-64736a);
  border-bottom: 1px solid var(--t-line-e6eee8);
}

.subscription-search__input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  font: inherit;
}

.subscription-companies {
  max-height: 620px;
  overflow-y: auto;
}

.subscription-company {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 18px;
  border: 0;
  border-bottom: 1px solid var(--t-line-edf2ee);
  background: var(--t-bg-ffffff);
  text-align: left;
  color: var(--t-fg-24352b);
  cursor: pointer;
}

.subscription-company--selected,
.subscription-company:hover {
  background: var(--t-bg-eaf5ee);
}

.subscription-company__strong {
  display: block;
  overflow-wrap: anywhere;
}

.subscription-company__note {
  display: block;
  margin-top: 6px;
  color: var(--t-fg-64736a);
}

.subscription-badge {
  padding: 5px 9px;
  border-radius: 20px;
  font-size: .75rem;
  background: var(--t-bg-e4f3e9);
  color: var(--t-fg-087c42);
}

.subscription-badge--inactive {
  background: var(--t-bg-f7eee3);
  color: var(--t-fg-886322);
}

.subscription-detail {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.subscription-detail__heading {
  margin: 0;
  font-size: 1.2rem;
  color: var(--t-fg-24352b);
  overflow-wrap: anywhere;
}

.subscription-detail__text {
  margin: 0;
  font-size: .875rem;
  line-height: 1.6;
  color: var(--t-fg-64736a);
}

.subscription-empty {
  padding: 24px;
  text-align: center;
  color: var(--t-fg-718177);
}

.import-file {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  padding: 10px 14px;
  border: 1px dashed var(--t-line-b7c4bc);
  border-radius: 10px;
  color: var(--t-fg-445249);
  font-weight: 600;
  cursor: pointer;
}

.import-file__input {
  display: none;
}

.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.fee-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 0;
  border-radius: 10px;
  background: var(--t-bg-087c42);
  color: var(--t-fg-ffffff);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.fee-save:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.import-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.import-stats__article {
  padding: 12px 14px;
  border: 1px solid var(--t-line-e4e9ee);
  border-radius: 10px;
  background: var(--t-bg-ffffff);
}

.import-stats__strong {
  display: block;
  color: var(--t-fg-0a7a3e);
  font-size: 1.4rem;
}

.import-stats__inline {
  color: var(--t-fg-5a6870);
  font-size: .85rem;
}

.subscription-layout :is(button, input):focus-visible {
  outline: 2px solid var(--t-line-078844);
  outline-offset: -2px;
}

@media (max-width: 850px) {
  .subscription-layout { grid-template-columns: 1fr; }
  .subscription-companies { max-height: 260px; }
  .subscription-detail { padding: 20px; }
}
</style>

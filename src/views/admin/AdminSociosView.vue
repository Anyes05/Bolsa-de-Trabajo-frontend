<script setup lang="ts">
import { Download, Pencil, Plus, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ProfileAvatar from '../../components/ProfileAvatar.vue'
import PasswordInput from '../../components/PasswordInput.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useServerList } from '../../composables/useServerList'
import { emptyPage, type Page } from '../../services/pagination'
import { localidadesConActual } from '../../data/localidades'
import {
  estadoMorosidadLabel,
  estadoMorosidadTone,
  socioIdentificadorLabel as adminIdentificadorLabel,
  socioService,
} from '../../services/socioService'
import type { EstadoMorosidad, RubroOption, SocioRecord } from '../../services/types'
import { sociosExcelService } from '../../services/sociosExcelService'
import { isCampoFicticio, labelsCamposFicticios } from '../../utils/camposFicticios'
import { userFacingError } from '../../utils/userMessage'

const router = useRouter()
const rubros = ref<RubroOption[]>([])
const query = ref('')
const onlyIncomplete = ref(false)
const error = ref('')
const catalogBusy = ref(false)
const exporting = ref(false)

// Búsqueda, filtro de incompletos y paginación: los resuelve el backend.
const listado = useServerList<Page<SocioRecord>>({
  fetch: (page) => socioService.pageSocios({ q: query.value, incompletos: onlyIncomplete.value, page }),
  filters: [onlyIncomplete],
  search: query,
  initial: emptyPage(),
  onError: (exception) => { error.value = userFacingError(exception, 'cargar el listado de socios') },
})
const socios = computed(() => listado.data.value.content)
const busy = computed(() => catalogBusy.value || listado.loading.value)

async function downloadExcel() {
  if (busy.value || exporting.value || !listado.data.value.totalElements) return
  exporting.value = true
  error.value = ''
  try {
    // La exportación es una operación masiva: pide el padrón completo en el momento de descargar.
    await sociosExcelService.download(await socioService.getSocios())
  } catch (exception) {
    error.value = userFacingError(exception, 'descargar el Excel de socios')
  } finally {
    exporting.value = false
  }
}
const editing = ref<SocioRecord | null>(null)
const editError = ref('')
const editBusy = ref(false)
const resetBusy = ref(false)
const resetHint = ref('')
const generatedPassword = ref('')
const accessBusy = ref(false)
const editForm = reactive({
  bps: '',
  emailUsuario: '',
  razonSocial: '',
  rut: '',
  telefono: '',
  emailContacto: '',
  calle: '',
  numero: '',
  localidad: '',
  rubroId: '',
  esDirectivo: false,
  fechaAlta: '',
  fechaAniversario: '',
  estadoMorosidad: 'AL_DIA' as EstadoMorosidad,
})

onMounted(async () => {
  catalogBusy.value = true
  error.value = ''
  try {
    const [catalog] = await Promise.all([socioService.getRubros(), listado.load(0)])
    rubros.value = catalog
  } catch (exception) {
    error.value = userFacingError(exception, 'cargar el listado de socios')
  } finally {
    catalogBusy.value = false
  }
})

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

const localidadOptions = computed(() => localidadesConActual(editForm.localidad))

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function openEdit(socio: SocioRecord) {
  editing.value = socio
  editError.value = ''
  resetHint.value = ''
  generatedPassword.value = ''
  editForm.bps = socio.bps ?? ''
  editForm.emailUsuario = socio.emailUsuario ?? ''
  editForm.razonSocial = socio.razonSocial ?? ''
  editForm.rut = socio.rut ?? ''
  editForm.telefono = socio.telefono ?? ''
  editForm.emailContacto = socio.emailContacto ?? ''
  editForm.calle = socio.calle ?? ''
  editForm.numero = socio.numero ?? ''
  editForm.localidad = socio.localidad ?? ''
  editForm.rubroId = socio.rubroId != null ? String(socio.rubroId) : ''
  editForm.esDirectivo = socio.esDirectivo
  editForm.fechaAlta = socio.fechaAlta?.slice(0, 10) ?? ''
  editForm.fechaAniversario = socio.fechaAniversario?.slice(0, 10) ?? ''
  editForm.estadoMorosidad = socio.estadoMorosidad
}

function closeEdit() {
  editing.value = null
  resetHint.value = ''
  generatedPassword.value = ''
}

function replaceSocio(updated: SocioRecord) {
  const current = listado.data.value
  listado.data.value = { ...current, content: current.content.map((item) => (item.id === updated.id ? updated : item)) }
}

async function saveEdit() {
  if (!editing.value) return
  const rutOCedula = editForm.rut.replace(/\D/g, '')
  if (rutOCedula.length !== 12 && rutOCedula.length !== 8) {
    editError.value = 'Ingresa un RUT (12 dígitos) o una cédula (8 dígitos).'
    return
  }
  if (!editForm.rubroId) {
    editError.value = 'Selecciona un rubro.'
    return
  }
  editBusy.value = true
  editError.value = ''
  try {
    const updated = await socioService.updateSocio(editing.value.id, {
      bps: isCampoFicticio(editing.value.camposFicticios, 'bps') ? editForm.bps.replace(/\D/g, '') : undefined,
      emailUsuario: isCampoFicticio(editing.value.camposFicticios, 'emailUsuario') ? emptyToNull(editForm.emailUsuario) : undefined,
      razonSocial: editForm.razonSocial.trim(),
      rut: editForm.rut.replace(/\D/g, ''),
      telefono: emptyToNull(editForm.telefono),
      emailContacto: emptyToNull(editForm.emailContacto),
      calle: editForm.calle.trim(),
      numero: emptyToNull(editForm.numero),
      localidad: editForm.localidad.trim(),
      rubroId: Number(editForm.rubroId),
      esDirectivo: editForm.esDirectivo,
      fechaAlta: emptyToNull(editForm.fechaAlta),
      fechaAniversario: emptyToNull(editForm.fechaAniversario),
      estadoMorosidad: editForm.estadoMorosidad,
    })
    replaceSocio(updated)
    closeEdit()
  } catch (exception) {
    editError.value = userFacingError(exception, 'guardar los datos del socio')
  } finally {
    editBusy.value = false
  }
}

async function toggleActive(socio: SocioRecord) {
  if (!socio.activo) {
    await router.push({ name: 'admin-socios-historial', query: { socio: socio.id } })
    return
  }
  error.value = ''
  try {
    const updated = await socioService.deleteSocio(socio.id)
    replaceSocio(updated)
  } catch (exception) {
    error.value = userFacingError(exception, 'actualizar el estado del socio')
  }
}

function fieldHint(campo: string) {
  return editing.value && isCampoFicticio(editing.value.camposFicticios, campo)
}

async function habilitarAcceso() {
  if (!editing.value) return
  accessBusy.value = true
  editError.value = ''
  resetHint.value = ''
  try {
    const updated = await socioService.habilitarAcceso(editing.value.id)
    replaceSocio(updated)
    editing.value = updated
    generatedPassword.value = updated.passwordProvisional ?? ''
    resetHint.value = updated.credencialesEnvioMensaje
      || 'Acceso habilitado. Comunicá la clave provisional al socio.'
  } catch (exception) {
    editError.value = userFacingError(exception, 'habilitar el acceso del socio')
  } finally {
    accessBusy.value = false
  }
}

async function resetClave() {
  if (!editing.value) return
  resetBusy.value = true
  editError.value = ''
  resetHint.value = ''
  generatedPassword.value = ''
  try {
    const updated = await socioService.resetClaveProvisional(editing.value.id)
    replaceSocio(updated)
    editing.value = updated
    generatedPassword.value = updated.passwordProvisional ?? ''
    resetHint.value = 'Clave provisional generada. Comunícasela al socio: tiene 24 horas para cambiarla.'
  } catch (exception) {
    editError.value = userFacingError(exception, 'restablecer la clave provisional')
  } finally {
    resetBusy.value = false
  }
}
</script>

<template>
  <AdminShell active="socios" title="Gestión de Socios" subtitle="Listado general y altas del padrón">
    <div class="company-actions">
      <button class="cash-download" type="button" :disabled="busy || exporting || !listado.data.value.totalElements" @click="downloadExcel">
        <Download :size="16" /> {{ exporting ? 'Descargando...' : 'Descargar Excel' }}
      </button>
      <RouterLink class="company-button company-button--outline company-actions__company-button" to="/admin/socios/importacion">
        Carga masiva
      </RouterLink>
      <RouterLink class="company-button company-button--primary company-actions__company-button" to="/admin/socios/nueva">
        <Plus :size="16" /> Nuevo Socio
      </RouterLink>
    </div>

    <section class="company-search-card">
      <label class="company-search">
        <Search :size="17" />
        <input v-model="query" class="company-search__input" aria-label="Buscar socios por razón social, RUT, cédula o rubro" placeholder="Buscar por razón social, RUT / Cédula o rubro...">
      </label>
      <label class="company-incomplete-filter">
        <input v-model="onlyIncomplete" type="checkbox">
        Solo datos incompletos
      </label>
      <span class="company-search-card__inline">{{ listado.data.value.totalElements }} socios listados</span>
    </section>

    <AppAlert v-if="error">{{ error }}</AppAlert>
    <p v-else-if="busy && !socios.length" class="company-empty">Cargando socios...</p>
    <p v-else-if="!socios.length" class="company-empty">No hay socios para mostrar.</p>

    <section v-else class="company-table-card" :aria-busy="busy">
      <div class="company-table-wrap">
        <table class="company-table">
          <thead>
            <tr>
              <th class="company-table__header-cell">Socio<br><small class="company-table__note">BPS / Cédula</small></th>
              <th class="company-table__header-cell">RUT / Cédula</th>
              <th class="company-table__header-cell">Rubro</th>
              <th class="company-table__header-cell">Estado</th>
              <th class="company-table__header-cell">Directivo</th>
              <th class="company-table__header-cell">Alta</th>
              <th class="company-table__header-cell">Baja</th>
              <th class="company-table__header-cell">Activo</th>
              <th class="company-table__header-cell">Acciones</th>
            </tr>
          </thead>
          <tbody class="company-table__tbody">
            <tr v-for="socio in socios" :key="socio.id" class="company-table__row">
              <td class="company-table__cell">
                <div class="company-table__identity">
                  <ProfileAvatar
                    class="company-table__avatar"
                    :src="socio.fotoUrl"
                    :initials="socio.razonSocial.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()"
                  />
                  <div class="company-table__name">
                    <strong class="company-table__name-strong">{{ socio.razonSocial }}</strong>
                    <small class="company-table__name-note">{{ adminIdentificadorLabel(socio) }}</small>
                    <span v-if="(socio.camposFicticios?.length ?? 0) > 0" class="socio-incomplete">Datos incompletos</span>
                    <span v-if="socio.importadoMasivo && socio.accesoHabilitado === false" class="socio-no-access">Sin acceso</span>
                    <small v-if="socio.emailUsuario" class="company-table__name-note">Cuenta: {{ socio.emailUsuario }}</small>
                    <small v-if="socio.emailContacto" class="company-table__name-note">Contacto: {{ socio.emailContacto }}</small>
                  </div>
                </div>
              </td>
              <td class="company-table__cell">{{ socio.rut || '—' }}</td>
              <td class="company-table__cell">{{ socio.nombreRubro || '—' }}</td>
              <td class="company-table__cell">
                <span class="cash-status" :class="`cash-status--${estadoMorosidadTone(socio.estadoMorosidad)}`">
                  <i class="cash-status__italic" />{{ estadoMorosidadLabel[socio.estadoMorosidad] }}
                </span>
              </td>
              <td class="company-table__cell">{{ socio.esDirectivo ? 'Sí' : 'No' }}</td>
              <td class="company-table__cell">{{ formatDate(socio.fechaAlta) }}</td>
              <td class="company-table__cell">{{ formatDate(socio.fechaBaja) }}</td>
              <td class="company-table__cell">
                <button
                  class="company-toggle"
                  :class="{ 'company-toggle--on': socio.activo }"
                  type="button"
                  :aria-label="socio.activo ? 'Dar de baja al socio' : 'Reactivar socio'"
                  @click="toggleActive(socio)"
                >
                  <i class="company-toggle__italic" />
                </button>
              </td>
              <td class="company-table__cell">
                <button class="company-edit" type="button" @click="openEdit(socio)">
                  <Pencil :size="12" /> Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar
        :page="listado.page.value"
        :total-pages="listado.data.value.totalPages"
        :total-elements="listado.data.value.totalElements"
        :loading="busy"
        label="Paginación de socios"
        @change="listado.goTo"
      />
    </section>

    <div v-if="editing" class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-socio-title">
      <button class="admin-modal__backdrop" type="button" aria-label="Cerrar" @click="closeEdit" />
      <section class="new-company-card admin-modal__card">
        <header class="new-company-card__header">
          <h2 id="edit-socio-title" class="new-company-card__header-heading">Editar socio</h2>
          <p v-if="!editing.importadoMasivo" class="new-company-card__header-text">El identificador de acceso (BPS o cédula) y el email de cuenta no se cambian aquí.</p>
          <p v-else class="new-company-card__header-text">Los campos en amarillo son datos provisionales de la carga masiva. Reemplazalos por el dato real.</p>
          <p v-if="labelsCamposFicticios(editing.camposFicticios).length" class="socio-ficticios-list new-company-card__header-text">
            Provisionales: {{ labelsCamposFicticios(editing.camposFicticios).join(', ') }}
          </p>
        </header>
        <form class="new-company-form" @submit.prevent="saveEdit">
          <label class="new-company-form__wide new-company-form__label">Razón social *
            <input v-model="editForm.razonSocial" class="new-company-form__input" required>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('bps') }">Identificador de acceso
            <input v-if="fieldHint('bps')" v-model="editForm.bps" class="field-ficticio__input new-company-form__input" inputmode="numeric" placeholder="BPS real (mín. 9 dígitos)">
            <input v-else class="field-ficticio__input new-company-form__input" :value="adminIdentificadorLabel(editing)" readonly>
            <small v-if="fieldHint('bps')" class="new-company-form__note">Dato provisional. Completá el BPS real.</small>
            <small v-else class="new-company-form__note">Se define solo en el alta: BPS o cédula, no ambos.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('rut') }">RUT o cédula *
            <input v-model="editForm.rut" class="field-ficticio__input new-company-form__input" inputmode="numeric" required placeholder="RUT (12 dígitos) o cédula (8 dígitos)">
            <small v-if="fieldHint('rut')" class="new-company-form__note">Dato provisional. Completá el RUT o cédula real.</small>
            <small v-else class="new-company-form__note">Si no tiene RUT, va la cédula.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('telefono') }">Teléfono *
            <input v-model="editForm.telefono" class="field-ficticio__input new-company-form__input" required>
            <small v-if="fieldHint('telefono')" class="new-company-form__note">Dato provisional. Completá el teléfono real.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('emailUsuario') }">Email de cuenta
            <input v-if="fieldHint('emailUsuario')" v-model="editForm.emailUsuario" class="field-ficticio__input new-company-form__input" type="email" placeholder="cuenta@empresa.com">
            <input v-else class="field-ficticio__input new-company-form__input" :value="editing.emailUsuario || ''" type="email" readonly>
            <small v-if="fieldHint('emailUsuario')" class="new-company-form__note">Dato provisional. Completá el email real de la cuenta.</small>
            <small v-else class="new-company-form__note">Con este correo se registró el usuario.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('emailContacto') }">Email de contacto
            <input v-model="editForm.emailContacto" class="field-ficticio__input new-company-form__input" type="email" placeholder="contacto@empresa.com">
            <small v-if="fieldHint('emailContacto')" class="new-company-form__note">Dato provisional. Completá el email de contacto real.</small>
            <small v-else class="new-company-form__note">Con este correo se contacta a la firma. Puede ser el mismo u otro.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('fechaAlta') }">Fecha de alta en el CCISJ
            <input v-model="editForm.fechaAlta" class="field-ficticio__input new-company-form__input" type="date">
            <small v-if="fieldHint('fechaAlta')" class="new-company-form__note">Fecha provisional. Completá la fecha de afiliación real.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('fechaAniversario') }">Fecha de aniversario *
            <input v-model="editForm.fechaAniversario" class="field-ficticio__input new-company-form__input" type="date" required>
            <small v-if="fieldHint('fechaAniversario')" class="new-company-form__note">Fecha provisional (vino vacía en el Excel).</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('rubro') }">Rubro *
            <select v-model="editForm.rubroId" class="new-company-select new-company-form__new-company-select new-company-form__select field-ficticio__select" required>
              <option value="" disabled>Seleccionar rubro</option>
              <option v-for="rubro in rubros" :key="rubro.id" :value="String(rubro.id)">{{ rubro.nombreRubro }}</option>
            </select>
          </label>
          <label class="new-company-form__label">Estado de cuenta
            <select v-model="editForm.estadoMorosidad" class="new-company-select new-company-form__new-company-select new-company-form__select">
              <option value="AL_DIA">Al día</option>
              <option value="MOROSO">Moroso</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('calle') }">Calle *
            <input v-model="editForm.calle" class="field-ficticio__input new-company-form__input" required>
            <small v-if="fieldHint('calle')" class="new-company-form__note">Dato provisional. Completá la dirección real.</small>
          </label>
          <label class="new-company-form__label" :class="{ 'field-ficticio': fieldHint('numero') }">Nro puerta
            <input v-model="editForm.numero" class="field-ficticio__input new-company-form__input">
          </label>
          <label class="new-company-form__wide new-company-form__label" :class="{ 'field-ficticio': fieldHint('localidad') }">Localidad / Zona *
            <select v-model="editForm.localidad" class="new-company-select new-company-form__new-company-select new-company-form__select field-ficticio__select" required>
              <option value="" disabled>Seleccionar localidad</option>
              <option v-for="localidad in localidadOptions" :key="localidad" :value="localidad">{{ localidad }}</option>
            </select>
          </label>
          <label class="new-company-check new-company-form__label">
            <input v-model="editForm.esDirectivo" class="new-company-check__input new-company-form__input" type="checkbox">
            Es directivo
          </label>
          <fieldset v-if="editing.accesoHabilitado === false" class="new-company-form__wide socio-reset-clave admin-modal__card-fieldset new-company-form__fieldset">
            <legend class="admin-modal__card-legend new-company-form__legend socio-reset-clave__legend">Habilitar acceso</legend>
            <p class="admin-modal__card-text socio-reset-clave__text">Cuando BPS y email de cuenta sean reales, habilitá el ingreso y se envían las credenciales.</p>
            <button class="company-edit socio-reset-clave__company-edit" type="button" :disabled="accessBusy" @click="habilitarAcceso">
              {{ accessBusy ? 'Habilitando...' : 'Habilitar acceso y enviar clave' }}
            </button>
          </fieldset>
          <fieldset class="new-company-form__wide socio-reset-clave admin-modal__card-fieldset new-company-form__fieldset">
            <legend class="admin-modal__card-legend new-company-form__legend socio-reset-clave__legend">Restablecer clave provisional</legend>
            <p class="admin-modal__card-text socio-reset-clave__text">Se genera una clave temporal a partir de la razón social. El socio debe cambiarla dentro de las 24 horas desde que se le envía o se restablece; si vence, hay que generar una nueva.</p>
            <button class="company-edit socio-reset-clave__company-edit" type="button" :disabled="resetBusy" @click="resetClave">
              {{ resetBusy ? 'Generando...' : 'Generar nueva clave' }}
            </button>
            <label v-if="generatedPassword" class="new-company-form__label">Clave provisional generada
              <PasswordInput input-class="new-company-form__input" :model-value="generatedPassword" readonly autocomplete="off" />
            </label>
            <small v-if="resetHint" class="admin-modal__card-note new-company-form__note socio-reset-clave__note">{{ resetHint }}</small>
          </fieldset>
          <AppAlert v-if="editError">{{ editError }}</AppAlert>
          <footer class="new-company-form__footer">
            <button class="new-company-cancel new-company-form__footer-button" type="button" @click="closeEdit">Cancelar</button>
            <button class="new-company-submit new-company-form__footer-button" type="submit" :disabled="editBusy">
              {{ editBusy ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.company-table__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.company-table__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--t-bg-008d45);
  color: var(--t-fg-ffffff);
  font-weight: 700;
}

.socio-reset-clave {
  display: grid;
  gap: 10px;
  margin: 4px 0 0;
  padding: 14px;
  border: 1px solid var(--t-line-e1e6eb);
  border-radius: 12px;
  background: var(--t-bg-f7faf8);
}

.socio-reset-clave__legend {
  padding: 0 6px;
  color: var(--t-fg-2f3e35);
  font-size: 12px;
  font-weight: 800;
}

.socio-reset-clave__text,.socio-reset-clave__note {
  color: var(--t-fg-6a7685);
  font-size: 12px;
  font-weight: 500;
}

.socio-reset-clave__company-edit {
  justify-self: start;
}

.socio-incomplete,
.socio-no-access {
  display: inline-block;
  margin-top: 4px;
  margin-right: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.socio-incomplete {
  background: var(--t-bg-fef9c3);
  color: var(--t-fg-854d0e);
}

.socio-no-access {
  background: var(--t-bg-fff0f0);
  color: var(--t-fg-ad2c31);
}

.company-incomplete-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--t-fg-445249);
  font-size: 13px;
  font-weight: 600;
}

.field-ficticio .field-ficticio__input,
.field-ficticio .field-ficticio__select {
  border-color: var(--t-line-ca8a04) !important;
  background: var(--t-bg-fffbeb);
}

.socio-ficticios-list {
  margin: 8px 0 0;
  color: var(--t-fg-854d0e);
  font-size: 13px;
}
</style>

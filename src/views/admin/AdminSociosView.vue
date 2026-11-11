<script setup lang="ts">
import { Download, Pencil, Plus, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import ProfileAvatar from '../../components/ProfileAvatar.vue'
import PasswordInput from '../../components/PasswordInput.vue'
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

const socios = ref<SocioRecord[]>([])
const router = useRouter()
const rubros = ref<RubroOption[]>([])
const query = ref('')
const onlyIncomplete = ref(false)
const error = ref('')
const busy = ref(false)
const exporting = ref(false)

async function downloadExcel() {
  if (busy.value || exporting.value || !socios.value.length) return
  exporting.value = true
  error.value = ''
  try {
    await sociosExcelService.download([...socios.value])
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

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return socios.value.filter((socio) => {
    const incomplete = (socio.camposFicticios?.length ?? 0) > 0 || socio.accesoHabilitado === false
    if (onlyIncomplete.value && !incomplete) return false
    if (!term) return true
    return [
      socio.razonSocial,
      socio.cedula,
      socio.bps,
      socio.rut,
      socio.nombreRubro,
      socio.emailUsuario,
      socio.emailContacto,
    ].some((value) => (value ?? '').toLowerCase().includes(term))
  })
})

onMounted(async () => {
  busy.value = true
  error.value = ''
  try {
    const [items, catalog] = await Promise.all([socioService.getSocios(), socioService.getRubros()])
    socios.value = items
    rubros.value = catalog
  } catch (exception) {
    error.value = userFacingError(exception, 'cargar el listado de socios')
  } finally {
    busy.value = false
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
  socios.value = socios.value.map((item) => (item.id === updated.id ? updated : item))
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
      <button class="cash-download" type="button" :disabled="busy || exporting || !socios.length" @click="downloadExcel">
        <Download :size="16" /> {{ exporting ? 'Descargando...' : 'Descargar Excel' }}
      </button>
      <RouterLink class="company-button company-button--outline" to="/admin/socios/importacion">
        Carga masiva
      </RouterLink>
      <RouterLink class="company-button company-button--primary" to="/admin/socios/nueva">
        <Plus :size="16" /> Nuevo Socio
      </RouterLink>
    </div>

    <section class="company-search-card">
      <label class="company-search">
        <Search :size="17" />
        <input v-model="query" aria-label="Buscar socios por razón social, RUT, cédula o rubro" placeholder="Buscar por razón social, RUT / Cédula o rubro...">
      </label>
      <label class="company-incomplete-filter">
        <input v-model="onlyIncomplete" type="checkbox">
        Solo datos incompletos
      </label>
      <span>{{ filtered.length }} de {{ socios.length }} socios listados</span>
    </section>

    <AppAlert v-if="error">{{ error }}</AppAlert>
    <p v-else-if="busy" class="company-empty">Cargando socios...</p>
    <p v-else-if="!filtered.length" class="company-empty">No hay socios para mostrar.</p>

    <section v-else class="company-table-card">
      <div class="company-table-wrap">
        <table class="company-table">
          <thead>
            <tr>
              <th>Socio<br><small>BPS / Cédula</small></th>
              <th>RUT / Cédula</th>
              <th>Rubro</th>
              <th>Estado</th>
              <th>Directivo</th>
              <th>Alta</th>
              <th>Baja</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="socio in filtered" :key="socio.id">
              <td>
                <div class="company-table__identity">
                  <ProfileAvatar
                    class="company-table__avatar"
                    :src="socio.fotoUrl"
                    :initials="socio.razonSocial.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()"
                  />
                  <div class="company-table__name">
                    <strong>{{ socio.razonSocial }}</strong>
                    <small>{{ adminIdentificadorLabel(socio) }}</small>
                    <span v-if="(socio.camposFicticios?.length ?? 0) > 0" class="socio-incomplete">Datos incompletos</span>
                    <span v-if="socio.importadoMasivo && socio.accesoHabilitado === false" class="socio-no-access">Sin acceso</span>
                    <small v-if="socio.emailUsuario">Cuenta: {{ socio.emailUsuario }}</small>
                    <small v-if="socio.emailContacto">Contacto: {{ socio.emailContacto }}</small>
                  </div>
                </div>
              </td>
              <td>{{ socio.rut || '—' }}</td>
              <td>{{ socio.nombreRubro || '—' }}</td>
              <td>
                <span class="cash-status" :class="`cash-status--${estadoMorosidadTone(socio.estadoMorosidad)}`">
                  <i />{{ estadoMorosidadLabel[socio.estadoMorosidad] }}
                </span>
              </td>
              <td>{{ socio.esDirectivo ? 'Sí' : 'No' }}</td>
              <td>{{ formatDate(socio.fechaAlta) }}</td>
              <td>{{ formatDate(socio.fechaBaja) }}</td>
              <td>
                <button
                  class="company-toggle"
                  :class="{ 'company-toggle--on': socio.activo }"
                  type="button"
                  :aria-label="socio.activo ? 'Dar de baja al socio' : 'Reactivar socio'"
                  @click="toggleActive(socio)"
                >
                  <i />
                </button>
              </td>
              <td>
                <button class="company-edit" type="button" @click="openEdit(socio)">
                  <Pencil :size="12" /> Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="editing" class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-socio-title">
      <button class="admin-modal__backdrop" type="button" aria-label="Cerrar" @click="closeEdit" />
      <section class="new-company-card admin-modal__card">
        <header class="new-company-card__header">
          <h2 id="edit-socio-title">Editar socio</h2>
          <p v-if="!editing.importadoMasivo">El identificador de acceso (BPS o cédula) y el email de cuenta no se cambian aquí.</p>
          <p v-else>Los campos en amarillo son datos provisionales de la carga masiva. Reemplazalos por el dato real.</p>
          <p v-if="labelsCamposFicticios(editing.camposFicticios).length" class="socio-ficticios-list">
            Provisionales: {{ labelsCamposFicticios(editing.camposFicticios).join(', ') }}
          </p>
        </header>
        <form class="new-company-form" @submit.prevent="saveEdit">
          <label class="new-company-form__wide">Razón social *
            <input v-model="editForm.razonSocial" required>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('bps') }">Identificador de acceso
            <input v-if="fieldHint('bps')" v-model="editForm.bps" inputmode="numeric" placeholder="BPS real (mín. 9 dígitos)">
            <input v-else :value="adminIdentificadorLabel(editing)" readonly>
            <small v-if="fieldHint('bps')">Dato provisional. Completá el BPS real.</small>
            <small v-else>Se define solo en el alta: BPS o cédula, no ambos.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('rut') }">RUT o cédula *
            <input v-model="editForm.rut" inputmode="numeric" required placeholder="RUT (12 dígitos) o cédula (8 dígitos)">
            <small v-if="fieldHint('rut')">Dato provisional. Completá el RUT o cédula real.</small>
            <small v-else>Si no tiene RUT, va la cédula.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('telefono') }">Teléfono *
            <input v-model="editForm.telefono" required>
            <small v-if="fieldHint('telefono')">Dato provisional. Completá el teléfono real.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('emailUsuario') }">Email de cuenta
            <input v-if="fieldHint('emailUsuario')" v-model="editForm.emailUsuario" type="email" placeholder="cuenta@empresa.com">
            <input v-else :value="editing.emailUsuario || ''" type="email" readonly>
            <small v-if="fieldHint('emailUsuario')">Dato provisional. Completá el email real de la cuenta.</small>
            <small v-else>Con este correo se registró el usuario.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('emailContacto') }">Email de contacto
            <input v-model="editForm.emailContacto" type="email" placeholder="contacto@empresa.com">
            <small v-if="fieldHint('emailContacto')">Dato provisional. Completá el email de contacto real.</small>
            <small v-else>Con este correo se contacta a la firma. Puede ser el mismo u otro.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('fechaAlta') }">Fecha de alta en el CCISJ
            <input v-model="editForm.fechaAlta" type="date">
            <small v-if="fieldHint('fechaAlta')">Fecha provisional. Completá la fecha de afiliación real.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('fechaAniversario') }">Fecha de aniversario *
            <input v-model="editForm.fechaAniversario" type="date" required>
            <small v-if="fieldHint('fechaAniversario')">Fecha provisional (vino vacía en el Excel).</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('rubro') }">Rubro *
            <select v-model="editForm.rubroId" class="new-company-select" required>
              <option value="" disabled>Seleccionar rubro</option>
              <option v-for="rubro in rubros" :key="rubro.id" :value="String(rubro.id)">{{ rubro.nombreRubro }}</option>
            </select>
          </label>
          <label>Estado de cuenta
            <select v-model="editForm.estadoMorosidad" class="new-company-select">
              <option value="AL_DIA">Al día</option>
              <option value="MOROSO">Moroso</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('calle') }">Calle *
            <input v-model="editForm.calle" required>
            <small v-if="fieldHint('calle')">Dato provisional. Completá la dirección real.</small>
          </label>
          <label :class="{ 'field-ficticio': fieldHint('numero') }">Nro puerta
            <input v-model="editForm.numero">
          </label>
          <label class="new-company-form__wide" :class="{ 'field-ficticio': fieldHint('localidad') }">Localidad / Zona *
            <select v-model="editForm.localidad" class="new-company-select" required>
              <option value="" disabled>Seleccionar localidad</option>
              <option v-for="localidad in localidadOptions" :key="localidad" :value="localidad">{{ localidad }}</option>
            </select>
          </label>
          <label class="new-company-check">
            <input v-model="editForm.esDirectivo" type="checkbox">
            Es directivo
          </label>
          <fieldset v-if="editing.accesoHabilitado === false" class="new-company-form__wide socio-reset-clave">
            <legend>Habilitar acceso</legend>
            <p>Cuando BPS y email de cuenta sean reales, habilitá el ingreso y se envían las credenciales.</p>
            <button class="company-edit" type="button" :disabled="accessBusy" @click="habilitarAcceso">
              {{ accessBusy ? 'Habilitando...' : 'Habilitar acceso y enviar clave' }}
            </button>
          </fieldset>
          <fieldset class="new-company-form__wide socio-reset-clave">
            <legend>Restablecer clave provisional</legend>
            <p>Se genera una clave temporal a partir de la razón social. El socio debe cambiarla dentro de las 24 horas desde que se le envía o se restablece; si vence, hay que generar una nueva.</p>
            <button class="company-edit" type="button" :disabled="resetBusy" @click="resetClave">
              {{ resetBusy ? 'Generando...' : 'Generar nueva clave' }}
            </button>
            <label v-if="generatedPassword">Clave provisional generada
              <PasswordInput :model-value="generatedPassword" readonly autocomplete="off" />
            </label>
            <small v-if="resetHint">{{ resetHint }}</small>
          </fieldset>
          <AppAlert v-if="editError">{{ editError }}</AppAlert>
          <footer class="new-company-form__footer">
            <button class="new-company-cancel" type="button" @click="closeEdit">Cancelar</button>
            <button class="new-company-submit" type="submit" :disabled="editBusy">
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
  background: #008d45;
  color: #fff;
  font-weight: 700;
}

.socio-reset-clave {
  display: grid;
  gap: 10px;
  margin: 4px 0 0;
  padding: 14px;
  border: 1px solid #e1e6eb;
  border-radius: 12px;
  background: #f7faf8;
}

.socio-reset-clave legend {
  padding: 0 6px;
  color: #2f3e35;
  font-size: 12px;
  font-weight: 800;
}

.socio-reset-clave p,
.socio-reset-clave small {
  color: #6a7685;
  font-size: 12px;
  font-weight: 500;
}

.socio-reset-clave .company-edit {
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
  background: #fef9c3;
  color: #854d0e;
}

.socio-no-access {
  background: #fff0f0;
  color: #ad2c31;
}

.company-incomplete-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #445249;
  font-size: 13px;
  font-weight: 600;
}

.field-ficticio input,
.field-ficticio select {
  border-color: #ca8a04 !important;
  background: #fffbeb;
}

.socio-ficticios-list {
  margin: 8px 0 0;
  color: #854d0e;
  font-size: 13px;
}
</style>

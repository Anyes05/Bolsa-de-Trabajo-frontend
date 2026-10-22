<script setup lang="ts">
import { Pencil, Plus, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import PasswordInput from '../../components/PasswordInput.vue'
import {
  estadoMorosidadLabel,
  estadoMorosidadTone,
  socioService,
} from '../../services/socioService'
import type { EstadoMorosidad, RubroOption, SocioRecord } from '../../services/types'

const socios = ref<SocioRecord[]>([])
const rubros = ref<RubroOption[]>([])
const query = ref('')
const error = ref('')
const busy = ref(false)
const editing = ref<SocioRecord | null>(null)
const editError = ref('')
const editBusy = ref(false)
const resetBusy = ref(false)
const resetHint = ref('')
const generatedPassword = ref('')
const editForm = reactive({
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
  if (!term) return socios.value
  return socios.value.filter((socio) => [
    socio.razonSocial,
    socio.cedula,
    socio.rut,
    socio.nombreRubro,
    socio.emailUsuario,
    socio.emailContacto,
  ].some((value) => (value ?? '').toLowerCase().includes(term)))
})

onMounted(async () => {
  busy.value = true
  error.value = ''
  try {
    const [items, catalog] = await Promise.all([socioService.getSocios(), socioService.getRubros()])
    socios.value = items
    rubros.value = catalog
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar los socios.'
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

function adminIdentificadorLabel(socio: SocioRecord) {
  if (socio.cedula) return `Cédula ${socio.cedula}`
  if (socio.rut) return `RUT ${socio.rut}`
  return 'Sin identificador'
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function openEdit(socio: SocioRecord) {
  editing.value = socio
  editError.value = ''
  resetHint.value = ''
  generatedPassword.value = ''
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
  if (!editForm.rubroId) {
    editError.value = 'Selecciona un rubro.'
    return
  }
  editBusy.value = true
  editError.value = ''
  try {
    const updated = await socioService.updateSocio(editing.value.id, {
      razonSocial: editForm.razonSocial.trim(),
      rut: editForm.rut.trim(),
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
    editError.value = exception instanceof Error ? exception.message : 'No fue posible guardar el socio.'
  } finally {
    editBusy.value = false
  }
}

async function toggleActive(socio: SocioRecord) {
  error.value = ''
  try {
    const updated = socio.activo
      ? await socioService.deleteSocio(socio.id)
      : await socioService.activateSocio(socio.id)
    replaceSocio(updated)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible actualizar el estado.'
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
    editError.value = exception instanceof Error ? exception.message : 'No fue posible restablecer la clave.'
  } finally {
    resetBusy.value = false
  }
}
</script>

<template>
  <AdminShell active="socios" title="Gestión de Socios" subtitle="Listado general y altas del padrón">
    <div class="company-actions">
      <RouterLink class="company-button company-button--primary" to="/admin/socios/nueva">
        <Plus :size="16" /> Nuevo Socio
      </RouterLink>
    </div>

    <section class="company-search-card">
      <label class="company-search">
        <Search :size="17" />
        <input v-model="query" placeholder="Buscar por razón social, RUT, cédula o rubro...">
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
              <th>Socio<br><small>RUT / Cédula</small></th>
              <th>BPS</th>
              <th>Rubro</th>
              <th>Estado</th>
              <th>Directivo</th>
              <th>Alta</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="socio in filtered" :key="socio.id">
              <td class="company-table__name">
                <strong>{{ socio.razonSocial }}</strong>
                <small>{{ adminIdentificadorLabel(socio) }}</small>
                <small v-if="socio.emailUsuario">Cuenta: {{ socio.emailUsuario }}</small>
                <small v-if="socio.emailContacto">Contacto: {{ socio.emailContacto }}</small>
              </td>
              <td>{{ socio.bps || '—' }}</td>
              <td>{{ socio.nombreRubro || '—' }}</td>
              <td>
                <span class="cash-status" :class="`cash-status--${estadoMorosidadTone(socio.estadoMorosidad)}`">
                  <i />{{ estadoMorosidadLabel[socio.estadoMorosidad] }}
                </span>
              </td>
              <td>{{ socio.esDirectivo ? 'Sí' : 'No' }}</td>
              <td>{{ formatDate(socio.fechaAlta) }}</td>
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
          <p>El identificador de acceso (RUT o cédula) y el email de cuenta no se cambian aquí.</p>
        </header>
        <form class="new-company-form" @submit.prevent="saveEdit">
          <label class="new-company-form__wide">Razón social *
            <input v-model="editForm.razonSocial" required>
          </label>
          <label>Identificador de acceso
            <input :value="adminIdentificadorLabel(editing)" readonly>
            <small>Se define solo en el alta: RUT o cédula, no ambos.</small>
          </label>
          <label>RUT *
            <input v-model="editForm.rut" required>
          </label>
          <label>Teléfono
            <input v-model="editForm.telefono">
          </label>
          <label>Email de cuenta
            <input :value="editing.emailUsuario || ''" type="email" readonly>
            <small>Con este correo se registró el usuario.</small>
          </label>
          <label>Email de contacto
            <input v-model="editForm.emailContacto" type="email" placeholder="contacto@empresa.com">
            <small>Con este correo se contacta a la firma. Puede ser el mismo u otro.</small>
          </label>
          <label>Fecha de alta en el CCISJ
            <input v-model="editForm.fechaAlta" type="date">
          </label>
          <label>Fecha de aniversario
            <input v-model="editForm.fechaAniversario" type="date">
          </label>
          <label>Rubro *
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
          <label>Calle *
            <input v-model="editForm.calle" required>
          </label>
          <label>Nro puerta
            <input v-model="editForm.numero">
          </label>
          <label class="new-company-form__wide">Ciudad / Localidad *
            <input v-model="editForm.localidad" required>
          </label>
          <label class="new-company-check">
            <input v-model="editForm.esDirectivo" type="checkbox">
            Es directivo
          </label>
          <fieldset class="new-company-form__wide socio-reset-clave">
            <legend>Restablecer clave provisional</legend>
            <p>El sistema genera una nueva clave temporal a partir de la razón social. El socio deberá cambiarla en las siguientes 24 horas.</p>
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
</style>

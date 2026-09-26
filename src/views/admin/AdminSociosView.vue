<script setup lang="ts">
import { Pencil, Plus, Search } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import { estadoMorosidadLabel, estadoMorosidadTone, socioService } from '../../services/socioService'
import type { EstadoMorosidad, RubroOption, SocioRecord } from '../../services/types'

const socios = ref<SocioRecord[]>([])
const rubros = ref<RubroOption[]>([])
const query = ref('')
const error = ref('')
const busy = ref(false)
const editing = ref<SocioRecord | null>(null)
const editError = ref('')
const editBusy = ref(false)
const editForm = reactive({
  razonSocial: '',
  rut: '',
  giro: '',
  telefono: '',
  emailContacto: '',
  calle: '',
  numero: '',
  localidad: '',
  rubroId: '',
  esDirectivo: false,
  fechaAniversario: '',
  estadoMorosidad: 'AL_DIA' as EstadoMorosidad,
})

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return socios.value
  return socios.value.filter((socio) => [
    socio.razonSocial,
    socio.bps,
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

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function openEdit(socio: SocioRecord) {
  editing.value = socio
  editError.value = ''
  editForm.razonSocial = socio.razonSocial ?? ''
  editForm.rut = socio.rut ?? ''
  editForm.giro = socio.giro ?? ''
  editForm.telefono = socio.telefono ?? ''
  editForm.emailContacto = socio.emailContacto ?? ''
  editForm.calle = socio.calle ?? ''
  editForm.numero = socio.numero ?? ''
  editForm.localidad = socio.localidad ?? ''
  editForm.rubroId = socio.rubroId != null ? String(socio.rubroId) : ''
  editForm.esDirectivo = socio.esDirectivo
  editForm.fechaAniversario = socio.fechaAniversario?.slice(0, 10) ?? ''
  editForm.estadoMorosidad = socio.estadoMorosidad
}

function closeEdit() {
  editing.value = null
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
      giro: emptyToNull(editForm.giro),
      telefono: emptyToNull(editForm.telefono),
      emailContacto: emptyToNull(editForm.emailContacto),
      calle: editForm.calle.trim(),
      numero: emptyToNull(editForm.numero),
      localidad: editForm.localidad.trim(),
      rubroId: Number(editForm.rubroId),
      esDirectivo: editForm.esDirectivo,
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
        <input v-model="query" placeholder="Buscar por razón social, RUT, BPS o rubro...">
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
              <th>Socio<br><small>BPS</small></th>
              <th>RUT</th>
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
                <small>{{ socio.bps || 'Sin BPS' }}</small>
                <small v-if="socio.emailUsuario">Cuenta: {{ socio.emailUsuario }}</small>
                <small v-if="socio.emailContacto">Contacto: {{ socio.emailContacto }}</small>
              </td>
              <td>{{ socio.rut || '—' }}</td>
              <td>{{ socio.nombreRubro || socio.giro || '—' }}</td>
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
          <p>BPS y email de cuenta no se cambian aquí. El de contacto puede ser el mismo u otro.</p>
        </header>
        <form class="new-company-form" @submit.prevent="saveEdit">
          <label class="new-company-form__wide">Razón social *
            <input v-model="editForm.razonSocial" required>
          </label>
          <label>RUT *
            <input v-model="editForm.rut" required>
          </label>
          <label>Giro
            <input v-model="editForm.giro">
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
              <option value="DEUDA_A_VENCER">Deuda a vencer</option>
              <option value="DEUDA_VENCIDA">Deuda vencida</option>
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

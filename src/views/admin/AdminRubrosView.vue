<script setup lang="ts">
import { Pencil, Plus, Search, Tags } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import AdminShell from '../../components/admin/AdminShell.vue'
import AppAlert from '../../components/AppAlert.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import { useServerList } from '../../composables/useServerList'
import { emptyPage } from '../../services/pagination'
import { rubroService, type RubroAdmin, type RubroPage } from '../../services/rubroService'
import { userFacingError } from '../../utils/userMessage'

const query = ref('')
const error = ref('')
const formBusy = ref(false)
const formError = ref('')
const showForm = ref(false)
const editing = ref<RubroAdmin | null>(null)
const form = reactive({ nombreRubro: '' })

// Búsqueda y paginación: las resuelve el backend.
const listado = useServerList<RubroPage>({
  fetch: (page) => rubroService.list({ incluirInactivos: true, q: query.value, page }),
  search: query,
  initial: { pagina: emptyPage(), activos: 0 },
  onError: (exception) => { error.value = userFacingError(exception, 'cargar los rubros') },
})
const filtered = computed(() => listado.data.value.pagina.content)
const activos = computed(() => listado.data.value.activos)
const busy = computed(() => listado.loading.value)

onMounted(load)

function load(page = listado.page.value) {
  error.value = ''
  return listado.load(page)
}

function openCreate() {
  editing.value = null
  form.nombreRubro = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(rubro: RubroAdmin) {
  editing.value = rubro
  form.nombreRubro = rubro.nombreRubro
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editing.value = null
  form.nombreRubro = ''
  formError.value = ''
}

async function save() {
  const nombre = form.nombreRubro.trim()
  if (!nombre) {
    formError.value = 'Ingresa el nombre del rubro.'
    return
  }
  formBusy.value = true
  formError.value = ''
  try {
    if (editing.value) await rubroService.update(editing.value.id, nombre)
    else await rubroService.create(nombre)
    closeForm()
    // El orden y la página los define el servidor: se recarga la página actual.
    await load()
  } catch (exception) {
    formError.value = userFacingError(exception, 'guardar el rubro')
  } finally {
    formBusy.value = false
  }
}

async function toggleActivo(rubro: RubroAdmin) {
  error.value = ''
  try {
    await rubroService.setActivo(rubro.id, !rubro.activo)
    await load()
  } catch (exception) {
    error.value = userFacingError(exception, 'actualizar el rubro')
  }
}
</script>

<template>
  <AdminShell active="rubros" title="Gestión de Rubros" subtitle="Catálogo usado por socios, ofertas y postulantes">
    <div class="company-actions">
      <button class="company-button company-button--primary" type="button" @click="openCreate">
        <Plus :size="16" /> Nuevo Rubro
      </button>
    </div>

    <section class="company-search-card">
      <label class="company-search">
        <Search :size="17" />
        <input v-model="query" placeholder="Buscar rubro...">
      </label>
      <span>{{ activos }} activos · {{ listado.data.value.pagina.totalElements }} listados</span>
    </section>

    <AppAlert v-if="error">{{ error }}</AppAlert>
    <p v-else-if="busy && !filtered.length" class="company-empty">Cargando rubros...</p>
    <p v-else-if="!filtered.length" class="company-empty">No hay rubros para mostrar.</p>

    <section v-else class="company-table-card">
      <div class="company-table-wrap">
        <table class="company-table">
          <thead>
            <tr>
              <th>Rubro</th>
              <th>Estado</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rubro in filtered" :key="rubro.id">
              <td class="company-table__name">
                <strong>{{ rubro.nombreRubro }}</strong>
                <small>ID {{ rubro.id }}</small>
              </td>
              <td>
                <span class="cash-status" :class="rubro.activo ? 'cash-status--green' : 'cash-status--red'">
                  <i />{{ rubro.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <button
                  class="company-toggle"
                  :class="{ 'company-toggle--on': rubro.activo }"
                  type="button"
                  :aria-label="rubro.activo ? 'Desactivar rubro' : 'Activar rubro'"
                  @click="toggleActivo(rubro)"
                >
                  <i />
                </button>
              </td>
              <td>
                <button class="company-edit" type="button" @click="openEdit(rubro)">
                  <Pencil :size="12" /> Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar
        :page="listado.page.value"
        :total-pages="listado.data.value.pagina.totalPages"
        :total-elements="listado.data.value.pagina.totalElements"
        :loading="busy"
        label="Paginación de rubros"
        @change="listado.goTo"
      />
    </section>

    <div v-if="showForm" class="admin-modal" role="dialog" aria-modal="true">
      <button class="admin-modal__backdrop" type="button" aria-label="Cerrar" @click="closeForm" />
      <section class="new-company-card admin-modal__card rubro-form-card">
        <header class="new-company-card__header">
          <h2>
            <Tags :size="18" aria-hidden="true" />
            {{ editing ? 'Editar rubro' : 'Nuevo rubro' }}
          </h2>
          <p>Este catálogo alimenta socios, ofertas laborales y perfiles de postulantes.</p>
        </header>
        <form class="new-company-form" @submit.prevent="save">
          <label class="new-company-form__wide">Nombre del rubro *
            <input v-model="form.nombreRubro" required maxlength="100" placeholder="Ej: Atención al Cliente">
          </label>
          <AppAlert v-if="formError">{{ formError }}</AppAlert>
          <footer class="new-company-form__footer">
            <button class="new-company-cancel" type="button" @click="closeForm">Cancelar</button>
            <button class="new-company-submit" type="submit" :disabled="formBusy">
              {{ formBusy ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear rubro') }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </AdminShell>
</template>

<style scoped>
.rubro-form-card {
  width: min(100%, 520px);
}

.new-company-card__header h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>

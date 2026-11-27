<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Landmark, Search } from 'lucide-vue-next'
import AppAlert from '../../components/AppAlert.vue'
import PaginationBar from '../../components/PaginationBar.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { useServerList } from '../../composables/useServerList'
import { emptyPage, type Page } from '../../services/pagination'
import { estadoMorosidadLabel } from '../../services/socioService'
import { socioDirectorioService, type DirectorioSocio } from '../../services/socioDirectorioService'
import type { EstadoMorosidad } from '../../services/types'
import { useAuthStore } from '../../stores/auth'
import { userFacingError } from '../../utils/userMessage'

const auth = useAuthStore()
const query = ref('')
const status = ref<'Todos' | EstadoMorosidad>('Todos')
const error = ref('')

const statusOptions: Array<'Todos' | EstadoMorosidad> = ['Todos', 'AL_DIA', 'MOROSO', 'INACTIVO']

// Búsqueda, estado y paginación: los resuelve el backend (que también valida que sea directivo).
const listado = useServerList<Page<DirectorioSocio>>({
  fetch: (page) => socioDirectorioService.list({
    q: query.value, estado: status.value === 'Todos' ? null : status.value, page,
  }),
  filters: [status],
  search: query,
  initial: emptyPage(),
  onError: (exception) => { error.value = userFacingError(exception, 'cargar el directorio de socios') },
})
const filtered = computed(() => listado.data.value.content)
const busy = computed(() => listado.loading.value)

const companyName = computed(() => auth.fullName || 'Socio')
const companyInitials = computed(() => (
  companyName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
))

onMounted(load)

function load() {
  error.value = ''
  return listado.load(0)
}

function statusClass(value: EstadoMorosidad) {
  if (value === 'AL_DIA') return 'socio-directory__status--ok'
  if (value === 'MOROSO') return 'socio-directory__status--pending'
  return 'socio-directory__status--inactive'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusLabel(value: EstadoMorosidad) {
  return estadoMorosidadLabel[value] ?? value
}
</script>

<template>
  <SocioShell
    active-nav="directorio"
    title="Directorio de Socios"
    subtitle="Acceso exclusivo para miembros de la Comisión Directiva"
    :company-name="companyName"
    :company-initials="companyInitials"
    company-role="SOCIO DIRECTIVO"
  >
    <section class="socio-directory">
      <div class="socio-directory__banner">
        <div>
          <h2 class="socio-directory__banner-heading">
            <Landmark :size="18" aria-hidden="true" />
            Comisión Directiva – Vista restringida
          </h2>
          <p class="socio-directory__banner-text">Como miembro directivo puedes ver el directorio de todos los socios del CCISJ, incluidos los inactivos.</p>
        </div>
        <span class="socio-directory__banner-inline">Solo directivos</span>
      </div>

      <div class="socio-directory__toolbar">
        <label class="socio-directory__search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="query" class="socio-directory__search-input" type="search" placeholder="Buscar socio, email, rubro o teléfono...">
        </label>
        <label class="socio-directory__filter">
          <span class="visually-hidden">Filtrar por estado</span>
          <select v-model="status" class="socio-directory__filter-select">
            <option v-for="option in statusOptions" :key="option" :value="option">
              {{ option === 'Todos' ? 'Todos' : statusLabel(option) }}
            </option>
          </select>
        </label>
        <span class="socio-directory__count">
          {{ listado.data.value.totalElements }} socios
        </span>
      </div>

      <AppAlert v-if="error">{{ error }}</AppAlert>
      <p v-else-if="busy && !filtered.length" class="socio-directory__empty">Cargando directorio...</p>

      <div v-else class="socio-directory__table-wrap">
        <table class="socio-directory__table">
          <thead>
            <tr>
              <th class="socio-directory__table-header-cell">Razón social</th>
              <th class="socio-directory__table-header-cell">Rubro</th>
              <th class="socio-directory__table-header-cell">Teléfono</th>
              <th class="socio-directory__table-header-cell">Email</th>
              <th class="socio-directory__table-header-cell">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filtered" :key="member.id">
              <td class="socio-directory__table-cell">
                <strong class="socio-directory__table-strong">{{ member.razonSocial }}</strong>
                <small class="socio-directory__table-note">Alta: {{ formatDate(member.fechaAlta) }}</small>
              </td>
              <td class="socio-directory__table-cell">{{ member.rubro || '—' }}</td>
              <td class="socio-directory__table-cell">{{ member.telefono || '—' }}</td>
              <td class="socio-directory__table-cell">{{ member.email || '—' }}</td>
              <td class="socio-directory__table-cell">
                <span class="socio-directory__status" :class="statusClass(member.estadoMorosidad)">
                  {{ statusLabel(member.estadoMorosidad) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!filtered.length" class="socio-directory__empty">No hay socios que coincidan con la búsqueda.</p>
        <PaginationBar
          :page="listado.page.value"
          :total-pages="listado.data.value.totalPages"
          :total-elements="listado.data.value.totalElements"
          :loading="busy"
          label="Paginación del directorio"
          @change="listado.goTo"
        />
      </div>
    </section>
  </SocioShell>
</template>

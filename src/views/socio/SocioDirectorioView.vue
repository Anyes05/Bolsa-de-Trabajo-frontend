<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Landmark, Search } from 'lucide-vue-next'
import AppAlert from '../../components/AppAlert.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import { estadoMorosidadLabel } from '../../services/socioService'
import { socioDirectorioService, type DirectorioSocio } from '../../services/socioDirectorioService'
import type { EstadoMorosidad } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const query = ref('')
const status = ref<'Todos' | EstadoMorosidad>('Todos')
const members = ref<DirectorioSocio[]>([])
const busy = ref(false)
const error = ref('')

const statusOptions: Array<'Todos' | EstadoMorosidad> = ['Todos', 'AL_DIA', 'MOROSO', 'INACTIVO']

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase()
  return members.value.filter((member) => {
    const matchesQuery = !term
      || member.razonSocial.toLowerCase().includes(term)
      || (member.email ?? '').toLowerCase().includes(term)
      || (member.rubro ?? '').toLowerCase().includes(term)
      || (member.telefono ?? '').toLowerCase().includes(term)
    const matchesStatus = status.value === 'Todos' || member.estadoMorosidad === status.value
    return matchesQuery && matchesStatus
  })
})

const companyName = computed(() => auth.fullName || 'Socio')
const companyInitials = computed(() => (
  companyName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S'
))

onMounted(load)

async function load() {
  busy.value = true
  error.value = ''
  try {
    members.value = await socioDirectorioService.list()
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'No fue posible cargar el directorio.'
  } finally {
    busy.value = false
  }
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
          <h2>
            <Landmark :size="18" aria-hidden="true" />
            Comisión Directiva – Vista restringida
          </h2>
          <p>Como miembro directivo puedes ver el directorio de socios activos del CCISJ.</p>
        </div>
        <span>Solo directivos</span>
      </div>

      <div class="socio-directory__toolbar">
        <label class="socio-directory__search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="Buscar socio, email, rubro o teléfono...">
        </label>
        <label class="socio-directory__filter">
          <span class="visually-hidden">Filtrar por estado</span>
          <select v-model="status">
            <option v-for="option in statusOptions" :key="option" :value="option">
              {{ option === 'Todos' ? 'Todos' : statusLabel(option) }}
            </option>
          </select>
        </label>
      </div>

      <AppAlert v-if="error">{{ error }}</AppAlert>
      <p v-else-if="busy" class="socio-directory__empty">Cargando directorio...</p>

      <div v-else class="socio-directory__table-wrap">
        <table class="socio-directory__table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>Rubro</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filtered" :key="member.id">
              <td>
                <strong>{{ member.razonSocial }}</strong>
                <small>Alta: {{ formatDate(member.fechaAlta) }}</small>
              </td>
              <td>{{ member.rubro || '—' }}</td>
              <td>{{ member.telefono || '—' }}</td>
              <td>{{ member.email || '—' }}</td>
              <td>
                <span class="socio-directory__status" :class="statusClass(member.estadoMorosidad)">
                  {{ statusLabel(member.estadoMorosidad) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!filtered.length" class="socio-directory__empty">No hay socios que coincidan con la búsqueda.</p>
      </div>
    </section>
  </SocioShell>
</template>

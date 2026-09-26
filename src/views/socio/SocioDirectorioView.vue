<script setup lang="ts">
import { computed, ref } from 'vue'
import { Landmark, Search } from 'lucide-vue-next'
import SocioShell from '../../components/socio/SocioShell.vue'
import { mockCompany } from '../../data/mockSocioBolsa'
import {
  mockDirectoryMembers,
  mockDirectoryStatuses,
  type DirectoryStatus,
} from '../../data/mockSocioDirectorio'

const query = ref('')
const status = ref<'Todos' | DirectoryStatus>('Todos')

const members = computed(() => {
  const term = query.value.trim().toLowerCase()
  return mockDirectoryMembers.filter((member) => {
    const matchesQuery = !term
      || member.razonSocial.toLowerCase().includes(term)
      || member.email.toLowerCase().includes(term)
      || member.rubro.toLowerCase().includes(term)
    const matchesStatus = status.value === 'Todos' || member.status === status.value
    return matchesQuery && matchesStatus
  })
})

function statusClass(value: DirectoryStatus) {
  if (value === 'Al día') return 'socio-directory__status--ok'
  if (value === 'Pendiente') return 'socio-directory__status--pending'
  return 'socio-directory__status--inactive'
}
</script>

<template>
  <SocioShell
    active-nav="directorio"
    title="Directorio de Socios"
    subtitle="Acceso exclusivo para miembros de la Comisión Directiva"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <section class="socio-directory">
      <div class="socio-directory__banner">
        <div>
          <h2>
            <Landmark :size="18" aria-hidden="true" />
            Comisión Directiva – Vista restringida
          </h2>
          <p>Como miembro directivo puedes ver el directorio completo de socios activos del CCISJ.</p>
        </div>
        <span>Solo directivos</span>
      </div>

      <div class="socio-directory__toolbar">
        <label class="socio-directory__search">
          <Search :size="16" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="Buscar socio...">
        </label>
        <label class="socio-directory__filter">
          <span class="visually-hidden">Filtrar por estado</span>
          <select v-model="status">
            <option v-for="option in mockDirectoryStatuses" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
      </div>

      <div class="socio-directory__table-wrap">
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
            <tr v-for="member in members" :key="member.id">
              <td>
                <strong>{{ member.razonSocial }}</strong>
                <small>Alta: {{ member.alta }}</small>
              </td>
              <td>{{ member.rubro }}</td>
              <td>{{ member.telefono }}</td>
              <td>{{ member.email }}</td>
              <td>
                <span class="socio-directory__status" :class="statusClass(member.status)">
                  {{ member.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!members.length" class="socio-directory__empty">No hay socios mock que coincidan con la búsqueda.</p>
      </div>
    </section>
  </SocioShell>
</template>

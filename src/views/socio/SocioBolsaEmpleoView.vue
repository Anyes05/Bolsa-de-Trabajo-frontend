<script setup lang="ts">
import { computed, ref } from 'vue'
import FilterGroup from '../../components/socio/FilterGroup.vue'
import ProfileCard from '../../components/socio/ProfileCard.vue'
import SocioShell from '../../components/socio/SocioShell.vue'
import {
  mockApplicantProfiles,
  mockCompany,
  mockRubros,
  type SortOption,
} from '../../data/mockSocioBolsa'

const rubro = ref('Todos')
const availability = ref('Todos')
const vehicle = ref('Todos')
const sortBy = ref<SortOption>('updated')

const profiles = computed(() => {
  const filtered = mockApplicantProfiles.filter((profile) => {
    const matchesRubro = rubro.value === 'Todos' || profile.sectors.includes(rubro.value)
    const matchesAvailability = availability.value === 'Todos'
      || (availability.value === 'Full-time' && profile.availability === 'FULL_TIME')
      || (availability.value === 'Part-time' && profile.availability === 'PART_TIME')
    const matchesVehicle = vehicle.value === 'Todos'
      || (vehicle.value === 'Con vehiculo' && profile.hasVehicle)
      || (vehicle.value === 'Sin vehiculo' && !profile.hasVehicle)
    return matchesRubro && matchesAvailability && matchesVehicle
  })

  return [...filtered].sort((left, right) => {
    if (sortBy.value === 'name') return left.fullName.localeCompare(right.fullName, 'es')
    return right.updatedAt.localeCompare(left.updatedAt)
  })
})
</script>

<template>
  <SocioShell
    title="Bolsa de Empleo Digital"
    subtitle="Explora perfiles laborales listos para incorporarse"
    :company-name="mockCompany.name"
    :company-initials="mockCompany.initials"
    :company-role="mockCompany.roleLabel"
  >
    <div class="bolsa">
      <aside class="bolsa__filters" aria-label="Filtros de perfiles">
        <FilterGroup v-model="rubro" legend="Rubro laboral" :options="mockRubros" />
        <FilterGroup v-model="availability" legend="Disponibilidad" :options="['Todos', 'Full-time', 'Part-time']" />
        <FilterGroup v-model="vehicle" legend="Vehiculo" :options="['Todos', 'Con vehiculo', 'Sin vehiculo']" />
      </aside>

      <section class="bolsa__results" aria-labelledby="bolsa-results-title">
        <header class="bolsa__toolbar">
          <h2 id="bolsa-results-title" class="bolsa__count">
            Resultados: <b>{{ profiles.length }} perfiles activos en San Jose</b>
          </h2>
          <label class="bolsa__sort">
            Ordenar por:
            <select v-model="sortBy">
              <option value="updated">Ultima actualizacion</option>
              <option value="name">Nombre</option>
            </select>
          </label>
        </header>

        <div v-if="profiles.length" class="bolsa__grid">
          <ProfileCard v-for="profile in profiles" :key="profile.id" :profile="profile" />
        </div>
        <p v-else class="bolsa__empty">No hay perfiles mock que coincidan con los filtros.</p>
      </section>
    </div>
  </SocioShell>
</template>

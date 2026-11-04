<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'

defineProps<{
  sectorOptions: string[]
  availabilityOptions: string[]
  loading: boolean
  hasFilters: boolean
}>()
defineEmits<{ clear: [] }>()
const search = defineModel<string>('search', { required: true })
const selectedSector = defineModel<string>('selectedSector', { required: true })
const selectedAvailability = defineModel<string>('selectedAvailability', { required: true })
const selectedLicense = defineModel<string>('selectedLicense', { required: true })
</script>

<template>
  <div class="applicant-toolbar admin-applicant-filters" role="search" aria-label="Buscar y filtrar postulantes">
    <label class="applicant-search">
      <Search :size="17" />
      <input v-model="search" aria-label="Buscar por nombre, correo, cédula o perfil" placeholder="Buscar por nombre, correo, cédula o perfil...">
    </label>
    <label class="admin-applicant-filter">Rubro
      <select v-model="selectedSector" :disabled="loading">
        <option value="">Todos los rubros</option>
        <option v-for="sector in sectorOptions" :key="sector" :value="sector">{{ sector }}</option>
      </select>
    </label>
    <label class="admin-applicant-filter">Disponibilidad
      <select v-model="selectedAvailability" :disabled="loading">
        <option value="">Todas las disponibilidades</option>
        <option v-for="availability in availabilityOptions" :key="availability" :value="availability">{{ availability }}</option>
      </select>
    </label>
    <label class="admin-applicant-filter">Libreta
      <select v-model="selectedLicense" :disabled="loading">
        <option value="">Todos</option>
        <option value="yes">Tiene libreta</option>
        <option value="no">No tiene libreta</option>
      </select>
    </label>
    <button class="admin-applicant-clear" type="button" title="Limpiar búsqueda y filtros" aria-label="Limpiar búsqueda y filtros" :disabled="!hasFilters" @click="$emit('clear')"><X :size="17" /></button>
  </div>
</template>

<style scoped>
.applicant-toolbar.admin-applicant-filters { display: flex; flex-wrap: wrap; align-items: flex-end !important; gap: 12px; }
.admin-applicant-filters .applicant-search { flex: 2 1 260px; min-width: 0; height: 40px; margin: 0; box-sizing: border-box; }
.admin-applicant-filter { display: grid; flex: 1 1 170px; min-width: 0; gap: 6px; color: #526159; font-size: 12px; font-weight: 600; }
.admin-applicant-filter select { width: 100%; min-width: 0; height: 40px; padding: 0 10px; border: 1px solid #dfe5eb; border-radius: 6px; background: #fff; color: #34473b; font-family: var(--font-family); font-size: var(--text-md); font-weight: 400; text-overflow: ellipsis; }
.admin-applicant-clear { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px; padding: 0; border: 1px solid #dfe5eb; border-radius: 6px; background: #fff; color: #526159; cursor: pointer; }
.admin-applicant-filter select:focus-visible, .admin-applicant-clear:focus-visible { outline: 2px solid #07974e; outline-offset: 2px; }
.admin-applicant-clear:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 650px) {
  .applicant-toolbar.admin-applicant-filters { flex-direction: row; }
  .admin-applicant-filters .applicant-search { flex-basis: 100%; }
}
</style>

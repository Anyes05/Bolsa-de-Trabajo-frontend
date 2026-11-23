import { computed, ref } from 'vue'
import type { ApplicantFilterParams } from '../services/pagination'

/**
 * Estado de los filtros de la bolsa de postulantes. No filtra: arma los parámetros que se envían
 * al servidor, que es quien busca, filtra y pagina.
 */
export function useApplicantFilters() {
  const search = ref('')
  const selectedSector = ref('')
  const selectedAvailability = ref('')
  const selectedLicense = ref<'' | 'yes' | 'no'>('')
  const hasFilters = computed(() => !!search.value || !!selectedSector.value
    || !!selectedAvailability.value || !!selectedLicense.value)

  function clearFilters() {
    search.value = ''
    selectedSector.value = ''
    selectedAvailability.value = ''
    selectedLicense.value = ''
  }

  function params(): ApplicantFilterParams {
    return {
      q: search.value,
      rubro: selectedSector.value,
      disponibilidad: selectedAvailability.value,
      libreta: selectedLicense.value,
    }
  }

  return {
    search, selectedSector, selectedAvailability, selectedLicense,
    /** Filtros no textuales: recargan al instante. La búsqueda va con debounce. */
    selectFilters: [selectedSector, selectedAvailability, selectedLicense],
    hasFilters, clearFilters, params,
  }
}

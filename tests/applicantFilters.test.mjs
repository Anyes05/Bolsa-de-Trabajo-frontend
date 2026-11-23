import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useApplicantFilters } from '../src/composables/useApplicantFilters.ts'

// La búsqueda, los filtros y la paginación de perfiles se resuelven en el servidor
// (ApplicantListing en el backend). El composable solo guarda el estado de los filtros
// y arma los parámetros que se envían a la API.

test('starts without filters and sends empty parameters', () => {
  const filters = useApplicantFilters()
  assert.equal(filters.hasFilters.value, false)
  assert.deepEqual(filters.params(), { q: '', rubro: '', disponibilidad: '', libreta: '' })
})

test('maps every selected filter to its server parameter without altering the search text', () => {
  const filters = useApplicantFilters()
  filters.search.value = '  ANA PÉREZ  '
  filters.selectedSector.value = 'Ventas'
  filters.selectedAvailability.value = 'PART_TIME'
  filters.selectedLicense.value = 'no'
  assert.deepEqual(filters.params(), { q: '  ANA PÉREZ  ', rubro: 'Ventas', disponibilidad: 'PART_TIME', libreta: 'no' })
})

test('any single filter counts as an active filter', () => {
  for (const field of ['search', 'selectedSector', 'selectedAvailability', 'selectedLicense']) {
    const filters = useApplicantFilters()
    filters[field].value = field === 'selectedLicense' ? 'yes' : 'x'
    assert.equal(filters.hasFilters.value, true, field)
  }
})

test('exposes only the non-text filters for immediate reload (search is debounced)', () => {
  const filters = useApplicantFilters()
  assert.deepEqual(filters.selectFilters, [filters.selectedSector, filters.selectedAvailability, filters.selectedLicense])
  assert.equal(filters.selectFilters.includes(filters.search), false)
})

test('clearing resets every filter and the parameters', () => {
  const filters = useApplicantFilters()
  filters.search.value = 'Ana'
  filters.selectedSector.value = 'Ventas'
  filters.selectedAvailability.value = 'FULL_TIME'
  filters.selectedLicense.value = 'yes'
  filters.clearFilters()
  assert.equal(filters.hasFilters.value, false)
  assert.deepEqual(filters.params(), { q: '', rubro: '', disponibilidad: '', libreta: '' })
})

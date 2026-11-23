import { describe, expect, it } from 'vitest'
import { useApplicantFilters } from './useApplicantFilters'

// La búsqueda y los filtros de perfiles se resuelven en el backend (ApplicantListing);
// el composable solo mantiene el estado y arma los parámetros.
describe('applicant profile filters', () => {
  it('builds the server parameters from the selected filters', () => {
    const filters = useApplicantFilters()
    expect(filters.params()).toEqual({ q: '', rubro: '', disponibilidad: '', libreta: '' })

    filters.search.value = ' pérez '
    filters.selectedSector.value = 'Ventas'
    filters.selectedAvailability.value = 'FULL_TIME'
    filters.selectedLicense.value = 'yes'

    expect(filters.hasFilters.value).toBe(true)
    expect(filters.params()).toEqual({ q: ' pérez ', rubro: 'Ventas', disponibilidad: 'FULL_TIME', libreta: 'yes' })
  })

  it('exposes the non-text filters so the view reloads immediately when they change', () => {
    const filters = useApplicantFilters()
    expect(filters.selectFilters).toEqual([filters.selectedSector, filters.selectedAvailability, filters.selectedLicense])
  })

  it('clears every filter', () => {
    const filters = useApplicantFilters()
    filters.search.value = 'missing'
    filters.selectedSector.value = 'Ventas'
    filters.selectedAvailability.value = 'PART_TIME'
    filters.selectedLicense.value = 'no'

    filters.clearFilters()

    expect(filters.hasFilters.value).toBe(false)
    expect([
      filters.search.value,
      filters.selectedSector.value,
      filters.selectedAvailability.value,
      filters.selectedLicense.value,
    ]).toEqual(['', '', '', ''])
  })
})

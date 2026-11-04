import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ref } from 'vue'
import { useApplicantFilters } from '../src/composables/useApplicantFilters.ts'

function setup() {
  const source = ref([
    { id: '1', applicantId: 1, fullName: 'Ana Pérez', email: 'ana@example.test', phone: '091234567', identityCard: '12345678', profileName: 'Ventas', sectors: ['Ventas'], availability: 'FULL_TIME', license: ' A ' },
    { id: '2', applicantId: 1, fullName: 'Ana Pérez', email: 'ana@example.test', phone: '091234567', identityCard: '12345678', profileName: 'Caja', sectors: ['Comercio'], availability: 'PART_TIME', license: 'Sin libreta' },
    { id: '3', applicantId: 2, fullName: 'Joel', email: 'joel@example.test', phone: '', identityCard: '87654321', profileName: 'Reparto', sectors: ['Logistica', 'Ventas'], availability: 'INDEFINIDO', license: 'No informada' },
  ])
  return { source, ...useApplicantFilters(source) }
}

test('search matches every admin field, ignoring case and outer whitespace', () => {
  const filters = setup()
  for (const term of ['  ANA PÉREZ  ', 'ANA@EXAMPLE.TEST', '091234567', '12345678']) {
    filters.search.value = term
    assert.deepEqual(filters.filteredProfiles.value.map((profile) => profile.id), ['1', '2'])
  }
  filters.search.value = 'cAjA'
  assert.deepEqual(filters.filteredProfiles.value.map((profile) => profile.id), ['2'])
  filters.search.value = 'missing'
  assert.equal(filters.filteredProfiles.value.length, 0)
})

test('combines filters on the same profile, not across profiles of one applicant', () => {
  const filters = setup()
  filters.search.value = 'Ana'
  filters.selectedSector.value = 'Ventas'
  filters.selectedAvailability.value = 'PART_TIME'
  assert.equal(filters.filteredProfiles.value.length, 0)
  filters.selectedAvailability.value = 'FULL_TIME'
  filters.selectedLicense.value = 'yes'
  assert.deepEqual(filters.filteredProfiles.value.map((profile) => profile.id), ['1'])
  filters.selectedLicense.value = 'no'
  assert.equal(filters.filteredProfiles.value.length, 0)
})

test('matches admin license classification including unknown and negative values', () => {
  const filters = setup()
  for (const license of ['', 'no', 'sin libreta', 'no tiene', 'no tiene libreta', 'no informada']) {
    filters.source.value[0].license = ` ${license.toUpperCase()} `
    filters.selectedLicense.value = 'no'
    assert.equal(filters.filteredProfiles.value.length, 3)
    filters.selectedLicense.value = 'yes'
    assert.equal(filters.filteredProfiles.value.length, 0)
  }
  filters.source.value[0].license = 'B'
  assert.deepEqual(filters.filteredProfiles.value.map((profile) => profile.id), ['1'])
})

test('generates sorted unique options and includes unrestricted availability', () => {
  const filters = setup()
  assert.deepEqual(filters.sectorOptions.value, ['Comercio', 'Logistica', 'Ventas'])
  assert.deepEqual(filters.availabilityOptions.value, ['FULL_TIME', 'INDEFINIDO', 'PART_TIME'])
  filters.selectedAvailability.value = 'INDEFINIDO'
  assert.deepEqual(filters.filteredProfiles.value.map((profile) => profile.id), ['3'])
  filters.source.value = []
  assert.deepEqual(filters.sectorOptions.value, [])
  assert.deepEqual(filters.filteredProfiles.value, [])
})

test('clearing resets every filter and restores all profiles', () => {
  const filters = setup()
  assert.equal(filters.hasFilters.value, false)
  filters.search.value = 'Ana'
  filters.selectedSector.value = 'Ventas'
  filters.selectedAvailability.value = 'FULL_TIME'
  filters.selectedLicense.value = 'yes'
  assert.equal(filters.hasFilters.value, true)
  filters.clearFilters()
  assert.equal(filters.hasFilters.value, false)
  assert.deepEqual(
    [filters.search.value, filters.selectedSector.value, filters.selectedAvailability.value, filters.selectedLicense.value],
    ['', '', '', ''],
  )
  assert.equal(filters.filteredProfiles.value.length, 3)
})

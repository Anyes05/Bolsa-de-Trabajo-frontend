import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import type { MockApplicantProfile } from '../data/mockSocioBolsa'
import { useApplicantFilters } from './useApplicantFilters'

function profile(overrides: Partial<MockApplicantProfile>): MockApplicantProfile {
  return {
    id: '1',
    applicantId: 1,
    fullName: 'Ana Pérez',
    email: 'ana@example.test',
    phone: '099 111 222',
    initials: 'AP',
    profileName: 'Administración',
    categoryLabel: 'Administración',
    location: 'San José',
    identityCard: '1.234.567-8',
    age: 30,
    tags: [],
    sectors: ['Ventas'],
    interests: [],
    availability: 'FULL_TIME',
    license: 'Categoría A',
    hasVehicle: false,
    experienceSummary: '',
    latestJob: '',
    cvFileName: 'cv.pdf',
    cvMeta: '',
    updatedAt: '2026-11-20',
    ...overrides,
  }
}

describe('applicant profile filters', () => {
  it('derives unique sorted options and reacts when the profile list changes', () => {
    const profiles = ref([
      profile({ id: '1', sectors: ['Ventas', 'Administración'], availability: 'PART_TIME' }),
      profile({ id: '2', sectors: ['Ventas', ''], availability: 'FULL_TIME' }),
    ])
    const filters = useApplicantFilters(profiles)

    expect(filters.sectorOptions.value).toEqual(['Administración', 'Ventas'])
    expect(filters.availabilityOptions.value).toEqual(['FULL_TIME', 'PART_TIME'])

    profiles.value.push(profile({
      id: '3',
      sectors: ['Construcción'],
      availability: 'INDEFINIDO',
    }))
    expect(filters.sectorOptions.value).toEqual(['Administración', 'Construcción', 'Ventas'])
    expect(filters.availabilityOptions.value).toEqual(['FULL_TIME', 'INDEFINIDO', 'PART_TIME'])
  })

  it.each([
    ['pérez', ['1']],
    ['OTRO@EXAMPLE.TEST', ['2']],
    ['098 000', ['2']],
    ['2.345', ['2']],
    ['soldadura', ['2']],
  ])('searches normalized applicant fields for %s', (term, expectedIds) => {
    const profiles = ref([
      profile({ id: '1' }),
      profile({
        id: '2',
        fullName: 'Bruno Silva',
        email: 'otro@example.test',
        phone: '098 000 000',
        identityCard: '2.345.678-9',
        profileName: 'Soldadura',
      }),
    ])
    const filters = useApplicantFilters(profiles)

    filters.search.value = ` ${term} `

    expect(filters.filteredProfiles.value.map(({ id }) => id)).toEqual(expectedIds)
  })

  it('combines sector, availability and positive license filters', () => {
    const profiles = ref([
      profile({ id: '1', sectors: ['Ventas'], availability: 'FULL_TIME', license: 'Categoría A' }),
      profile({ id: '2', sectors: ['Ventas'], availability: 'PART_TIME', license: 'No tiene libreta' }),
      profile({ id: '3', sectors: ['Logística'], availability: 'FULL_TIME', license: 'Categoría B' }),
    ])
    const filters = useApplicantFilters(profiles)

    filters.selectedSector.value = 'Ventas'
    filters.selectedAvailability.value = 'FULL_TIME'
    filters.selectedLicense.value = 'yes'

    expect(filters.hasFilters.value).toBe(true)
    expect(filters.filteredProfiles.value.map(({ id }) => id)).toEqual(['1'])
  })

  it.each(['', ' no ', 'SIN LIBRETA', 'No tiene', 'no tiene libreta', 'no informada'])(
    'treats "%s" as an absent license',
    (license) => {
      const profiles = ref([
        profile({ id: 'without', license }),
        profile({ id: 'with', license: 'Categoría A' }),
      ])
      const filters = useApplicantFilters(profiles)
      filters.selectedLicense.value = 'no'

      expect(filters.filteredProfiles.value.map(({ id }) => id)).toEqual(['without'])
    },
  )

  it('clears every filter and restores the full list', () => {
    const profiles = ref([profile({ id: '1' }), profile({ id: '2' })])
    const filters = useApplicantFilters(profiles)
    filters.search.value = 'missing'
    filters.selectedSector.value = 'Ventas'
    filters.selectedAvailability.value = 'PART_TIME'
    filters.selectedLicense.value = 'yes'

    filters.clearFilters()

    expect(filters.hasFilters.value).toBe(false)
    expect(filters.filteredProfiles.value).toHaveLength(2)
    expect([
      filters.search.value,
      filters.selectedSector.value,
      filters.selectedAvailability.value,
      filters.selectedLicense.value,
    ]).toEqual(['', '', '', ''])
  })
})

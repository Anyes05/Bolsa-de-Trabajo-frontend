import { computed, ref, type Ref } from 'vue'
import type { MockApplicantProfile } from '../data/mockSocioBolsa'

export function useApplicantFilters(profiles: Readonly<Ref<MockApplicantProfile[]>>) {
  const search = ref('')
  const selectedSector = ref('')
  const selectedAvailability = ref('')
  const selectedLicense = ref('')
  const sectorOptions = computed(() => [...new Set(profiles.value.flatMap((profile) => profile.sectors))]
    .filter(Boolean).sort((first, second) => first.localeCompare(second, 'es')))
  const availabilityOptions = computed(() => [...new Set(profiles.value.map((profile) => profile.availability))]
    .filter(Boolean).sort((first, second) => first.localeCompare(second, 'es')))
  const hasFilters = computed(() => !!search.value || !!selectedSector.value
    || !!selectedAvailability.value || !!selectedLicense.value)

  function hasLicense(license: string) {
    return !['', 'no', 'sin libreta', 'no tiene', 'no tiene libreta', 'no informada']
      .includes(license.trim().toLocaleLowerCase('es'))
  }

  function clearFilters() {
    search.value = ''
    selectedSector.value = ''
    selectedAvailability.value = ''
    selectedLicense.value = ''
  }

  const filteredProfiles = computed(() => {
    const term = search.value.trim().toLocaleLowerCase('es')
    return profiles.value.filter((profile) => {
      const matches = !term || [profile.fullName, profile.email, profile.phone || '', profile.identityCard, profile.profileName]
        .some((value) => value.toLocaleLowerCase('es').includes(term))
      return matches
        && (!selectedSector.value || profile.sectors.includes(selectedSector.value))
        && (!selectedAvailability.value || profile.availability === selectedAvailability.value)
        && (!selectedLicense.value || hasLicense(profile.license) === (selectedLicense.value === 'yes'))
    })
  })

  return {
    search, selectedSector, selectedAvailability, selectedLicense,
    sectorOptions, availabilityOptions, hasFilters, clearFilters, filteredProfiles,
  }
}

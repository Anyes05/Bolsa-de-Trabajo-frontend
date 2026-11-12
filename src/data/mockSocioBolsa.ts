export type Availability = 'FULL_TIME' | 'PART_TIME' | 'INDEFINIDO'
export type SortOption = 'updated' | 'name'

export type ApplicantProfileDisplay = {
  id: string
  fotoUrl?: string | null
  applicantId: number
  fullName: string
  email: string
  phone?: string
  initials: string
  profileName: string
  categoryLabel: string
  location: string
  identityCard: string
  age: number
  tags: string[]
  sectors: string[]
  interests: string[]
  availability: Availability
  license: string
  hasVehicle: boolean
  experienceSummary: string
  latestJob: string
  cvFileName: string
  cvMeta: string
  updatedAt: string
  hasApplication?: boolean
  hasCv?: boolean
}

export type MockApplicantProfile = ApplicantProfileDisplay

export const availabilityLabel: Record<Availability, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  INDEFINIDO: 'Cualquier horario',
}

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileCard from './ProfileCard.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'

function perfil(cambios: Partial<MockApplicantProfile> = {}): MockApplicantProfile {
  return {
    id: '1', applicantId: 10, fullName: 'Ana Pérez', email: 'ana@ejemplo.test', initials: 'AP',
    profileName: 'Vendedora', categoryLabel: 'VENTAS', location: 'Libertad', identityCard: '1.234.567-8',
    age: 30, tags: ['Ventas', 'Atención'], sectors: ['Ventas'], interests: ['Ventas'], availability: 'PART_TIME',
    license: 'Categoría A', hasVehicle: false, experienceSummary: '', latestJob: '', cvFileName: '', cvMeta: '',
    updatedAt: '000000000001', ...cambios,
  }
}

describe('tarjeta de perfil laboral', () => {
  it('muestra los datos del perfil y emite la vista completa', async () => {
    const wrapper = mount(ProfileCard, { props: { profile: perfil() } })
    expect(wrapper.find('.profile-card__name').text()).toBe('Ana Pérez')
    expect(wrapper.find('.profile-card__role').text()).toBe('Vendedora')
    expect(wrapper.find('.profile-card__location').text()).toBe('Libertad')
    expect(wrapper.findAll('.profile-card__tag').map((tag) => tag.text())).toEqual(['Ventas', 'Atención'])
    expect(wrapper.find('.profile-card__meta').text()).toContain('Part-time')
    expect(wrapper.find('.profile-card__meta').text()).toContain('Libreta: Categoría A')

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('view')).toHaveLength(1)
  })
})

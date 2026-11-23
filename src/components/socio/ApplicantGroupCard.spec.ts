// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicantGroupCard from './ApplicantGroupCard.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'

function perfil(id: string, cambios: Partial<MockApplicantProfile> = {}): MockApplicantProfile {
  return {
    id, applicantId: 10, fullName: 'Ana Pérez', email: 'ana@ejemplo.test', initials: 'AP',
    profileName: `Perfil ${id}`, categoryLabel: 'VENTAS', location: 'Libertad', identityCard: '',
    age: 0, tags: [], sectors: [], interests: [], availability: 'FULL_TIME',
    license: 'No informada', hasVehicle: false, experienceSummary: '', latestJob: '', cvFileName: '', cvMeta: '',
    updatedAt: id, ...cambios,
  }
}

type Postulante = InstanceType<typeof ApplicantGroupCard>['$props']['applicant']

function postulante(cambios: Partial<Postulante> = {}): Postulante {
  return {
    id: 10, fullName: 'Ana Pérez', email: 'ana@ejemplo.test', phone: '099 123 456', initials: 'AP',
    profiles: [perfil('1'), perfil('2')], ...cambios,
  }
}

describe('tarjeta agrupada de postulante', () => {
  it('muestra contacto, cantidad de perfiles y emite acciones', async () => {
    const wrapper = mount(ApplicantGroupCard, { props: { applicant: postulante(), expanded: false } })
    expect(wrapper.find('h3').text()).toBe('Ana Pérez')
    expect(wrapper.find('.applicant-group-card__badge').exists()).toBe(false)
    const enlaces = wrapper.findAll('a')
    expect(enlaces[0]!.attributes('href')).toBe('mailto:ana@ejemplo.test')
    expect(enlaces[1]!.attributes('href')).toBe('tel:099123456')
    expect(wrapper.find('.applicant-group-card__count').text()).toBe('2 perfiles')
    expect(wrapper.find('.applicant-group-card__profiles').exists()).toBe(false)

    const botones = wrapper.findAll('footer.applicant-group-card__actions button')
    expect(botones).toHaveLength(2)
    await botones[0]!.trigger('click')
    await botones[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('contact')).toHaveLength(1)
  })

  it('al expandirse lista los perfiles y emite el elegido', async () => {
    const applicant = postulante()
    const wrapper = mount(ApplicantGroupCard, { props: { applicant, expanded: true } })
    const tarjetas = wrapper.findAll('.profile-card')
    expect(tarjetas).toHaveLength(2)
    await tarjetas[1]!.find('button').trigger('click')
    expect(wrapper.emitted('view')).toEqual([[applicant.profiles[1]]])
  })

  it('sin teléfono, con un perfil y sin contacto muestra los textos alternativos', () => {
    const wrapper = mount(ApplicantGroupCard, {
      props: { applicant: postulante({ phone: undefined, profiles: [perfil('1')] }), expanded: false, showContact: false },
    })
    expect(wrapper.find('.applicant-group-card__contact--muted').text()).toBe('Sin teléfono')
    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('.applicant-group-card__count').text()).toBe('1 perfil')
    expect(wrapper.findAll('footer.applicant-group-card__actions button')).toHaveLength(1)
  })

  it('muestra el estado activo, inactivo o búsqueda pausada', () => {
    const activo = mount(ApplicantGroupCard, {
      props: { applicant: postulante({ estado: 'ACTIVO', estadoDetalle: 'Último ingreso hoy' }), expanded: false, showEstado: true },
    })
    const badgeActivo = activo.find('.applicant-group-card__badge')
    expect(badgeActivo.text()).toBe('Activo')
    expect(badgeActivo.classes()).toContain('applicant-group-card__badge--activo')
    expect(badgeActivo.attributes('title')).toBe('Último ingreso hoy')

    const inactivo = mount(ApplicantGroupCard, {
      props: { applicant: postulante({ estado: 'INACTIVO' }), expanded: false, showEstado: true },
    })
    const badgeInactivo = inactivo.find('.applicant-group-card__badge')
    expect(badgeInactivo.text()).toBe('Inactivo')
    expect(badgeInactivo.classes()).toContain('applicant-group-card__badge--inactivo')
    expect(badgeInactivo.attributes('title')).toBeUndefined()

    const pausado = mount(ApplicantGroupCard, {
      props: { applicant: postulante({ estado: 'ACTIVO', busquedaPausada: true }), expanded: false, showEstado: true },
    })
    expect(pausado.find('.applicant-group-card__badge').text()).toBe('Búsqueda pausada')

    const sinEstado = mount(ApplicantGroupCard, {
      props: { applicant: postulante(), expanded: false, showEstado: true },
    })
    expect(sinEstado.find('.applicant-group-card__badge').exists()).toBe(false)
  })
})

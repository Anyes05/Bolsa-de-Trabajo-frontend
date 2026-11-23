// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ProfileDetailModal from './ProfileDetailModal.vue'
import type { MockApplicantProfile } from '../../data/mockSocioBolsa'
import type { SocioProfileCv } from '../../services/types'

function perfil(cambios: Partial<MockApplicantProfile> = {}): MockApplicantProfile {
  return {
    id: '7', applicantId: 10, fullName: 'Ana Pérez', email: 'ana@ejemplo.test', phone: '099 123 456',
    initials: 'AP', profileName: 'Vendedora', categoryLabel: 'VENTAS', location: 'Libertad',
    identityCard: '1.234.567-8', age: 30, tags: ['Ventas'], sectors: ['Ventas'], interests: ['Ventas', 'Caja'],
    availability: 'FULL_TIME', license: 'Categoría A', hasVehicle: true, experienceSummary: 'Diez años en ventas',
    latestJob: 'Supermercado', cvFileName: 'cv-ana.pdf', cvMeta: 'PDF · 120 KB', updatedAt: '1',
    hasApplication: true, hasCv: true, ...cambios,
  }
}

const cv = (id: number, fileName: string | null): SocioProfileCv => ({
  id, fileName, meta: `Meta ${id}`, active: true, uploadedAt: '2026-01-01',
})

let montados: VueWrapper[] = []
function montar(props: InstanceType<typeof ProfileDetailModal>['$props']) {
  const wrapper = mount(ProfileDetailModal, { props, attachTo: document.body })
  montados.push(wrapper)
  return wrapper
}

describe('modal de detalle de perfil', () => {
  afterEach(() => {
    montados.forEach((wrapper) => wrapper.unmount())
    montados = []
  })

  it('con postulación muestra todos los datos y descarga cada CV', async () => {
    const wrapper = montar({ profile: perfil(), cvs: [cv(1, 'principal.pdf'), cv(2, null)] })
    expect(wrapper.find('h2').attributes('id')).toBe('profile-modal-title-7')
    const meta = wrapper.find('.profile-modal__meta').text()
    expect(meta).toContain('Libertad')
    expect(meta).toContain('099 123 456')
    expect(meta).toContain('CI: 1.234.567-8')
    expect(meta).toContain('30 años')
    expect(wrapper.find('.profile-modal__pills').text()).toContain('Full-time')
    expect(wrapper.find('.profile-modal__pills').text()).toContain('Con vehículo propio')
    expect(wrapper.find('.profile-modal__category').text()).toBe('VENTAS')
    expect(wrapper.findAll('.profile-modal__tags li').map((li) => li.text())).toEqual(['Ventas', 'Caja'])
    expect(wrapper.text()).toContain('Diez años en ventas')
    expect(wrapper.text()).toContain('Supermercado')
    expect(wrapper.findAll('.profile-modal__muted')).toHaveLength(0)

    const archivos = wrapper.findAll('.profile-modal__cv')
    expect(archivos).toHaveLength(2)
    expect(archivos[0]!.find('strong').text()).toBe('principal.pdf')
    expect(archivos[1]!.find('strong').text()).toBe('CV asociado al perfil')
    await archivos[1]!.find('button').trigger('click')
    expect(wrapper.emitted('downloadCv')).toEqual([['7', 2]])
  })

  it('con postulación sin CVs ofrece el CV del perfil y textos de respaldo', async () => {
    const wrapper = montar({
      profile: perfil({ experienceSummary: '', latestJob: '', phone: undefined, identityCard: '', age: 0, hasVehicle: false }),
    })
    const meta = wrapper.find('.profile-modal__meta').text()
    expect(meta).not.toContain('CI:')
    expect(meta).not.toContain('años')
    expect(wrapper.text()).toContain('Sin vehículo')
    expect(wrapper.text()).toContain('Todavía no informó un resumen de experiencia.')
    expect(wrapper.text()).toContain('Todavía no informó su último empleo.')
    expect(wrapper.findAll('.profile-modal__muted')).toHaveLength(2)
    expect(wrapper.text()).toContain('No se adjuntaron CVs a este perfil.')

    const archivo = wrapper.find('.profile-modal__cv')
    expect(archivo.find('strong').text()).toBe('cv-ana.pdf')
    expect(archivo.find('small').text()).toBe('PDF · 120 KB')
    await archivo.find('button').trigger('click')
    expect(wrapper.emitted('downloadCv')).toEqual([['7']])
  })

  it('sin CV adjunto deshabilita la descarga y usa nombres por defecto', () => {
    const wrapper = montar({ profile: perfil({ hasCv: false, cvFileName: '', cvMeta: '' }) })
    const archivo = wrapper.find('.profile-modal__cv')
    expect(archivo.find('strong').text()).toBe('CV asociado al perfil')
    expect(archivo.find('small').text()).toBe('No se adjuntó un CV')
    expect(archivo.find('button').attributes('disabled')).toBeDefined()
  })

  it('mientras carga los CVs no muestra el respaldo', () => {
    const wrapper = montar({ profile: perfil(), loadingCvs: true })
    expect(wrapper.text()).toContain('Cargando CVs...')
    expect(wrapper.text()).not.toContain('No se adjuntaron CVs')
    expect(wrapper.findAll('.profile-modal__cv')).toHaveLength(0)
  })

  it('sin postulación oculta experiencia y CV hasta que se postule', () => {
    const wrapper = montar({ profile: perfil({ hasApplication: false }) })
    expect(wrapper.findAll('.profile-modal__muted')).toHaveLength(2)
    expect(wrapper.text()).toContain('Disponible después de una postulación a una oferta propia.')
    expect(wrapper.text()).not.toContain('Diez años en ventas')
    const archivos = wrapper.findAll('.profile-modal__cv')
    expect(archivos).toHaveLength(1)
    expect(archivos[0]!.find('button').exists()).toBe(false)
  })

  it('se cierra con escape, el fondo o el botón y suelta el teclado al desmontarse', async () => {
    const wrapper = montar({ profile: perfil() })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await wrapper.find('.profile-modal__backdrop').trigger('click')
    await wrapper.find('.profile-modal__actions button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(3)
    // El contacto se hace desde "Contactar" en la tarjeta: el modal solo tiene "Cerrar".
    expect(wrapper.findAll('.profile-modal__actions button').map((b) => b.text())).toEqual(['Cerrar'])

    const quitar = vi.spyOn(window, 'removeEventListener')
    wrapper.unmount()
    montados = []
    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function))
    quitar.mockRestore()
  })
})

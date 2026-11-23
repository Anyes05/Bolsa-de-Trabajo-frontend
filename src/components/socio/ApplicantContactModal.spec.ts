// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import ApplicantContactModal from './ApplicantContactModal.vue'
import type { ContactApplication } from '../../services/socioBolsaService'

const postulacion = (ofertaId: number): ContactApplication => ({
  ofertaId, ofertaTitulo: `Oferta ${ofertaId}`, perfilId: ofertaId * 10, perfilNombre: `Perfil ${ofertaId}`,
})

type Props = InstanceType<typeof ApplicantContactModal>['$props']

let montados: VueWrapper[] = []
function montar(props: Partial<Props> = {}) {
  const wrapper = mount(ApplicantContactModal, {
    props: {
      applicantName: 'Ana Pérez', applicantEmail: 'ana@ejemplo.test',
      applications: [], loadingApplications: false, ...props,
    },
    attachTo: document.body,
  })
  montados.push(wrapper)
  return wrapper
}

function escape() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

function botones(wrapper: VueWrapper) {
  const lista = wrapper.findAll('footer button')
  return { cancelar: lista[0]!, noSeleccionado: lista[1]!, seleccionado: lista[2]! }
}

describe('modal para notificar al postulante', () => {
  afterEach(() => {
    montados.forEach((wrapper) => wrapper.unmount())
    montados = []
  })

  it('muestra el estado de carga y deshabilita las acciones', () => {
    const wrapper = montar({ loadingApplications: true })
    expect(wrapper.find('.profile-modal__meta').text()).toContain('Ana Pérez · ana@ejemplo.test')
    expect(wrapper.find('[role="status"]').text()).toBe('Cargando postulaciones...')
    const { noSeleccionado, seleccionado } = botones(wrapper)
    expect(noSeleccionado.attributes('disabled')).toBeDefined()
    expect(seleccionado.attributes('disabled')).toBeDefined()
  })

  it('avisa cuando no hay postulaciones y permite cerrar', async () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('no tiene postulaciones disponibles')
    expect(wrapper.find('select').exists()).toBe(false)
    await botones(wrapper).cancelar.trigger('click')
    await wrapper.find('.profile-modal__backdrop').trigger('click')
    escape()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('muestra el error sin el aviso de lista vacía', () => {
    const wrapper = montar({ error: 'No se pudieron cargar' })
    expect(wrapper.text()).not.toContain('no tiene postulaciones disponibles')
    expect(wrapper.text()).toContain('No se pudieron cargar')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('preselecciona la única postulación y notifica ambos resultados', async () => {
    const unica = postulacion(1)
    const wrapper = montar({ applications: [unica] })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('1')
    const { noSeleccionado, seleccionado } = botones(wrapper)
    await noSeleccionado.trigger('click')
    await seleccionado.trigger('click')
    expect(wrapper.emitted('notify')).toEqual([[false, unica], [true, unica]])
  })

  it('con varias postulaciones exige elegir una oferta', async () => {
    const wrapper = montar({ applications: [postulacion(1), postulacion(2)] })
    expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
      'Seleccione una oferta', 'Oferta 1 — Perfil 1', 'Oferta 2 — Perfil 2',
    ])
    expect(botones(wrapper).seleccionado.attributes('disabled')).toBeDefined()
    // Un click sobre el botón deshabilitado forzado no emite nada.
    ;(botones(wrapper).seleccionado.element as HTMLButtonElement).disabled = false
    await botones(wrapper).seleccionado.trigger('click')
    expect(wrapper.emitted('notify')).toBeUndefined()

    await wrapper.find('select').setValue('2')
    expect(botones(wrapper).seleccionado.attributes('disabled')).toBeUndefined()
    await botones(wrapper).seleccionado.trigger('click')
    expect(wrapper.emitted('notify')).toEqual([[true, postulacion(2)]])

    // Al cambiar la lista se reinicia la selección.
    await wrapper.setProps({ applications: [postulacion(3), postulacion(4)] })
    expect(botones(wrapper).seleccionado.attributes('disabled')).toBeDefined()
  })

  it('mientras envía no se cierra con escape ni con el fondo', async () => {
    const wrapper = montar({ applications: [postulacion(1)], loading: true })
    escape()
    await wrapper.find('.profile-modal__backdrop').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })

  it('deja de escuchar el teclado al desmontarse', () => {
    const wrapper = montar()
    const quitar = vi.spyOn(window, 'removeEventListener')
    wrapper.unmount()
    montados = []
    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function))
    quitar.mockRestore()
  })
})

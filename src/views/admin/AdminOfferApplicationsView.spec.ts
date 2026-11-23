// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, RouterLinkStub } from '@vue/test-utils'
import AdminOfferApplicationsView from './AdminOfferApplicationsView.vue'

// El layout administrativo se reemplaza por un contenedor que renderiza el contenido y las acciones.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active, 'data-title': props.title, 'data-subtitle': props.subtitle }, [
      h('div', { class: 'acciones' }, slots['header-actions']?.()),
      slots.default?.(),
    ])
  },
})

function montar() {
  return mount(AdminOfferApplicationsView, {
    global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } },
  })
}

describe('postulaciones de una oferta (vista administrativa)', () => {
  it('muestra el encabezado y el enlace para volver a las ofertas', () => {
    const wrapper = montar()
    const shell = wrapper.find('[data-active]')

    expect(shell.attributes('data-active')).toBe('ofertas')
    expect(shell.attributes('data-title')).toBe('Repartidor/a Zona San José — Postulaciones')
    expect(shell.attributes('data-subtitle')).toBe('3 postulaciones recibidas para esta vacante')
    const volver = wrapper.findComponent(RouterLinkStub)
    expect(volver.props('to')).toBe('/admin/ofertas')
    expect(volver.text()).toContain('Volver')
  })

  it('lista cada postulación con su estado, perfil y etiquetas', () => {
    const wrapper = montar()
    const tarjetas = wrapper.findAll('.application-card')

    expect(tarjetas).toHaveLength(3)
    expect(tarjetas.map((tarjeta) => tarjeta.find('h2').text())).toEqual([
      'Carlos Méndez', 'Roberto Pérez', 'Diego Martínez',
    ])
    expect(tarjetas[0]!.find('.application-avatar').text()).toBe('CM')
    expect(tarjetas[0]!.find('.application-phone').text()).toBe('099 112 233')
    expect(tarjetas[0]!.find('.application-status').classes()).toContain('application-status--contactado')
    expect(tarjetas[0]!.find('.application-status small').text()).toBe('✓')
    expect(tarjetas[0]!.findAll('.application-tags span').map((tag) => tag.text())).toEqual(['Choferes', 'Reparto'])
    expect(tarjetas[1]!.find('.application-status').classes()).toContain('application-status--revisada')
    expect(tarjetas[1]!.find('.application-status small').exists()).toBe(false)
    expect(tarjetas[2]!.find('.application-profile-title').text()).toBe('Perfil: Perfil Auxiliar de Almacén')
    expect(tarjetas[2]!.find('.application-status').text()).toBe('Pendiente')
    expect(wrapper.findAll('.application-cv-button')).toHaveLength(3)
  })
})

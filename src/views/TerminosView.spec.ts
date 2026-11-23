// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import TerminosView from './TerminosView.vue'

describe('vista de términos y condiciones', () => {
  it('muestra las secciones de los términos y el enlace para volver al ingreso', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'access', component: defineComponent({ render: () => h('div') }) },
        { path: '/terminos', name: 'terminos', component: TerminosView },
      ],
    })
    await router.push('/terminos')
    await router.isReady()
    const wrapper = mount(TerminosView, { global: { plugins: [router] } })
    expect(wrapper.find('h1').text()).toBe('Términos y condiciones')
    expect(wrapper.findAll('h2').map((titulo) => titulo.text())).toEqual([
      '1. Quién opera el sistema', '2. Cuentas', '3. Datos personales',
      '4. Contenido y archivos', '5. Comunicaciones', '6. Limitación',
    ])
    expect(wrapper.find('a').attributes('href')).toBe('/')
    expect(wrapper.find('img.brand-logo').exists()).toBe(true)
  })
})

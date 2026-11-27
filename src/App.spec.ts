// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'

describe('componente raíz', () => {
  it('renderiza la vista de la ruta actual', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: defineComponent({ render: () => h('p', { class: 'pagina' }, 'Inicio') }) }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.find('.pagina').text()).toBe('Inicio')
  })

  it('muestra el selector de tema flotante solo en las páginas públicas', async () => {
    const vista = defineComponent({ render: () => h('p', 'Vista') })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: vista },
        { path: '/privada', component: vista, meta: { requiresAuth: true } },
      ],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.find('.theme-toggle--floating').exists()).toBe(true)
    await router.push('/privada')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.theme-toggle--floating').exists()).toBe(false)
  })
})

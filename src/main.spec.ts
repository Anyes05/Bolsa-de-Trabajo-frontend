// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

vi.mock('./router', async () => {
  const { createMemoryHistory, createRouter } = await import('vue-router')
  const { defineComponent, h } = await import('vue')
  return {
    default: createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: defineComponent({ render: () => h('p', { class: 'inicio' }, 'Inicio montado') }) }],
    }),
  }
})

describe('punto de entrada de la aplicación', () => {
  it('monta la app con pinia y el router sobre #app', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    await import('./main')
    const { default: router } = await import('./router')
    await router.isReady()
    await flushPromises()
    const raiz = document.querySelector('#app') as HTMLElement & { __vue_app__?: { config: { globalProperties: Record<string, unknown> } } }
    expect(raiz.__vue_app__).toBeDefined()
    expect(raiz.__vue_app__?.config.globalProperties.$pinia).toBeDefined()
    expect(raiz.__vue_app__?.config.globalProperties.$router).toBe(router)
    expect(raiz.querySelector('.inicio')?.textContent).toBe('Inicio montado')
  }, 60_000)
})

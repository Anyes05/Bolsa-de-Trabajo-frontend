// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationBar from './PaginationBar.vue'

function montar(props: Partial<InstanceType<typeof PaginationBar>['$props']> = {}) {
  return mount(PaginationBar, { props: { page: 0, totalPages: 3, totalElements: 45, ...props } })
}

describe('PaginationBar', () => {
  it('no se muestra con una sola página', () => {
    expect(montar({ totalPages: 1 }).find('nav').exists()).toBe(false)
    expect(montar({ totalPages: 0, totalElements: 0 }).find('nav').exists()).toBe(false)
  })

  it('muestra la posición y emite la página anterior o siguiente', async () => {
    const wrapper = montar({ page: 1, label: 'Paginación de prueba' })
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Paginación de prueba')
    expect(wrapper.text()).toContain('Página 2 de 3 · 45 resultados')
    await wrapper.find('button[aria-label="Página anterior"]').trigger('click')
    await wrapper.find('button[aria-label="Página siguiente"]').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[0], [2]])
  })

  it('deshabilita los extremos y durante la carga', () => {
    const primera = montar()
    expect(primera.find('nav').attributes('aria-label')).toBe('Paginación')
    expect(primera.find('button[aria-label="Página anterior"]').attributes('disabled')).toBeDefined()
    expect(primera.find('button[aria-label="Página siguiente"]').attributes('disabled')).toBeUndefined()
    const ultima = montar({ page: 2 })
    expect(ultima.find('button[aria-label="Página siguiente"]').attributes('disabled')).toBeDefined()
    const cargando = montar({ page: 1, loading: true })
    expect(cargando.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})

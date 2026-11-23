// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileAvatar from './ProfileAvatar.vue'

afterEach(() => vi.restoreAllMocks())

describe('ProfileAvatar', () => {
  it('muestra las iniciales si no hay foto', () => {
    const wrapper = mount(ProfileAvatar, { props: { initials: 'AG' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('AG')
  })

  it('vuelve a las iniciales si la foto falla y reintenta al cambiar la URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(ProfileAvatar, { props: { initials: 'AG', src: '/a.jpg' } })
    expect(wrapper.find('img').attributes('src')).toBe('/a.jpg')
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('AG')
    expect(warn).toHaveBeenCalled()
    await wrapper.setProps({ src: '/b.jpg' })
    expect(wrapper.find('img').attributes('src')).toBe('/b.jpg')
  })
})

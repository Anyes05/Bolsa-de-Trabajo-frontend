// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandLogo from './BrandLogo.vue'

describe('BrandLogo', () => {
  it('usa una imagen distinta para cada variante', () => {
    const fuentes = (['green', 'white', 'round'] as const).map((variant) =>
      mount(BrandLogo, { props: { variant } }).find('img').attributes('src'))
    expect(new Set(fuentes).size).toBe(3)
  })
})

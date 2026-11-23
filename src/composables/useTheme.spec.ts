// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function cargar() {
  vi.resetModules()
  return import('./useTheme')
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.head.innerHTML = '<meta name="theme-color" content="#008c45">'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('tema claro / oscuro', () => {
  it('sin elección guardada arranca en modo claro aunque el sistema esté en oscuro', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn() })))
    const { initTheme, useTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(useTheme().theme.value).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#008c45')
  })

  it('respeta la elección guardada', async () => {
    localStorage.setItem('ccisj-theme', 'dark')
    const { initTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#0f1f17')
  })

  it('ignora valores guardados inválidos', async () => {
    localStorage.setItem('ccisj-theme', 'violeta')
    const { initTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('alternar cambia el tema, lo aplica y lo recuerda', async () => {
    const { initTheme, useTheme, THEME_STORAGE_KEY } = await cargar()
    initTheme()
    const { theme, toggleTheme, setTheme } = useTheme()
    toggleTheme()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    toggleTheme()
    expect(theme.value).toBe('light')
    setTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('si el almacenamiento falla, el tema igual se aplica para esta visita', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    const { initTheme, useTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
    useTheme().toggleTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

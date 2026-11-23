// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = (event: { matches: boolean }) => void

function simularSistema(oscuro: boolean) {
  const listeners: Listener[] = []
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: oscuro, addEventListener: (_: string, fn: Listener) => listeners.push(fn) })))
  return (matches: boolean) => listeners.forEach((fn) => fn({ matches }))
}

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
  it('sin elección guardada sigue el tema del sistema y sus cambios', async () => {
    const cambiarSistema = simularSistema(true)
    const { initTheme, useTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useTheme().theme.value).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#0f1f17')
    cambiarSistema(false)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('la elección guardada tiene prioridad y no la pisa el sistema', async () => {
    localStorage.setItem('ccisj-theme', 'light')
    const cambiarSistema = simularSistema(true)
    const { initTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
    cambiarSistema(true)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('ignora valores guardados inválidos y funciona sin matchMedia', async () => {
    localStorage.setItem('ccisj-theme', 'violeta')
    vi.stubGlobal('matchMedia', undefined)
    const { initTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('alternar cambia el tema, lo aplica y lo recuerda', async () => {
    simularSistema(false)
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
    simularSistema(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    const { initTheme, useTheme } = await cargar()
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('light')
    useTheme().toggleTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Modulo = typeof import('./googleIdentity')

const identidadFalsa = () => ({ initialize: vi.fn(), renderButton: vi.fn() })

async function cargarModulo(): Promise<Modulo> {
  vi.resetModules()
  return import('./googleIdentity')
}

function scriptsDeGoogle() {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]'))
}

describe('carga de Google Identity Services', () => {
  beforeEach(() => {
    delete window.google
    document.head.innerHTML = ''
  })
  afterEach(() => {
    delete window.google
  })

  it('reutiliza la API si Google ya está cargado, sin insertar scripts', async () => {
    const id = identidadFalsa()
    window.google = { accounts: { id } }
    const { loadGoogleIdentity } = await cargarModulo()
    await expect(loadGoogleIdentity()).resolves.toBe(id)
    expect(scriptsDeGoogle()).toHaveLength(0)
  })

  it('inserta el script una sola vez y resuelve cuando termina de cargar', async () => {
    const { loadGoogleIdentity } = await cargarModulo()
    const primera = loadGoogleIdentity()
    const segunda = loadGoogleIdentity()
    expect(segunda).toBe(primera)
    const [script] = scriptsDeGoogle()
    expect(scriptsDeGoogle()).toHaveLength(1)
    expect(script.async).toBe(true)
    const id = identidadFalsa()
    window.google = { accounts: { id } }
    script.onload?.(new Event('load'))
    await expect(primera).resolves.toBe(id)
  })

  it('rechaza si el script carga pero Google no expone la API, y permite reintentar', async () => {
    const { loadGoogleIdentity } = await cargarModulo()
    const intento = loadGoogleIdentity()
    scriptsDeGoogle()[0].onload?.(new Event('load'))
    await expect(intento).rejects.toThrow('No se pudo inicializar el acceso con Google. Intentá nuevamente.')
    expect(scriptsDeGoogle()).toHaveLength(0)
    const reintento = loadGoogleIdentity()
    expect(reintento).not.toBe(intento)
    expect(scriptsDeGoogle()).toHaveLength(1)
    reintento.catch(() => {})
  })

  it('rechaza con un mensaje de conexión si el script no se puede descargar', async () => {
    const { loadGoogleIdentity } = await cargarModulo()
    const intento = loadGoogleIdentity()
    scriptsDeGoogle()[0].onerror?.(new Event('error'))
    await expect(intento).rejects.toThrow('No se pudo conectar con Google. Revisá tu conexión e intentá nuevamente.')
    expect(scriptsDeGoogle()).toHaveLength(0)
  })
})

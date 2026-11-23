// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openCvInNewTab } from './openCvInNewTab'

function fakeTab() {
  return { opener: {} as unknown, closed: false, close: vi.fn(), location: { replace: vi.fn() } }
}

afterEach(() => vi.restoreAllMocks())

describe('openCvInNewTab', () => {
  it('abre una pestaña sin opener y la redirige a la URL temporal', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    await openCvInNewTab(async () => ({ url: 'https://s3.example/cv.pdf' }))
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(tab.opener).toBeNull()
    expect(tab.location.replace).toHaveBeenCalledWith('https://s3.example/cv.pdf')
    expect(tab.close).not.toHaveBeenCalled()
  })

  it('falla con un mensaje claro si el navegador bloquea la ventana', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const getDownload = vi.fn()
    await expect(openCvInNewTab(getDownload)).rejects.toThrow('El navegador bloqueó la pestaña de descarga')
    expect(getDownload).not.toHaveBeenCalled()
  })

  it('cierra la pestaña y propaga el error si falla la descarga', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    await expect(openCvInNewTab(() => Promise.reject(new Error('403')))).rejects.toThrow('403')
    expect(tab.close).toHaveBeenCalled()
  })

  it('avisa si el usuario cerró la pestaña antes de recibir la URL', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    await expect(openCvInNewTab(async () => { tab.closed = true; return { url: 'u' } }))
      .rejects.toThrow('La pestaña de descarga se cerró')
    expect(tab.location.replace).not.toHaveBeenCalled()
  })
})

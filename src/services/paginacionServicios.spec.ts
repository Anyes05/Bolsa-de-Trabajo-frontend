import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { offerService } from './offerService'
import { socioService } from './socioService'

vi.mock('./http', async (importOriginal) => ({ ...(await importOriginal<typeof import('./http')>()), request: vi.fn() }))

describe('servicios de listados paginados', () => {
  beforeEach(() => { vi.mocked(request).mockReset().mockResolvedValue(undefined) })

  it('obtiene una oferta por id', async () => {
    await offerService.get(15)
    expect(request).toHaveBeenCalledWith('/ofertas/15')
  })

  it('pide la página de socios con búsqueda e incompletos solo si se piden', async () => {
    await socioService.pageSocios()
    expect(request).toHaveBeenLastCalledWith('/admin/socios/pagina')
    await socioService.pageSocios({ q: ' Ferretería ', incompletos: false, page: 2, size: 10 })
    expect(request).toHaveBeenLastCalledWith('/admin/socios/pagina?q=Ferreter%C3%ADa&page=2&size=10')
    await socioService.pageSocios({ incompletos: true })
    expect(request).toHaveBeenLastCalledWith('/admin/socios/pagina?incompletos=true')
  })
})

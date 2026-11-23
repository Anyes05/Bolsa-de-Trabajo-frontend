// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils'
import AdminSociosHistoryView from './AdminSociosHistoryView.vue'
import { socioService, type SocioSubscriptionEntry } from '../../services/socioService'
import { ApiRequestError } from '../../services/http'
import type { SocioRecord } from '../../services/types'
import type { Page } from '../../services/pagination'
import { pageOf, waitForSearch } from '../../test/pages'

const ruta = reactive<{ query: Record<string, string> }>({ query: {} })

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ruta,
}))

vi.mock('../../services/socioService', () => ({
  socioService: {
    pageSocios: vi.fn(), getSocioById: vi.fn(), subscriptionHistory: vi.fn(), activateSocio: vi.fn(), cancelReentry: vi.fn(),
  },
}))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

function socio(id: number, extra: Partial<SocioRecord> = {}): SocioRecord {
  return {
    id, bps: `10000000${id}`, cedula: null, tipoIdentificador: 'BPS', razonSocial: `Socio ${id}`, rut: `21111111${id}`,
    telefono: null, emailContacto: null, emailUsuario: null, fotoUrl: null, calle: null, numero: null, localidad: null,
    rubroId: 1, nombreRubro: 'Comercio', estadoMorosidad: 'AL_DIA', esDirectivo: false, fechaAlta: '2020-01-15',
    fechaBaja: null, fechaAniversario: null, activo: true, ...extra,
  }
}

function entrada(id: number, tipo: SocioSubscriptionEntry['tipo'], fecha: string, extra: Partial<SocioSubscriptionEntry> = {}): SocioSubscriptionEntry {
  return { id, tipo, fecha, estado: 'REGISTRADO', registradoAt: `${fecha}T10:00:00`, origen: 'SISTEMA', ...extra }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

type Wrapper = VueWrapper<InstanceType<typeof AdminSociosHistoryView>>

const errorApi = (detalle: string) => new ApiRequestError(400, '/admin/socios', { detail: detalle }, detalle)

function montarSinEsperar() {
  return mount(AdminSociosHistoryView, { global: { stubs: { AdminShell: AdminShellStub } } }) as Wrapper
}

// Doble del backend: búsqueda paginada (razón social, RUT, cédula...) y consulta por id (404 si no existe).
function servidor(lista: SocioRecord[]) {
  vi.mocked(socioService.pageSocios).mockImplementation(async ({ q = '' } = {}) => {
    const term = q.trim().toLowerCase()
    return pageOf(lista.filter((s) => !term || [s.razonSocial, s.rut, s.cedula].some((v) => (v ?? '').toLowerCase().includes(term))))
  })
  vi.mocked(socioService.getSocioById).mockImplementation(async (id) => {
    const found = lista.find((s) => s.id === id)
    if (!found) throw new ApiRequestError(404, `/admin/socios/${id}`, null, 'Socio no encontrado')
    return found
  })
}

async function montar(lista: SocioRecord[]) {
  servidor(lista)
  const wrapper = montarSinEsperar()
  await flushPromises()
  return wrapper
}

function boton(raiz: Wrapper | DOMWrapper<Element>, texto: string) {
  const encontrado = raiz.findAll('button').find((b) => b.text().trim() === texto)
  if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`)
  return encontrado
}

function socioBoton(wrapper: Wrapper, razonSocial: string) {
  const encontrado = wrapper.findAll('.subscription-company').find((b) => b.text().includes(razonSocial))
  if (!encontrado) throw new Error(`No se encontró el socio ${razonSocial}`)
  return encontrado
}

function detalle(wrapper: Wrapper) {
  return wrapper.find('.subscription-detail')
}

// Simula un click que llega aunque el botón esté deshabilitado.
async function clickForzado(elemento: DOMWrapper<Element>) {
  elemento.element.removeAttribute('disabled')
  elemento.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

describe('historial de suscripción de socios', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ruta.query = {}
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('listado de socios', () => {
    it('muestra la carga, el listado y el estado vacío del detalle', async () => {
      const pedido = deferred<Page<SocioRecord>>()
      vi.mocked(socioService.pageSocios).mockReturnValueOnce(pedido.promise)
      const wrapper = montarSinEsperar()
      await nextTick()
      expect(wrapper.find('[role="status"]').text()).toBe('Cargando socios...')
      expect(wrapper.find('[data-active]').attributes('data-active')).toBe('socios-historial')

      pedido.resolve(pageOf([
        socio(1, { razonSocial: 'Alfa' }),
        socio(2, { razonSocial: 'Beta', rut: null, cedula: '12345678', activo: false }),
        socio(3, { razonSocial: 'Gamma', rut: null, cedula: null }),
      ]))
      await flushPromises()
      expect(socioService.pageSocios).toHaveBeenCalledWith({ q: '', page: 0 })
      expect(socioService.getSocioById).not.toHaveBeenCalled()

      const botones = wrapper.findAll('.subscription-company')
      expect(botones).toHaveLength(3)
      expect(botones[0].text()).toContain('211111111')
      expect(botones[0].find('.subscription-badge').text()).toBe('Activo')
      expect(botones[1].text()).toContain('12345678')
      expect(botones[1].find('.subscription-badge').classes()).toContain('subscription-badge--inactive')
      expect(botones[1].find('.subscription-badge').text()).toBe('Inactivo')
      expect(botones[2].text()).toContain('Sin RUT / Cédula')
      expect(detalle(wrapper).text()).toContain('Seleccioná un socio para consultar')
      expect(socioService.subscriptionHistory).not.toHaveBeenCalled()
    })

    it('envía la búsqueda al servidor', async () => {
      const wrapper = await montar([
        socio(1, { razonSocial: 'Alfa' }),
        socio(2, { razonSocial: 'Beta', rut: null, cedula: '12345678' }),
      ])
      const buscador = wrapper.find('input[aria-label="Buscar socio para ver historial"]')

      await buscador.setValue(' ALFA ')
      await waitForSearch()
      expect(socioService.pageSocios).toHaveBeenLastCalledWith({ q: ' ALFA ', page: 0 })
      expect(wrapper.findAll('.subscription-company').map((b) => b.find('strong').text())).toEqual(['Alfa'])

      await buscador.setValue('345')
      await waitForSearch()
      expect(wrapper.findAll('.subscription-company').map((b) => b.find('strong').text())).toEqual(['Beta'])

      await buscador.setValue('zzz')
      await waitForSearch()
      expect(wrapper.findAll('.subscription-company')).toHaveLength(0)
      expect(wrapper.text()).toContain('No hay socios que coincidan con la búsqueda.')
    })

    it('informa el error de carga y permite reintentar', async () => {
      vi.mocked(socioService.pageSocios).mockRejectedValueOnce(errorApi('Sin conexión'))
      const wrapper = montarSinEsperar()
      await flushPromises()
      expect(wrapper.text()).toContain('Sin conexión')

      servidor([socio(1, { razonSocial: 'Alfa' })])
      await boton(wrapper, 'Reintentar').trigger('click')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Sin conexión')
      expect(wrapper.findAll('.subscription-company')).toHaveLength(1)
    })

    it('preselecciona el socio indicado en la ruta', async () => {
      ruta.query = { socio: '2' }
      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([entrada(1, 'ALTA', '2020-01-15')])
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' }), socio(2, { razonSocial: 'Beta' })])

      // El preseleccionado se pide por id: puede no estar en la primera página.
      expect(socioService.getSocioById).toHaveBeenCalledWith(2)
      expect(socioService.subscriptionHistory).toHaveBeenCalledWith(2)
      expect(detalle(wrapper).find('h2').text()).toBe('Beta')
      expect(socioBoton(wrapper, 'Beta').attributes('aria-pressed')).toBe('true')
      expect(socioBoton(wrapper, 'Beta').classes()).toContain('subscription-company--selected')
      expect(socioBoton(wrapper, 'Alfa').attributes('aria-pressed')).toBe('false')
    })

    it('no selecciona nada si el socio de la ruta no existe', async () => {
      ruta.query = { socio: '99' }
      const wrapper = await montar([socio(1)])
      expect(socioService.subscriptionHistory).not.toHaveBeenCalled()
      expect(detalle(wrapper).text()).toContain('Historial de suscripción')
      expect(wrapper.text()).not.toContain('Socio no encontrado')
    })
  })

  describe('detalle del historial', () => {
    it('muestra la línea de tiempo con etiquetas, estados y origen', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      const pedido = deferred<SocioSubscriptionEntry[]>()
      vi.mocked(socioService.subscriptionHistory).mockReturnValueOnce(pedido.promise)

      await socioBoton(wrapper, 'Alfa').trigger('click')
      expect(detalle(wrapper).text()).toContain('Cargando historial...')

      pedido.resolve([
        entrada(1, 'ALTA', '2020-01-15', { origen: 'MIGRACION' }),
        entrada(2, 'BAJA', '2023-06-30'),
        entrada(3, 'REINGRESO', '2024-02-01'),
        entrada(4, 'REINGRESO_PROGRAMADO', '2024-01-01', { estado: 'CANCELADO' }),
      ])
      await flushPromises()

      const items = detalle(wrapper).findAll('.subscription-timeline li')
      expect(items.map((li) => li.find('h3').text())).toEqual(['Alta inicial', 'Baja', 'Reingreso', 'Reingreso programado'])
      expect(items[0].text()).toContain('Fecha recuperada de los datos existentes')
      expect(items[0].find('time').attributes('datetime')).toBe('2020-01-15')
      expect(items[0].find('time').text()).toBe(new Date('2020-01-15T00:00:00').toLocaleDateString('es-UY'))
      expect(items[1].text()).not.toContain('Fecha recuperada')
      expect(items[3].find('small').text()).toBe('Cancelado')
      expect(items[3].find('.subscription-dot').classes()).toContain('subscription-dot--REINGRESO_PROGRAMADO')
      // Socio activo y sin pendientes: no se ofrece reanudar.
      expect(detalle(wrapper).find('form').exists()).toBe(false)
      expect(detalle(wrapper).text()).not.toContain('No hay movimientos registrados.')
    })

    it('indica cuando no hay movimientos', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([])
      await socioBoton(wrapper, 'Alfa').trigger('click')
      await flushPromises()
      expect(detalle(wrapper).text()).toContain('No hay movimientos registrados.')
    })

    it('muestra el error del detalle y permite actualizar', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      vi.mocked(socioService.subscriptionHistory).mockRejectedValueOnce(errorApi('Historial no disponible'))
      await socioBoton(wrapper, 'Alfa').trigger('click')
      await flushPromises()
      expect(detalle(wrapper).text()).toContain('Historial no disponible')
      expect(detalle(wrapper).find('.subscription-timeline').exists()).toBe(false)

      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([entrada(1, 'ALTA', '2020-01-15')])
      await boton(detalle(wrapper), 'Actualizar historial').trigger('click')
      await flushPromises()
      expect(detalle(wrapper).text()).not.toContain('Historial no disponible')
      expect(detalle(wrapper).findAll('.subscription-timeline li')).toHaveLength(1)
    })

    it('descarta respuestas viejas si se cambia de socio antes de que lleguen', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' }), socio(2, { razonSocial: 'Beta' })])
      const primero = deferred<SocioSubscriptionEntry[]>()
      const fallido = deferred<SocioSubscriptionEntry[]>()
      const segundo = deferred<SocioSubscriptionEntry[]>()
      vi.mocked(socioService.subscriptionHistory)
        .mockReturnValueOnce(primero.promise)
        .mockReturnValueOnce(fallido.promise)
        .mockReturnValueOnce(segundo.promise)

      await socioBoton(wrapper, 'Alfa').trigger('click')
      await socioBoton(wrapper, 'Alfa').trigger('click')
      await socioBoton(wrapper, 'Beta').trigger('click')

      primero.resolve([entrada(1, 'ALTA', '2019-01-01'), entrada(2, 'BAJA', '2019-05-01')])
      fallido.reject(errorApi('Error viejo'))
      await flushPromises()
      expect(detalle(wrapper).text()).toContain('Cargando historial...')
      expect(detalle(wrapper).text()).not.toContain('Error viejo')

      segundo.resolve([entrada(5, 'ALTA', '2022-02-02')])
      await flushPromises()
      expect(detalle(wrapper).find('h2').text()).toBe('Beta')
      expect(detalle(wrapper).findAll('.subscription-timeline li')).toHaveLength(1)
    })
  })

  describe('reanudar suscripción', () => {
    const historialBaja = () => [
      entrada(1, 'ALTA', '2020-01-15'),
      entrada(2, 'BAJA', '2023-06-30'),
      entrada(3, 'REINGRESO_PROGRAMADO', '2023-01-01', { estado: 'CANCELADO' }),
    ]

    async function montarInactivo() {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa', activo: false }), socio(2, { razonSocial: 'Beta' })])
      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce(historialBaja())
      await socioBoton(wrapper, 'Alfa').trigger('click')
      await flushPromises()
      return wrapper
    }

    it('valida que la fecha no sea anterior al último movimiento', async () => {
      const wrapper = await montarInactivo()
      const formulario = detalle(wrapper).find('form')
      const input = formulario.find('input[type="date"]')
      expect(input.attributes('min')).toBe('2023-06-30')
      expect(boton(formulario, 'Confirmar reingreso').attributes('disabled')).toBeDefined()

      // Sin fecha el envío se ignora.
      await formulario.trigger('submit')
      expect(socioService.activateSocio).not.toHaveBeenCalled()

      await input.setValue('2023-01-01')
      expect(formulario.text()).toContain('La fecha no puede ser anterior a la última alta o baja.')
      await formulario.trigger('submit')
      expect(socioService.activateSocio).not.toHaveBeenCalled()

      await input.setValue('2023-07-01')
      expect(formulario.text()).not.toContain('La fecha no puede ser anterior')
      expect(boton(formulario, 'Confirmar reingreso').attributes('disabled')).toBeUndefined()
    })

    it('reanuda inmediatamente cuando el socio queda activo', async () => {
      const wrapper = await montarInactivo()
      await detalle(wrapper).find('input[type="date"]').setValue('2024-01-10')

      const activacion = deferred<SocioRecord>()
      vi.mocked(socioService.activateSocio).mockReturnValueOnce(activacion.promise)
      await detalle(wrapper).find('form').trigger('submit')
      expect(socioService.activateSocio).toHaveBeenCalledWith(1, '2024-01-10')
      expect(socioBoton(wrapper, 'Beta').attributes('disabled')).toBeDefined()

      // Mientras se guarda, seleccionar otro socio o reenviar se ignora.
      await clickForzado(socioBoton(wrapper, 'Beta'))
      await detalle(wrapper).find('form').trigger('submit')
      expect(socioService.activateSocio).toHaveBeenCalledTimes(1)
      expect(detalle(wrapper).find('h2').text()).toBe('Alfa')

      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([...historialBaja(), entrada(4, 'REINGRESO', '2024-01-10')])
      activacion.resolve(socio(1, { razonSocial: 'Alfa', activo: true }))
      await flushPromises()

      expect(detalle(wrapper).text()).toContain('Suscripción reanudada correctamente.')
      expect(detalle(wrapper).find('form').exists()).toBe(false)
      expect(socioBoton(wrapper, 'Alfa').find('.subscription-badge').text()).toBe('Activo')
      expect(socioBoton(wrapper, 'Beta').find('.subscription-badge').text()).toBe('Activo')
      expect(detalle(wrapper).findAll('.subscription-timeline li')).toHaveLength(4)
    })

    it('programa el reingreso cuando la fecha es futura', async () => {
      const wrapper = await montarInactivo()
      await detalle(wrapper).find('input[type="date"]').setValue('2030-01-01')
      vi.mocked(socioService.activateSocio).mockResolvedValueOnce(socio(1, { razonSocial: 'Alfa', activo: false }))
      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([
        ...historialBaja(),
        entrada(4, 'REINGRESO_PROGRAMADO', '2030-01-01', { estado: 'PENDIENTE' }),
      ])
      await detalle(wrapper).find('form').trigger('submit')
      await flushPromises()

      expect(detalle(wrapper).text()).toContain('Reingreso programado. El socio seguirá inactivo hasta la fecha elegida.')
      const pendiente = detalle(wrapper).find('.subscription-resume')
      expect(pendiente.text()).toContain('Reingreso programado')
      expect(pendiente.find('strong').text()).toBe(new Date('2030-01-01T00:00:00').toLocaleDateString('es-UY'))
      expect(detalle(wrapper).find('form').exists()).toBe(false)
      const items = detalle(wrapper).findAll('.subscription-timeline li')
      expect(items[3].find('small').text()).toBe('Pendiente')

      // Con un reingreso pendiente no se puede enviar otra reanudación.
      expect(socioService.activateSocio).toHaveBeenCalledTimes(1)
    })

    it('muestra el error si no se puede reanudar', async () => {
      const wrapper = await montarInactivo()
      await detalle(wrapper).find('input[type="date"]').setValue('2024-01-10')
      vi.mocked(socioService.activateSocio).mockRejectedValueOnce(errorApi('Fecha inválida'))
      await detalle(wrapper).find('form').trigger('submit')
      await flushPromises()
      expect(detalle(wrapper).text()).toContain('Fecha inválida')
      expect(socioBoton(wrapper, 'Beta').attributes('disabled')).toBeUndefined()
    })
  })

  describe('cancelar reingreso programado', () => {
    async function montarPendiente() {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa', activo: false })])
      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([
        entrada(1, 'ALTA', '2020-01-15'),
        entrada(2, 'BAJA', '2023-06-30'),
        entrada(3, 'REINGRESO_PROGRAMADO', '2030-01-01', { estado: 'PENDIENTE' }),
      ])
      await socioBoton(wrapper, 'Alfa').trigger('click')
      await flushPromises()
      return wrapper
    }

    it('no cancela si el usuario no confirma', async () => {
      const wrapper = await montarPendiente()
      const confirmar = vi.fn(() => false)
      vi.stubGlobal('confirm', confirmar)
      await boton(detalle(wrapper), 'Cancelar programación').trigger('click')
      await flushPromises()
      expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('¿Cancelar el reingreso programado?'))
      expect(socioService.cancelReentry).not.toHaveBeenCalled()
    })

    it('cancela la programación y recarga el historial', async () => {
      const wrapper = await montarPendiente()
      vi.stubGlobal('confirm', vi.fn(() => true))
      const cancelacion = deferred<void>()
      vi.mocked(socioService.cancelReentry).mockReturnValueOnce(cancelacion.promise)
      await boton(detalle(wrapper), 'Cancelar programación').trigger('click')
      expect(socioService.cancelReentry).toHaveBeenCalledWith(1)

      // Un segundo click mientras se cancela se ignora.
      await clickForzado(boton(detalle(wrapper), 'Cancelar programación'))
      expect(socioService.cancelReentry).toHaveBeenCalledTimes(1)

      vi.mocked(socioService.subscriptionHistory).mockResolvedValueOnce([
        entrada(1, 'ALTA', '2020-01-15'),
        entrada(2, 'BAJA', '2023-06-30'),
        entrada(3, 'REINGRESO_PROGRAMADO', '2030-01-01', { estado: 'CANCELADO' }),
      ])
      cancelacion.resolve()
      await flushPromises()

      expect(detalle(wrapper).text()).toContain('Programación cancelada.')
      expect(detalle(wrapper).find('form').exists()).toBe(true)
      expect(socioService.subscriptionHistory).toHaveBeenLastCalledWith(1)
    })

    it('muestra el error al cancelar y oculta "Actualizar historial" mientras se guarda', async () => {
      const wrapper = await montarPendiente()
      vi.stubGlobal('confirm', vi.fn(() => true))
      vi.mocked(socioService.cancelReentry).mockRejectedValueOnce(errorApi('Ya fue aplicado'))
      await boton(detalle(wrapper), 'Cancelar programación').trigger('click')
      await flushPromises()
      expect(detalle(wrapper).text()).toContain('Ya fue aplicado')
      expect(detalle(wrapper).text()).toContain('Actualizar historial')
    })
  })
})

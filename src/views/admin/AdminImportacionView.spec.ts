// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils'
import AdminImportacionView from './AdminImportacionView.vue'
import {
  socioService,
  type ImportacionFila,
  type ImportacionPreview,
  type ImportacionResultado,
} from '../../services/socioService'
import { ApiRequestError } from '../../services/http'

vi.mock('../../services/socioService', () => ({
  socioService: { previewImportacion: vi.fn(), confirmarImportacion: vi.fn() },
}))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

function fila(filaExcel: number, estado: string, extra: Partial<ImportacionFila> = {}): ImportacionFila {
  return {
    filaExcel, estado, motivo: null, razonSocial: `Empresa ${filaExcel}`, bps: `10000000${filaExcel}`, rut: '211111110011',
    telefono: null, email: null, calle: null, numero: null, localidad: null, rubro: null, fechaAlta: null,
    fechaAniversario: null, camposFicticios: [], ...extra,
  }
}

function vistaPrevia(filas: ImportacionFila[], extra: Partial<ImportacionPreview['resumen']> = {}): ImportacionPreview {
  return {
    resumen: { total: filas.length, importables: 2, conFicticios: 1, duplicados: 1, errores: 1, inactivos: 1, creados: 0, ...extra },
    filas,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

type Wrapper = VueWrapper<InstanceType<typeof AdminImportacionView>>

const errorApi = (detalle: string) => new ApiRequestError(400, '/admin/socios/importacion', { detail: detalle }, detalle)

function montar() {
  return mount(AdminImportacionView, { global: { stubs: { AdminShell: AdminShellStub } } }) as Wrapper
}

function boton(raiz: Wrapper | DOMWrapper<Element>, texto: string) {
  const encontrado = raiz.findAll('button').find((b) => b.text().trim() === texto)
  if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`)
  return encontrado
}

function botones(raiz: Wrapper, texto: string) {
  return raiz.findAll('button').filter((b) => b.text().trim() === texto)
}

function botonConfirmar(wrapper: Wrapper) {
  const encontrado = wrapper.findAll('button').find((b) => b.text().startsWith('Confirmar importación') || b.text() === 'Importando...')
  if (!encontrado) throw new Error('No se encontró el botón de confirmación')
  return encontrado
}

async function elegirArchivo(wrapper: Wrapper, archivo: File | null) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: archivo ? [archivo] : [], configurable: true })
  await input.trigger('change')
}

// Simula un click que llega aunque el botón esté deshabilitado.
async function clickForzado(elemento: DOMWrapper<Element>) {
  elemento.element.removeAttribute('disabled')
  elemento.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

const archivo = () => new File(['xlsx'], 'padron.xlsx')

describe('carga masiva de socios', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('arranca sin archivo y no permite previsualizar', async () => {
    const wrapper = montar()
    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('importacion')
    expect(wrapper.find('.import-file span').text()).toBe('Elegir archivo .xlsx')
    expect(boton(wrapper, 'Previsualizar').attributes('disabled')).toBeDefined()
    expect(botones(wrapper, 'Cancelar subida')).toHaveLength(0)

    // Aunque el click llegue, sin archivo se pide seleccionarlo.
    await clickForzado(boton(wrapper, 'Previsualizar'))
    expect(wrapper.text()).toContain('Seleccioná un archivo Excel (.xlsx o .xls).')
    expect(socioService.previewImportacion).not.toHaveBeenCalled()
  })

  it('toma el archivo elegido y permite cancelar la subida', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    expect(wrapper.find('.import-file span').text()).toBe('padron.xlsx')
    expect(boton(wrapper, 'Previsualizar').attributes('disabled')).toBeUndefined()

    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    const asignaciones: string[] = []
    Object.defineProperty(input, 'value', { set: (valor: string) => asignaciones.push(valor), get: () => '', configurable: true })
    await boton(wrapper, 'Cancelar subida').trigger('click')
    expect(asignaciones).toEqual([''])
    expect(wrapper.find('.import-file span').text()).toBe('Elegir archivo .xlsx')
    expect(botones(wrapper, 'Cancelar subida')).toHaveLength(0)
  })

  it('si el cambio de archivo no trae archivos queda sin selección', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    await elegirArchivo(wrapper, null)
    expect(wrapper.find('.import-file span').text()).toBe('Elegir archivo .xlsx')
  })

  it('previsualiza el Excel mostrando resumen y filas por estado', async () => {
    const wrapper = montar()
    const archivoElegido = archivo()
    await elegirArchivo(wrapper, archivoElegido)

    const pedido = deferred<ImportacionPreview>()
    vi.mocked(socioService.previewImportacion).mockReturnValueOnce(pedido.promise)
    await boton(wrapper, 'Previsualizar').trigger('click')
    expect(socioService.previewImportacion).toHaveBeenCalledWith(archivoElegido)
    expect(boton(wrapper, 'Leyendo...').attributes('disabled')).toBeDefined()
    expect(botones(wrapper, 'Cancelar subida')).toHaveLength(0)

    pedido.resolve(vistaPrevia([
      fila(2, 'IMPORTABLE', { camposFicticios: ['bps', 'telefono', 'otroCampo'] }),
      fila(3, 'DUPLICADO', { motivo: 'BPS repetido' }),
      fila(4, 'INACTIVO'),
      fila(5, 'ERROR', { razonSocial: null, bps: null, rut: null, motivo: 'Falta razón social' }),
      fila(6, 'OTRO'),
    ]))
    await flushPromises()

    const stats = wrapper.findAll('.import-stats article').map((a) => a.find('strong').text())
    expect(stats).toEqual(['5', '2', '1', '1', '1', '1'])

    const filas = wrapper.findAll('tbody tr')
    expect(filas).toHaveLength(5)
    expect(filas[0].find('.cash-status').classes()).toContain('cash-status--green')
    expect(filas[0].find('.cash-status').text()).toBe('Se va a importar')
    expect(filas[0].findAll('.import-tags b').map((b) => b.text())).toEqual(['BPS', 'Teléfono', 'otroCampo'])
    expect(filas[0].findAll('td')[6].text()).toBe('—')
    expect(filas[1].find('.cash-status').classes()).toContain('cash-status--yellow')
    expect(filas[1].find('.cash-status').text()).toBe('Duplicado')
    expect(filas[1].findAll('td')[5].text()).toBe('—')
    expect(filas[1].findAll('td')[6].text()).toBe('BPS repetido')
    expect(filas[2].find('.cash-status').classes()).toContain('cash-status--red')
    expect(filas[2].find('.cash-status').text()).toBe('Inactivo')
    expect(filas[3].find('.cash-status').text()).toBe('Error')
    expect(filas[3].findAll('td').slice(2, 5).map((td) => td.text())).toEqual(['—', '—', '—'])
    expect(filas[4].find('.cash-status').classes()).toContain('cash-status--red')
    expect(filas[4].find('.cash-status').text()).toBe('Error')

    expect(botonConfirmar(wrapper).text()).toBe('Confirmar importación (2)')
    expect(botonConfirmar(wrapper).attributes('disabled')).toBeUndefined()
    // Hay dos botones de cancelar: el de la subida y el de la previsualización.
    expect(botones(wrapper, 'Cancelar subida')).toHaveLength(2)
  })

  it('muestra 0 inactivos si el resumen no los informa y no permite importar sin filas válidas', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(
      vistaPrevia([fila(2, 'ERROR')], { importables: 0, inactivos: undefined }),
    )
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.import-stats article')[4].find('strong').text()).toBe('0')
    expect(botonConfirmar(wrapper).attributes('disabled')).toBeDefined()
    await clickForzado(botonConfirmar(wrapper))
    expect(socioService.confirmarImportacion).not.toHaveBeenCalled()
  })

  it('muestra el error de previsualización y descarta la vista previa anterior', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(vistaPrevia([fila(2, 'IMPORTABLE')]))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()
    expect(wrapper.find('tbody').exists()).toBe(true)

    vi.mocked(socioService.previewImportacion).mockRejectedValueOnce(errorApi('El archivo no tiene encabezado'))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('El archivo no tiene encabezado')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('confirma la importación y muestra el resultado con inactivos', async () => {
    const wrapper = montar()
    const archivoElegido = archivo()
    await elegirArchivo(wrapper, archivoElegido)
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(vistaPrevia([fila(2, 'IMPORTABLE')]))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()

    const importacion = deferred<ImportacionResultado>()
    vi.mocked(socioService.confirmarImportacion).mockReturnValueOnce(importacion.promise)
    await botonConfirmar(wrapper).trigger('click')
    expect(socioService.confirmarImportacion).toHaveBeenCalledWith(archivoElegido)
    expect(botonConfirmar(wrapper).text()).toBe('Importando...')
    expect(boton(wrapper, 'Previsualizar').attributes('disabled')).toBeDefined()

    // Cancelar durante la importación no tiene efecto.
    await clickForzado(botones(wrapper, 'Cancelar subida')[0])
    expect(wrapper.find('.import-file span').text()).toBe('padron.xlsx')

    importacion.resolve({
      resumen: { total: 1, importables: 1, conFicticios: 0, duplicados: 0, errores: 0, inactivos: 3, creados: 7 },
      omitidas: [],
    })
    await flushPromises()

    const resultado = wrapper.findAll('section.fee-panel').at(-1)!
    expect(resultado.text()).toContain('3. Resultado')
    expect(resultado.find('strong').text()).toBe('7')
    expect(resultado.text()).toContain('(3 inactivos)')
    // Con resultado ya no se ofrece cancelar la subida.
    expect(botones(wrapper, 'Cancelar subida')).toHaveLength(0)

    await boton(wrapper, 'Nueva carga').trigger('click')
    expect(wrapper.text()).not.toContain('3. Resultado')
    expect(wrapper.text()).not.toContain('2. Previsualización')
    expect(wrapper.find('.import-file span').text()).toBe('Elegir archivo .xlsx')
  })

  it('omite la cantidad de inactivos en el resultado si no hay', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(vistaPrevia([fila(2, 'IMPORTABLE')]))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()
    vi.mocked(socioService.confirmarImportacion).mockResolvedValueOnce({
      resumen: { total: 1, importables: 1, conFicticios: 0, duplicados: 0, errores: 0, inactivos: 0, creados: 1 },
      omitidas: [],
    })
    await botonConfirmar(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('3. Resultado')
    expect(wrapper.text()).not.toContain('inactivos)')
  })

  it('muestra el error de importación y mantiene la previsualización', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(vistaPrevia([fila(2, 'IMPORTABLE')]))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()
    vi.mocked(socioService.confirmarImportacion).mockRejectedValueOnce(errorApi('Importación interrumpida'))
    await botonConfirmar(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Importación interrumpida')
    expect(wrapper.text()).toContain('2. Previsualización')
    expect(botonConfirmar(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('cambiar de archivo descarta la previsualización anterior', async () => {
    const wrapper = montar()
    await elegirArchivo(wrapper, archivo())
    vi.mocked(socioService.previewImportacion).mockResolvedValueOnce(vistaPrevia([fila(2, 'IMPORTABLE')]))
    await boton(wrapper, 'Previsualizar').trigger('click')
    await flushPromises()
    await elegirArchivo(wrapper, new File(['otro'], 'otro.xlsx'))
    expect(wrapper.text()).not.toContain('2. Previsualización')
    expect(wrapper.find('.import-file span').text()).toBe('otro.xlsx')
  })
})

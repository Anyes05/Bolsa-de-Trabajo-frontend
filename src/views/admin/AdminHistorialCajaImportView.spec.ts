// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AdminHistorialCajaImportView from './AdminHistorialCajaImportView.vue'
import { cajaService } from '../../services/cajaService'
import { socioService } from '../../services/socioService'
import { cajaHistorialImportacionExcel } from '../../services/cajaHistorialImportacionExcel'
import type { SocioRecord } from '../../services/types'

vi.mock('../../services/cajaService', () => ({
  cajaService: { previewHistorialImportacion: vi.fn(), importarHistorial: vi.fn() },
}))
vi.mock('../../services/socioService', () => ({ socioService: { pageSocios: vi.fn() } }))
vi.mock('../../services/cajaHistorialImportacionExcel', () => ({
  cajaHistorialImportacionExcel: { downloadTemplate: vi.fn() },
}))

const AdminShellStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.())
  },
})

const socio: SocioRecord = {
  id: 8, bps: null, cedula: null, tipoIdentificador: null, razonSocial: 'Socio de prueba',
  rut: '211111111111', telefono: null, emailContacto: null, emailUsuario: null, fotoUrl: null,
  calle: null, numero: null, localidad: null, rubroId: null, nombreRubro: null,
  estadoMorosidad: 'AL_DIA', esDirectivo: false, fechaAlta: null, fechaBaja: null,
  fechaAniversario: null, activo: true,
}

const importPreview = {
  socioId: socio.id,
  razonSocial: socio.razonSocial,
  resumen: { total: 1, importables: 1, duplicados: 0, errores: 0, creados: 0 },
  filas: [{
    filaExcel: 2, periodo: '2024-03', montoCuota: 1250, fechaVencimiento: '2024-04-30', fechaPago: '2024-04-15',
    montoPagado: 1250, metodoPago: 'TRANSFERENCIA', referencia: null,
    observaciones: null, estado: 'IMPORTABLE', motivo: null,
  }],
}

describe('importación temporal de historial de caja', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(socioService.pageSocios).mockResolvedValue({
      content: [socio], page: 0, size: 8, totalElements: 1, totalPages: 1,
    })
    vi.mocked(cajaService.previewHistorialImportacion).mockResolvedValue(importPreview)
    vi.mocked(cajaService.importarHistorial).mockResolvedValue({
      ...importPreview,
      resumen: { ...importPreview.resumen, importables: 0, creados: 1 },
      filas: [{ ...importPreview.filas[0], estado: 'IMPORTADO' }],
    })
    vi.mocked(cajaHistorialImportacionExcel.downloadTemplate).mockResolvedValue(undefined)
  })

  it('previsualiza y confirma las cuotas del socio elegido', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(AdminHistorialCajaImportView, {
      global: { stubs: { AdminShell: AdminShellStub, PaginationBar: true } },
    })
    await flushPromises()

    await wrapper.find('.subscription-company').trigger('click')
    const file = new File(['excel'], 'historial.xlsx')
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
    await input.trigger('change')
    await wrapper.findAll('button').find((button) => button.text().includes('Previsualizar Excel'))!.trigger('click')
    await flushPromises()

    expect(cajaService.previewHistorialImportacion).toHaveBeenCalledWith(socio.id, file)
    expect(wrapper.text()).toContain('2024-03')
    expect(wrapper.text()).toContain('TRANSFERENCIA')

    await wrapper.findAll('button').find((button) => button.text().includes('Confirmar e importar'))!.trigger('click')
    await flushPromises()

    expect(cajaService.importarHistorial).toHaveBeenCalledWith(socio.id, file)
    expect(wrapper.text()).toContain('Se importaron 1 cuotas pagadas.')
  })
})

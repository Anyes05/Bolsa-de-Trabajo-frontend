// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils'
import AdminSociosView from './AdminSociosView.vue'
import { socioService } from '../../services/socioService'
import { sociosExcelService } from '../../services/sociosExcelService'
import { ApiRequestError } from '../../services/http'
import type { SocioRecord } from '../../services/types'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

vi.mock('../../services/socioService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/socioService')>()
  return {
    ...original,
    socioService: {
      getSocios: vi.fn(), getRubros: vi.fn(), updateSocio: vi.fn(), deleteSocio: vi.fn(),
      habilitarAcceso: vi.fn(), resetClaveProvisional: vi.fn(),
    },
  }
})
vi.mock('../../services/sociosExcelService', () => ({ sociosExcelService: { download: vi.fn() } }))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active, 'data-title': props.title }, slots.default?.())
  },
})

const RouterLinkStub = defineComponent({
  props: { to: [String, Object] },
  setup(props, { slots }) {
    return () => h('a', { href: String(props.to) }, slots.default?.())
  },
})

function socio(id: number, extra: Partial<SocioRecord> = {}): SocioRecord {
  return {
    id, bps: `10000000${id}`, cedula: null, tipoIdentificador: 'BPS', razonSocial: `Socio ${id}`, rut: '211111110011',
    telefono: '099123456', emailContacto: null, emailUsuario: null, fotoUrl: null,
    calle: 'Artigas', numero: '123', localidad: 'San José de Mayo', rubroId: 1, nombreRubro: 'Comercio',
    estadoMorosidad: 'AL_DIA', esDirectivo: false, fechaAlta: '2020-01-15', fechaBaja: null,
    fechaAniversario: '2020-03-01', activo: true, ...extra,
  }
}

const rubros = [{ id: 1, nombreRubro: 'Comercio' }, { id: 2, nombreRubro: 'Industria' }]

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

type Wrapper = VueWrapper<InstanceType<typeof AdminSociosView>>

async function montar(lista: SocioRecord[]) {
  vi.mocked(socioService.getSocios).mockResolvedValueOnce(lista)
  vi.mocked(socioService.getRubros).mockResolvedValueOnce(rubros)
  const wrapper = mount(AdminSociosView, {
    global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } },
  }) as Wrapper
  await flushPromises()
  return wrapper
}

function boton(raiz: Wrapper | DOMWrapper<Element>, texto: string) {
  const encontrado = raiz.findAll('button').find((b) => b.text().trim() === texto)
  if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`)
  return encontrado
}

function fila(wrapper: Wrapper, razonSocial: string) {
  const encontrada = wrapper.findAll('tbody tr').find((tr) => tr.text().includes(razonSocial))
  if (!encontrada) throw new Error(`No se encontró la fila ${razonSocial}`)
  return encontrada
}

function modal(wrapper: Wrapper) {
  return wrapper.find('[aria-labelledby="edit-socio-title"]')
}

function campo(wrapper: Wrapper, etiqueta: string) {
  const label = modal(wrapper).findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) throw new Error(`No se encontró el campo ${etiqueta}`)
  return label
}

async function abrirEdicion(wrapper: Wrapper, razonSocial: string) {
  await boton(fila(wrapper, razonSocial), 'Editar').trigger('click')
}

// Simula un click que llega aunque el botón esté deshabilitado (p. ej. doble click durante una carga).
async function clickForzado(elemento: DOMWrapper<Element>) {
  elemento.element.removeAttribute('disabled')
  elemento.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

const errorApi = (detalle: string) => new ApiRequestError(400, '/admin/socios', { detail: detalle }, detalle)

describe('gestión de socios del administrador', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('carga y listado', () => {
    it('muestra el aviso de carga mientras llegan los datos', async () => {
      const socios = deferred<SocioRecord[]>()
      vi.mocked(socioService.getSocios).mockReturnValueOnce(socios.promise)
      vi.mocked(socioService.getRubros).mockResolvedValueOnce(rubros)
      const wrapper = mount(AdminSociosView, {
        global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } },
      })
      await nextTick()
      expect(wrapper.text()).toContain('Cargando socios...')
      socios.resolve([])
      await flushPromises()
      expect(wrapper.text()).toContain('No hay socios para mostrar.')
      expect(wrapper.find('[data-active]').attributes('data-active')).toBe('socios')
      expect(boton(wrapper as Wrapper, 'Descargar Excel').attributes('disabled')).toBeDefined()
    })

    it('informa si falla la carga del listado', async () => {
      vi.mocked(socioService.getSocios).mockRejectedValueOnce(errorApi('Servidor caído'))
      vi.mocked(socioService.getRubros).mockResolvedValueOnce(rubros)
      const wrapper = mount(AdminSociosView, {
        global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } },
      })
      await flushPromises()
      expect(wrapper.text()).toContain('Servidor caído')
      expect(wrapper.find('table').exists()).toBe(false)
    })

    it('renderiza cada socio con identificador, etiquetas, estado y fechas', async () => {
      const wrapper = await montar([
        socio(1, {
          razonSocial: 'Ferretería  del Centro', esDirectivo: true, emailUsuario: 'cuenta@f.com', emailContacto: 'contacto@f.com',
          fechaBaja: '2024-05-10', camposFicticios: ['bps'], importadoMasivo: true, accesoHabilitado: false,
        }),
        socio(2, {
          razonSocial: 'beta', bps: null, cedula: '12345678', tipoIdentificador: 'CEDULA', rut: null, nombreRubro: null,
          estadoMorosidad: 'MOROSO', fechaAlta: null, activo: false,
        }),
        socio(3, { razonSocial: 'Gamma', estadoMorosidad: 'INACTIVO', fechaAlta: 'sin-fecha', accesoHabilitado: false }),
      ])

      expect(wrapper.text()).toContain('3 de 3 socios listados')
      expect(wrapper.find('a[href="/admin/socios/importacion"]').text()).toBe('Carga masiva')
      expect(wrapper.find('a[href="/admin/socios/nueva"]').text()).toContain('Nuevo Socio')

      const primera = fila(wrapper, 'Ferretería')
      expect(primera.text()).toContain('BPS 100000001')
      expect(primera.text()).toContain('Datos incompletos')
      expect(primera.text()).toContain('Sin acceso')
      expect(primera.text()).toContain('Cuenta: cuenta@f.com')
      expect(primera.text()).toContain('Contacto: contacto@f.com')
      expect(primera.find('.cash-status--green').text()).toBe('Al día')
      expect(primera.findAll('td')[4].text()).toBe('Sí')
      expect(primera.findAll('td')[6].text()).not.toBe('—')
      expect(primera.find('.company-toggle').classes()).toContain('company-toggle--on')
      expect(primera.find('.company-toggle').attributes('aria-label')).toBe('Dar de baja al socio')

      const segunda = fila(wrapper, 'beta')
      expect(segunda.text()).toContain('Cédula 12345678')
      expect(segunda.text()).not.toContain('Datos incompletos')
      expect(segunda.text()).not.toContain('Cuenta:')
      expect(segunda.findAll('td')[1].text()).toBe('—')
      expect(segunda.findAll('td')[2].text()).toBe('—')
      expect(segunda.find('.cash-status--yellow').text()).toBe('Moroso')
      expect(segunda.findAll('td')[4].text()).toBe('No')
      expect(segunda.findAll('td')[5].text()).toBe('—')
      expect(segunda.findAll('td')[6].text()).toBe('—')
      expect(segunda.find('.company-toggle').attributes('aria-label')).toBe('Reactivar socio')

      const tercera = fila(wrapper, 'Gamma')
      expect(tercera.find('.cash-status--red').text()).toBe('Inactivo')
      expect(tercera.findAll('td')[5].text()).toBe('sin-fecha')
      // Sin carga masiva no se marca "Sin acceso" aunque el acceso esté deshabilitado.
      expect(tercera.text()).not.toContain('Sin acceso')
    })

    it('filtra por texto en varios campos y por datos incompletos', async () => {
      const wrapper = await montar([
        socio(1, { razonSocial: 'Alfa', camposFicticios: ['rut'] }),
        socio(2, { razonSocial: 'Beta', nombreRubro: 'Industria', accesoHabilitado: false }),
        socio(3, { razonSocial: 'Gamma', emailContacto: 'ventas@gamma.uy', rut: null, nombreRubro: null }),
      ])

      const buscador = wrapper.find('input[aria-label^="Buscar socios"]')
      await buscador.setValue('  INDUSTRIA ')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.text()).toContain('1 de 3 socios listados')

      await buscador.setValue('ventas@')
      expect(wrapper.findAll('tbody tr').map((tr) => tr.find('strong').text())).toEqual(['Gamma'])

      await buscador.setValue('nadie')
      expect(wrapper.text()).toContain('No hay socios para mostrar.')

      await buscador.setValue('')
      await wrapper.find('input[type="checkbox"]').setValue(true)
      expect(wrapper.findAll('tbody tr').map((tr) => tr.find('strong').text())).toEqual(['Alfa', 'Beta'])

      await buscador.setValue('alfa')
      expect(wrapper.findAll('tbody tr').map((tr) => tr.find('strong').text())).toEqual(['Alfa'])
    })
  })

  describe('descarga de Excel', () => {
    it('descarga una copia del listado e indica el progreso', async () => {
      const lista = [socio(1), socio(2)]
      const wrapper = await montar(lista)
      const descarga = deferred<void>()
      vi.mocked(sociosExcelService.download).mockReturnValueOnce(descarga.promise)

      await boton(wrapper, 'Descargar Excel').trigger('click')
      expect(wrapper.text()).toContain('Descargando...')
      const enviados = vi.mocked(sociosExcelService.download).mock.calls[0][0]
      expect(enviados).toEqual(lista)
      expect(enviados).not.toBe(lista)

      // Un segundo click durante la descarga se ignora.
      await clickForzado(boton(wrapper, 'Descargando...'))
      expect(sociosExcelService.download).toHaveBeenCalledTimes(1)

      descarga.resolve()
      await flushPromises()
      expect(boton(wrapper, 'Descargar Excel').attributes('disabled')).toBeUndefined()
    })

    it('ignora la descarga si no hay socios y muestra el error si falla', async () => {
      const vacio = await montar([])
      await clickForzado(boton(vacio, 'Descargar Excel'))
      expect(sociosExcelService.download).not.toHaveBeenCalled()

      const wrapper = await montar([socio(1)])
      vi.mocked(sociosExcelService.download).mockRejectedValueOnce(errorApi('No se pudo generar'))
      await boton(wrapper, 'Descargar Excel').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('No se pudo generar')
    })

    it('no descarga mientras el listado sigue cargando', async () => {
      const socios = deferred<SocioRecord[]>()
      vi.mocked(socioService.getSocios).mockReturnValueOnce(socios.promise)
      vi.mocked(socioService.getRubros).mockResolvedValueOnce(rubros)
      const wrapper = mount(AdminSociosView, {
        global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } },
      }) as Wrapper
      await clickForzado(boton(wrapper, 'Descargar Excel'))
      expect(sociosExcelService.download).not.toHaveBeenCalled()
      socios.resolve([])
      await flushPromises()
    })
  })

  describe('alta y baja', () => {
    it('da de baja a un socio activo y refleja el resultado', async () => {
      const wrapper = await montar([socio(1), socio(2)])
      vi.mocked(socioService.deleteSocio).mockResolvedValueOnce(socio(1, { activo: false }))

      await fila(wrapper, 'Socio 1').find('.company-toggle').trigger('click')
      await flushPromises()

      expect(socioService.deleteSocio).toHaveBeenCalledWith(1)
      expect(fila(wrapper, 'Socio 1').find('.company-toggle').attributes('aria-label')).toBe('Reactivar socio')
      expect(fila(wrapper, 'Socio 2').find('.company-toggle').attributes('aria-label')).toBe('Dar de baja al socio')
    })

    it('muestra el error si falla la baja', async () => {
      const wrapper = await montar([socio(1)])
      vi.mocked(socioService.deleteSocio).mockRejectedValueOnce(errorApi('Tiene deuda pendiente'))
      await fila(wrapper, 'Socio 1').find('.company-toggle').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Tiene deuda pendiente')
    })

    it('para reactivar navega al historial de suscripción del socio', async () => {
      const wrapper = await montar([socio(5, { activo: false })])
      await fila(wrapper, 'Socio 5').find('.company-toggle').trigger('click')
      await flushPromises()
      expect(push).toHaveBeenCalledWith({ name: 'admin-socios-historial', query: { socio: 5 } })
      expect(socioService.deleteSocio).not.toHaveBeenCalled()
    })
  })

  describe('edición', () => {
    it('precarga el formulario con los datos del socio y se cierra con cancelar o el fondo', async () => {
      const wrapper = await montar([socio(1, {
        razonSocial: 'Alfa', rubroId: 2, esDirectivo: true, localidad: 'Localidad vieja', fechaAlta: '2020-01-15T00:00:00',
        estadoMorosidad: 'MOROSO', emailUsuario: 'cuenta@alfa.uy',
      })])
      await abrirEdicion(wrapper, 'Alfa')

      expect(modal(wrapper).exists()).toBe(true)
      expect(modal(wrapper).text()).toContain('El identificador de acceso (BPS o cédula) y el email de cuenta no se cambian aquí.')
      expect(modal(wrapper).find('.socio-ficticios-list').exists()).toBe(false)
      expect((campo(wrapper, 'Razón social').find('input').element as HTMLInputElement).value).toBe('Alfa')
      expect((campo(wrapper, 'Identificador de acceso').find('input').element as HTMLInputElement).value).toBe('BPS 100000001')
      expect(campo(wrapper, 'Identificador de acceso').find('input').attributes('readonly')).toBeDefined()
      expect(campo(wrapper, 'Identificador de acceso').text()).toContain('Se define solo en el alta')
      expect(campo(wrapper, 'RUT o cédula').text()).toContain('Si no tiene RUT, va la cédula.')
      expect((campo(wrapper, 'Email de cuenta').find('input').element as HTMLInputElement).value).toBe('cuenta@alfa.uy')
      expect(campo(wrapper, 'Email de cuenta').text()).toContain('Con este correo se registró el usuario.')
      expect(campo(wrapper, 'Email de contacto').text()).toContain('Con este correo se contacta a la firma.')
      expect((campo(wrapper, 'Fecha de alta').find('input').element as HTMLInputElement).value).toBe('2020-01-15')
      expect((campo(wrapper, 'Rubro').find('select').element as HTMLSelectElement).value).toBe('2')
      expect((campo(wrapper, 'Estado de cuenta').find('select').element as HTMLSelectElement).value).toBe('MOROSO')
      expect((campo(wrapper, 'Es directivo').find('input').element as HTMLInputElement).checked).toBe(true)
      // La localidad que no está en el catálogo se agrega como opción.
      const localidades = campo(wrapper, 'Localidad').findAll('option').map((o) => o.text())
      expect(localidades[1]).toBe('Localidad vieja')
      expect((campo(wrapper, 'Localidad').find('select').element as HTMLSelectElement).value).toBe('Localidad vieja')
      expect(modal(wrapper).text()).not.toContain('Habilitar acceso')

      await boton(modal(wrapper), 'Cancelar').trigger('click')
      expect(modal(wrapper).exists()).toBe(false)

      await abrirEdicion(wrapper, 'Alfa')
      await modal(wrapper).find('.admin-modal__backdrop').trigger('click')
      expect(modal(wrapper).exists()).toBe(false)
    })

    it('usa valores vacíos cuando el socio no tiene datos opcionales', async () => {
      const wrapper = await montar([socio(1, {
        razonSocial: 'Vacio', bps: null, rut: null, telefono: null, calle: null, numero: null, localidad: null,
        rubroId: null, fechaAlta: null, fechaAniversario: null, emailUsuario: null, emailContacto: null,
      })])
      await abrirEdicion(wrapper, 'Vacio')
      for (const etiqueta of ['RUT o cédula', 'Teléfono', 'Calle', 'Nro puerta', 'Fecha de alta', 'Fecha de aniversario', 'Email de contacto']) {
        expect((campo(wrapper, etiqueta).find('input').element as HTMLInputElement).value).toBe('')
      }
      expect((campo(wrapper, 'Email de cuenta').find('input').element as HTMLInputElement).value).toBe('')
      expect((campo(wrapper, 'Rubro').find('select').element as HTMLSelectElement).value).toBe('')
      expect((campo(wrapper, 'Identificador de acceso').find('input').element as HTMLInputElement).value).toBe('Sin identificador')
    })

    it('marca los campos provisionales de la carga masiva y permite editarlos', async () => {
      const todos = ['bps', 'rut', 'telefono', 'emailUsuario', 'emailContacto', 'fechaAlta', 'fechaAniversario', 'rubro', 'calle', 'numero', 'localidad']
      const wrapper = await montar([socio(1, {
        razonSocial: 'Importado', importadoMasivo: true, camposFicticios: todos, accesoHabilitado: false, emailUsuario: 'tmp@ficticio',
      })])
      await abrirEdicion(wrapper, 'Importado')

      expect(modal(wrapper).text()).toContain('Los campos en amarillo son datos provisionales')
      expect(modal(wrapper).find('.socio-ficticios-list').text()).toContain('Provisionales: BPS, RUT, Teléfono, Email de cuenta')
      expect(modal(wrapper).findAll('.field-ficticio')).toHaveLength(todos.length)
      expect(campo(wrapper, 'Identificador de acceso').find('input').attributes('readonly')).toBeUndefined()
      expect(campo(wrapper, 'Identificador de acceso').text()).toContain('Completá el BPS real.')
      expect(campo(wrapper, 'RUT o cédula').text()).toContain('Completá el RUT o cédula real.')
      expect(campo(wrapper, 'Teléfono').text()).toContain('Completá el teléfono real.')
      expect(campo(wrapper, 'Email de cuenta').text()).toContain('Completá el email real de la cuenta.')
      expect(campo(wrapper, 'Email de contacto').text()).toContain('Completá el email de contacto real.')
      expect(campo(wrapper, 'Fecha de alta').text()).toContain('Fecha provisional.')
      expect(campo(wrapper, 'Fecha de aniversario').text()).toContain('vino vacía en el Excel')
      expect(campo(wrapper, 'Calle').text()).toContain('Completá la dirección real.')
      expect(modal(wrapper).text()).toContain('Habilitar acceso')

      await campo(wrapper, 'Identificador de acceso').find('input').setValue('123.456.789-0')
      await campo(wrapper, 'Email de cuenta').find('input').setValue('  real@empresa.uy ')
      vi.mocked(socioService.updateSocio).mockResolvedValueOnce(socio(1, { razonSocial: 'Importado' }))
      await modal(wrapper).find('form').trigger('submit')
      await flushPromises()

      expect(socioService.updateSocio).toHaveBeenCalledWith(1, expect.objectContaining({
        bps: '1234567890', emailUsuario: 'real@empresa.uy',
      }))
    })

    it('envía el email de cuenta provisional como null si se deja vacío', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Importado', camposFicticios: ['emailUsuario'] })])
      await abrirEdicion(wrapper, 'Importado')
      await campo(wrapper, 'Email de cuenta').find('input').setValue('   ')
      vi.mocked(socioService.updateSocio).mockResolvedValueOnce(socio(1, { razonSocial: 'Importado' }))
      await modal(wrapper).find('form').trigger('submit')
      await flushPromises()
      expect(socioService.updateSocio).toHaveBeenCalledWith(1, expect.objectContaining({ emailUsuario: null, bps: undefined }))
    })

    it('valida RUT o cédula y rubro antes de guardar', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa', rubroId: null })])
      await abrirEdicion(wrapper, 'Alfa')

      await campo(wrapper, 'RUT o cédula').find('input').setValue('1234')
      await modal(wrapper).find('form').trigger('submit')
      expect(modal(wrapper).text()).toContain('Ingresa un RUT (12 dígitos) o una cédula (8 dígitos).')

      await campo(wrapper, 'RUT o cédula').find('input').setValue('1.234.567-8')
      await modal(wrapper).find('form').trigger('submit')
      expect(modal(wrapper).text()).toContain('Selecciona un rubro.')
      expect(socioService.updateSocio).not.toHaveBeenCalled()
    })

    it('guarda los cambios normalizando el payload y actualiza la fila', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' }), socio(2, { razonSocial: 'Beta' })])
      await abrirEdicion(wrapper, 'Alfa')

      await campo(wrapper, 'Razón social').find('input').setValue('  Alfa Renovada  ')
      await campo(wrapper, 'RUT o cédula').find('input').setValue('21.111.111-0011')
      await campo(wrapper, 'Teléfono').find('input').setValue('  ')
      await campo(wrapper, 'Email de contacto').find('input').setValue(' hola@alfa.uy ')
      await campo(wrapper, 'Calle').find('input').setValue(' 18 de Julio ')
      await campo(wrapper, 'Nro puerta').find('input').setValue('')
      await campo(wrapper, 'Fecha de alta').find('input').setValue('')
      await campo(wrapper, 'Fecha de aniversario').find('input').setValue('2021-06-01')
      await campo(wrapper, 'Rubro').find('select').setValue('2')
      await campo(wrapper, 'Estado de cuenta').find('select').setValue('INACTIVO')
      await campo(wrapper, 'Localidad').find('select').setValue('Libertad')
      await campo(wrapper, 'Es directivo').find('input').setValue(true)

      const guardado = deferred<SocioRecord>()
      vi.mocked(socioService.updateSocio).mockReturnValueOnce(guardado.promise)
      await modal(wrapper).find('form').trigger('submit')
      expect(boton(modal(wrapper), 'Guardando...').attributes('disabled')).toBeDefined()

      expect(socioService.updateSocio).toHaveBeenCalledWith(1, {
        bps: undefined,
        emailUsuario: undefined,
        razonSocial: 'Alfa Renovada',
        rut: '211111110011',
        telefono: null,
        emailContacto: 'hola@alfa.uy',
        calle: '18 de Julio',
        numero: null,
        localidad: 'Libertad',
        rubroId: 2,
        esDirectivo: true,
        fechaAlta: null,
        fechaAniversario: '2021-06-01',
        estadoMorosidad: 'INACTIVO',
      })

      guardado.resolve(socio(1, { razonSocial: 'Alfa Renovada', nombreRubro: 'Industria' }))
      await flushPromises()
      expect(modal(wrapper).exists()).toBe(false)
      expect(fila(wrapper, 'Alfa Renovada').text()).toContain('Industria')
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('muestra el error de guardado y mantiene el modal abierto', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      await abrirEdicion(wrapper, 'Alfa')
      vi.mocked(socioService.updateSocio).mockRejectedValueOnce(errorApi('El RUT ya existe'))
      await modal(wrapper).find('form').trigger('submit')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('El RUT ya existe')
      expect(boton(modal(wrapper), 'Guardar cambios').attributes('disabled')).toBeUndefined()
    })
  })

  describe('acceso y clave provisional', () => {
    it('habilita el acceso mostrando la clave y el mensaje del backend', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Importado', importadoMasivo: true, accesoHabilitado: false })])
      await abrirEdicion(wrapper, 'Importado')

      const pedido = deferred<SocioRecord>()
      vi.mocked(socioService.habilitarAcceso).mockReturnValueOnce(pedido.promise)
      await boton(modal(wrapper), 'Habilitar acceso y enviar clave').trigger('click')
      expect(boton(modal(wrapper), 'Habilitando...').attributes('disabled')).toBeDefined()
      expect(socioService.habilitarAcceso).toHaveBeenCalledWith(1)

      pedido.resolve(socio(1, {
        razonSocial: 'Importado', importadoMasivo: true, accesoHabilitado: true,
        passwordProvisional: 'Clave-123', credencialesEnvioMensaje: 'Credenciales enviadas a cuenta@x.uy',
      }))
      await flushPromises()

      expect(modal(wrapper).text()).toContain('Credenciales enviadas a cuenta@x.uy')
      expect(modal(wrapper).text()).toContain('Clave provisional generada')
      expect((modal(wrapper).find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe('Clave-123')
      expect(modal(wrapper).text()).not.toContain('Habilitar acceso y enviar clave')
      expect(fila(wrapper, 'Importado').text()).not.toContain('Sin acceso')
    })

    it('usa un mensaje por defecto al habilitar si el backend no envía uno ni clave', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Importado', accesoHabilitado: false })])
      await abrirEdicion(wrapper, 'Importado')
      vi.mocked(socioService.habilitarAcceso).mockResolvedValueOnce(socio(1, { razonSocial: 'Importado', accesoHabilitado: false }))
      await boton(modal(wrapper), 'Habilitar acceso y enviar clave').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('Acceso habilitado. Comunicá la clave provisional al socio.')
      expect(modal(wrapper).text()).not.toContain('Clave provisional generada')
    })

    it('muestra el error si no se puede habilitar el acceso', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Importado', accesoHabilitado: false })])
      await abrirEdicion(wrapper, 'Importado')
      vi.mocked(socioService.habilitarAcceso).mockRejectedValueOnce(errorApi('El BPS sigue siendo provisional'))
      await boton(modal(wrapper), 'Habilitar acceso y enviar clave').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('El BPS sigue siendo provisional')
      expect(boton(modal(wrapper), 'Habilitar acceso y enviar clave').attributes('disabled')).toBeUndefined()
    })

    it('restablece la clave provisional y la limpia al cerrar', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      await abrirEdicion(wrapper, 'Alfa')
      const pedido = deferred<SocioRecord>()
      vi.mocked(socioService.resetClaveProvisional).mockReturnValueOnce(pedido.promise)

      await boton(modal(wrapper), 'Generar nueva clave').trigger('click')
      expect(boton(modal(wrapper), 'Generando...').attributes('disabled')).toBeDefined()
      expect(socioService.resetClaveProvisional).toHaveBeenCalledWith(1)
      pedido.resolve(socio(1, { razonSocial: 'Alfa', passwordProvisional: 'Nueva-456' }))
      await flushPromises()

      expect(modal(wrapper).text()).toContain('Clave provisional generada. Comunícasela al socio: tiene 24 horas para cambiarla.')
      expect((modal(wrapper).find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe('Nueva-456')

      await boton(modal(wrapper), 'Cancelar').trigger('click')
      await abrirEdicion(wrapper, 'Alfa')
      expect(modal(wrapper).text()).not.toContain('Comunícasela al socio')
    })

    it('restablece aunque el backend no devuelva la clave y muestra errores', async () => {
      const wrapper = await montar([socio(1, { razonSocial: 'Alfa' })])
      await abrirEdicion(wrapper, 'Alfa')
      vi.mocked(socioService.resetClaveProvisional).mockResolvedValueOnce(socio(1, { razonSocial: 'Alfa' }))
      await boton(modal(wrapper), 'Generar nueva clave').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('Comunícasela al socio')
      expect(modal(wrapper).text()).not.toContain('Clave provisional generada\n')
      expect(modal(wrapper).find('input[autocomplete="off"]').exists()).toBe(false)

      vi.mocked(socioService.resetClaveProvisional).mockRejectedValueOnce(errorApi('Socio sin email'))
      await boton(modal(wrapper), 'Generar nueva clave').trigger('click')
      await flushPromises()
      expect(modal(wrapper).text()).toContain('Socio sin email')
      expect(modal(wrapper).text()).not.toContain('Comunícasela al socio')
    })
  })
})

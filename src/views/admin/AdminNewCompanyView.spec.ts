// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { DOMWrapper, flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { ApiRequestError } from '../../services/http'
import { socioService } from '../../services/socioService'
import type { CredencialesEnviadas, SocioRecord } from '../../services/types'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

vi.mock('../../services/socioService', () => ({
  socioService: { getRubros: vi.fn(), createSocio: vi.fn(), enviarCredenciales: vi.fn() },
}))

// El layout administrativo se reemplaza por un contenedor que renderiza el contenido y las acciones del encabezado.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active, 'data-title': props.title }, [
      h('header', { class: 'shell-actions' }, slots['header-actions']?.()),
      slots.default?.(),
    ])
  },
})

const RouterLinkStub = defineComponent({
  props: { to: [String, Object] },
  setup(props, { slots }) {
    return () => h('a', { href: String(props.to) }, slots.default?.())
  },
})

function socio(extra: Partial<SocioRecord> = {}): SocioRecord {
  return {
    id: 15, bps: '123456789', cedula: null, tipoIdentificador: 'BPS', razonSocial: 'Ferretería Sur', rut: '211111110011',
    telefono: '099123456', emailContacto: 'contacto@sur.uy', emailUsuario: 'cuenta@sur.uy', fotoUrl: null,
    calle: 'Artigas', numero: null, localidad: 'Libertad', rubroId: 2, nombreRubro: 'Industria',
    estadoMorosidad: 'AL_DIA', esDirectivo: false, fechaAlta: '2025-03-15', fechaBaja: null,
    fechaAniversario: '2025-04-01', activo: true, passwordProvisional: 'Sur-2025', ...extra,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

const rubros = [{ id: 1, nombreRubro: 'Comercio' }, { id: 2, nombreRubro: 'Industria' }]
const errorApi = (detalle: string) => new ApiRequestError(400, '/admin/socios', { detail: detalle }, detalle)

// La vista calcula "hoy" al importarse, así que se importa recién con el reloj fijado.
async function cargarVista() {
  vi.resetModules()
  return (await import('./AdminNewCompanyView.vue')).default
}

type Wrapper = VueWrapper

async function montar() {
  vi.mocked(socioService.getRubros).mockResolvedValueOnce(rubros)
  const vista = await cargarVista()
  const wrapper = mount(vista, { global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } } })
  await flushPromises()
  return wrapper
}

function campo(wrapper: Wrapper, etiqueta: string) {
  const label = wrapper.findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) throw new Error(`No se encontró el campo ${etiqueta}`)
  return label
}

function boton(raiz: Wrapper | DOMWrapper<Element>, texto: string) {
  const encontrado = raiz.findAll('button').find((b) => b.text().trim() === texto)
  if (!encontrado) throw new Error(`No se encontró el botón "${texto}"`)
  return encontrado
}

function alerta(wrapper: Wrapper) {
  return wrapper.find('form [role="alert"], form .app-alert').exists()
    ? wrapper.find('form').text()
    : wrapper.find('form').text()
}

async function completarValido(wrapper: Wrapper) {
  await campo(wrapper, 'Número de BPS').find('input').setValue('123.456.789')
  await campo(wrapper, 'Email de cuenta').find('input').setValue('  cuenta@sur.uy ')
  await campo(wrapper, 'Razón social').find('input').setValue('  Ferretería Sur ')
  await campo(wrapper, 'RUT o cédula').find('input').setValue('21-111111-0011')
  await campo(wrapper, 'Teléfono').find('input').setValue(' 099123456 ')
  await campo(wrapper, 'Email de contacto').find('input').setValue('   ')
  await campo(wrapper, 'Fecha de aniversario').find('input').setValue('2025-04-01')
  await campo(wrapper, 'Rubro').find('select').setValue('2')
  await campo(wrapper, 'Calle').find('input').setValue(' Artigas ')
  await campo(wrapper, 'Nro puerta').find('input').setValue(' 1234 ')
  await campo(wrapper, 'Localidad').find('select').setValue('Libertad')
}

async function enviar(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('alta de nuevo socio', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-03-15T15:00:00Z'))
    vi.resetAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  describe('formulario', () => {
    it('carga los rubros, las localidades y la fecha de alta de hoy', async () => {
      const wrapper = await montar()
      expect(wrapper.find('[data-active]').attributes('data-title')).toBe('Nuevo Socio')
      expect(wrapper.find('.shell-actions a').attributes('href')).toBe('/admin/socios')
      expect(wrapper.find('.shell-actions').text()).toContain('Volver')
      expect(campo(wrapper, 'Rubro').findAll('option').map((o) => o.text())).toEqual(['Seleccionar rubro', 'Comercio', 'Industria'])
      expect(campo(wrapper, 'Localidad').findAll('option').map((o) => o.text())).toContain('San José de Mayo')
      expect((campo(wrapper, 'Fecha de alta').find('input').element as HTMLInputElement).value).toBe('2025-03-15')
      expect(campo(wrapper, 'Número de BPS').find('input').attributes('placeholder')).toBe('123456789')
      expect(campo(wrapper, 'Número de BPS').text()).toContain('mínimo 9 dígitos')
      expect(wrapper.find('form a').attributes('href')).toBe('/admin/socios')
    })

    it('muestra el error si no se pueden cargar los rubros', async () => {
      vi.mocked(socioService.getRubros).mockRejectedValueOnce(errorApi('Catálogo no disponible'))
      const vista = await cargarVista()
      const wrapper = mount(vista, { global: { stubs: { AdminShell: AdminShellStub, RouterLink: RouterLinkStub } } })
      await flushPromises()
      expect(wrapper.text()).toContain('Catálogo no disponible')
    })

    it('al cambiar a cédula limpia el identificador y ajusta las indicaciones', async () => {
      const wrapper = await montar()
      await campo(wrapper, 'Número de BPS').find('input').setValue('123456789')
      await campo(wrapper, 'Registrar con').find('select').setValue('CEDULA')

      const identificador = campo(wrapper, 'Número de cédula')
      expect((identificador.find('input').element as HTMLInputElement).value).toBe('')
      expect(identificador.find('input').attributes('placeholder')).toBe('12345678')
      expect(identificador.text()).toContain('El socio ingresará al sistema con este mismo número.')
    })
  })

  describe('validaciones', () => {
    it('exige el identificador según el tipo elegido', async () => {
      const wrapper = await montar()
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Ingresa el número de BPS.')

      await campo(wrapper, 'Registrar con').find('select').setValue('CEDULA')
      await campo(wrapper, 'Número de cédula').find('input').setValue('abc')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Ingresa el número de cédula.')
    })

    it('exige al menos 9 dígitos de BPS pero no para cédula', async () => {
      const wrapper = await montar()
      await campo(wrapper, 'Número de BPS').find('input').setValue('12345678')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('El número de BPS debe tener al menos 9 dígitos.')

      await campo(wrapper, 'Registrar con').find('select').setValue('CEDULA')
      await campo(wrapper, 'Número de cédula').find('input').setValue('1234567')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Ingresa un RUT (12 dígitos) o una cédula (8 dígitos).')
    })

    it('valida RUT, teléfono, aniversario, localidad, rubro y fecha de alta en orden', async () => {
      const wrapper = await montar()
      await campo(wrapper, 'Número de BPS').find('input').setValue('123456789')
      await campo(wrapper, 'RUT o cédula').find('input').setValue('123')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Ingresa un RUT (12 dígitos) o una cédula (8 dígitos).')

      await campo(wrapper, 'RUT o cédula').find('input').setValue('1.234.567-8')
      await campo(wrapper, 'Teléfono').find('input').setValue('   ')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Ingresa el teléfono del socio.')

      await campo(wrapper, 'Teléfono').find('input').setValue('099')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Indica la fecha de aniversario.')

      await campo(wrapper, 'Fecha de aniversario').find('input').setValue('2025-04-01')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Selecciona la localidad.')

      await campo(wrapper, 'Localidad').find('select').setValue('Libertad')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Selecciona un rubro.')

      await campo(wrapper, 'Rubro').find('select').setValue('1')
      await campo(wrapper, 'Fecha de alta').find('input').setValue('')
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('Indica la fecha de alta en el CCISJ.')
      expect(socioService.createSocio).not.toHaveBeenCalled()
    })
  })

  describe('creación', () => {
    it('crea el socio con el payload normalizado y muestra la clave enviada', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      await campo(wrapper, 'Es directivo').find('input').setValue(true)

      const alta = deferred<SocioRecord>()
      vi.mocked(socioService.createSocio).mockReturnValueOnce(alta.promise)
      await wrapper.find('form').trigger('submit')
      expect(boton(wrapper, 'Creando...').attributes('disabled')).toBeDefined()
      expect(socioService.createSocio).toHaveBeenCalledWith({
        tipoIdentificador: 'BPS',
        identificador: '123456789',
        email: 'cuenta@sur.uy',
        razonSocial: 'Ferretería Sur',
        rut: '211111110011',
        telefono: '099123456',
        emailContacto: null,
        calle: 'Artigas',
        numero: '1234',
        localidad: 'Libertad',
        rubroId: 2,
        esDirectivo: true,
        fechaAlta: '2025-03-15',
        fechaAniversario: '2025-04-01',
      })

      alta.resolve(socio({ credencialesEnviadas: true, credencialesEnvioMensaje: 'Credenciales enviadas a contacto@sur.uy' }))
      await flushPromises()

      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.text()).toContain('Socio creado correctamente')
      expect(wrapper.find('header strong').text()).toBe('Ferretería Sur')
      expect((wrapper.find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe('Sur-2025')
      expect(wrapper.findAll('p strong').at(-1)!.text()).toBe('contacto@sur.uy')
      expect(wrapper.find('.socio-profile__hint').text()).toBe('Credenciales enviadas a contacto@sur.uy')
      expect(boton(wrapper, 'Reenviar mail al socio').exists()).toBe(true)
    })

    it('usa el mensaje por defecto cuando el envío automático no trae texto', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio({
        credencialesEnviadas: true, credencialesEnvioMensaje: null, emailContacto: null, passwordProvisional: null,
      }))
      await enviar(wrapper)
      expect(wrapper.find('.socio-profile__hint').text()).toBe('Credenciales enviadas automáticamente por correo.')
      expect(wrapper.findAll('p strong').at(-1)!.text()).toBe('cuenta@sur.uy')
      expect((wrapper.find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe('')
    })

    it('muestra el aviso de envío fallido y el correo por defecto', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio({
        credencialesEnviadas: false, credencialesEnvioMensaje: 'No se pudo enviar el correo', emailContacto: null, emailUsuario: null,
      }))
      await enviar(wrapper)
      expect(wrapper.text()).toContain('No se pudo enviar el correo')
      expect(wrapper.find('.socio-profile__hint').exists()).toBe(false)
      expect(wrapper.findAll('p strong').at(-1)!.text()).toBe('su correo registrado')
      expect(boton(wrapper, 'Reintentar envío de mail').exists()).toBe(true)
    })

    it('sin mensaje de envío no muestra avisos', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio({ credencialesEnviadas: false, credencialesEnvioMensaje: null }))
      await enviar(wrapper)
      expect(wrapper.text()).toContain('Socio creado correctamente')
      expect(wrapper.find('.socio-profile__hint').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('No se pudo')
    })

    it('convierte fechas escritas como dd/mm/aaaa y deja otras tal cual', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      // Navegadores sin selector de fecha pueden dejar texto libre en los campos.
      const alta = campo(wrapper, 'Fecha de alta').find('input')
      const aniversario = campo(wrapper, 'Fecha de aniversario').find('input')
      alta.element.setAttribute('type', 'text')
      aniversario.element.setAttribute('type', 'text')
      await alta.setValue(' 05/02/2024 ')
      await aniversario.setValue('1 de abril')
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio())
      await enviar(wrapper)
      expect(socioService.createSocio).toHaveBeenCalledWith(expect.objectContaining({
        fechaAlta: '2024-02-05', fechaAniversario: '1 de abril',
      }))
    })

    it('envía null si la fecha de alta solo tiene espacios', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      const alta = campo(wrapper, 'Fecha de alta').find('input')
      alta.element.setAttribute('type', 'text')
      await alta.setValue('   ')
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio())
      await enviar(wrapper)
      expect(socioService.createSocio).toHaveBeenCalledWith(expect.objectContaining({ fechaAlta: null }))
    })

    it('registra con cédula de 8 dígitos', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      await campo(wrapper, 'Registrar con').find('select').setValue('CEDULA')
      await campo(wrapper, 'Número de cédula').find('input').setValue('1.234.567-8')
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio())
      await enviar(wrapper)
      expect(socioService.createSocio).toHaveBeenCalledWith(expect.objectContaining({
        tipoIdentificador: 'CEDULA', identificador: '12345678',
      }))
    })

    it('muestra el error del backend y permite reintentar', async () => {
      const wrapper = await montar()
      await completarValido(wrapper)
      vi.mocked(socioService.createSocio).mockRejectedValueOnce(errorApi('El BPS ya está registrado'))
      await enviar(wrapper)
      expect(alerta(wrapper)).toContain('El BPS ya está registrado')
      expect(boton(wrapper, 'Crear Socio').attributes('disabled')).toBeUndefined()
    })
  })

  describe('después de crear', () => {
    async function creado(extra: Partial<SocioRecord> = {}) {
      const wrapper = await montar()
      await completarValido(wrapper)
      vi.mocked(socioService.createSocio).mockResolvedValueOnce(socio({ credencialesEnviadas: false, credencialesEnvioMensaje: 'Falló SMTP', ...extra }))
      await enviar(wrapper)
      return wrapper
    }

    it('reenvía las credenciales y actualiza la clave mostrada', async () => {
      const wrapper = await creado()
      const envio = deferred<CredencialesEnviadas>()
      vi.mocked(socioService.enviarCredenciales).mockReturnValueOnce(envio.promise)

      await boton(wrapper, 'Reintentar envío de mail').trigger('click')
      expect(socioService.enviarCredenciales).toHaveBeenCalledWith(15)
      expect(boton(wrapper, 'Enviando...').attributes('disabled')).toBeDefined()
      expect(wrapper.text()).not.toContain('Falló SMTP')

      envio.resolve({ destinatario: 'contacto@sur.uy', passwordProvisional: 'Nueva-999', mensaje: 'ok' })
      await flushPromises()
      expect(wrapper.find('.socio-profile__hint').text()).toBe('Mail enviado a contacto@sur.uy con las credenciales y el aviso de 24 horas.')
      expect((wrapper.find('input[autocomplete="off"]').element as HTMLInputElement).value).toBe('Nueva-999')
      expect(boton(wrapper, 'Reenviar mail al socio').attributes('disabled')).toBeUndefined()
    })

    it('muestra el error si falla el reenvío', async () => {
      const wrapper = await creado()
      vi.mocked(socioService.enviarCredenciales).mockRejectedValueOnce(errorApi('Servidor de correo caído'))
      await boton(wrapper, 'Reintentar envío de mail').trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Servidor de correo caído')
      expect(boton(wrapper, 'Reintentar envío de mail').attributes('disabled')).toBeUndefined()
    })

    it('vuelve al listado de socios', async () => {
      const wrapper = await creado()
      await boton(wrapper, 'Ir al listado').trigger('click')
      expect(push).toHaveBeenCalledWith({ name: 'admin-socios' })
    })
  })

  it('sin un socio recién creado no envía credenciales', async () => {
    const wrapper = await montar()
    await (wrapper.vm as unknown as { sendCredentialsMail: () => Promise<void> }).sendCredentialsMail()
    expect(socioService.enviarCredenciales).not.toHaveBeenCalled()
  })
})

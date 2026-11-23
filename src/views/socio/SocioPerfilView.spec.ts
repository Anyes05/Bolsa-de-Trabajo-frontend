// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SocioPerfilView from './SocioPerfilView.vue'
import { authService } from '../../services/authService'
import { socioPerfilService } from '../../services/socioPerfilService'
import type { RubroOption, SocioRecord } from '../../services/types'
import { useAuthStore } from '../../stores/auth'
import { PASSWORD_HINT } from '../../utils/password'

vi.mock('../../services/authService', () => ({
  authService: { changePassword: vi.fn(), uploadProfilePhoto: vi.fn(), removeProfilePhoto: vi.fn(), logout: vi.fn(), currentUser: vi.fn() },
}))
vi.mock('../../services/socioPerfilService', () => ({
  socioPerfilService: { get: vi.fn(), update: vi.fn(), updateCorreos: vi.fn(), listRubros: vi.fn() },
}))

// El layout real se reemplaza por un contenedor que expone los datos de la empresa.
const SocioShellStub = defineComponent({
  props: { title: String, subtitle: String, activeNav: String, companyName: String, companyInitials: String, companyRole: String },
  setup(props, { slots }) {
    return () => h('div', {
      class: 'shell', 'data-active': props.activeNav, 'data-name': props.companyName,
      'data-initials': props.companyInitials, 'data-role': props.companyRole,
    }, slots.default?.())
  },
})

const Vacia = defineComponent({ render: () => h('div') })
const rubros: RubroOption[] = [{ id: 1, nombreRubro: 'Comercio' }, { id: 2, nombreRubro: 'Servicios' }]
const CLAVE_VALIDA = 'NuevaClave1!'

function perfil(cambios: Partial<SocioRecord> = {}): SocioRecord {
  return {
    id: 1, bps: '123456789', cedula: null, tipoIdentificador: 'BPS', razonSocial: 'Ferretería Central', rut: '210000000019',
    telefono: '4342 1111', emailContacto: 'contacto@ferreteria.test', emailUsuario: 'cuenta@ferreteria.test', fotoUrl: null,
    calle: 'Artigas', numero: '123', localidad: 'Libertad', rubroId: 1, nombreRubro: 'Comercio', estadoMorosidad: 'AL_DIA',
    esDirectivo: false, fechaAlta: '2020-01-01', fechaBaja: null, fechaAniversario: '2020-05-10T00:00:00', activo: true,
    silenciarCorreos: false, ...cambios,
  }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

function archivo(tipo: string, tamano = 1024) {
  const file = new File(['x'], 'foto', { type: tipo })
  Object.defineProperty(file, 'size', { value: tamano })
  return file
}

async function elegirArchivo(input: ReturnType<VueWrapper['find']>, file: File | null) {
  Object.defineProperty(input.element, 'files', { value: file ? [file] : [], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('perfil del socio', () => {
  let pinia: Pinia
  let router: Router

  beforeEach(async () => {
    sessionStorage.clear()
    vi.resetAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 't', email: 'sesion@ejemplo.test', role: 'SOCIO' })
    vi.mocked(socioPerfilService.get).mockResolvedValue(perfil())
    vi.mocked(socioPerfilService.listRubros).mockResolvedValue(rubros)
    router = createRouter({
      history: createMemoryHistory(),
      routes: ['access', 'socio-perfil'].map((name) => ({ path: `/${name}`, name, component: Vacia })),
    })
    await router.push('/socio-perfil')
  })

  async function montar() {
    const wrapper = mount(SocioPerfilView, { global: { plugins: [pinia, router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    return wrapper
  }

  function campo(wrapper: VueWrapper, etiqueta: string) {
    const label = wrapper.findAll('label').find((item) => item.text().startsWith(etiqueta))!
    return label.find('input, select')
  }

  it('muestra la carga y luego el perfil con sus datos', async () => {
    const pendiente = diferido<SocioRecord>()
    vi.mocked(socioPerfilService.get).mockReturnValueOnce(pendiente.promise)
    const wrapper = mount(SocioPerfilView, { global: { plugins: [pinia, router], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    expect(wrapper.text()).toContain('Cargando perfil...')
    // Mientras no hay perfil se usa "Socio" como nombre.
    expect(wrapper.find('.shell').attributes('data-name')).toBe('Socio')
    expect(wrapper.find('.shell').attributes('data-initials')).toBe('S')

    pendiente.resolve(perfil())
    await flushPromises()
    const shell = wrapper.find('.shell')
    expect(shell.attributes('data-active')).toBe('perfil')
    expect(shell.attributes('data-name')).toBe('Ferretería Central')
    expect(shell.attributes('data-initials')).toBe('FC')
    expect(shell.attributes('data-role')).toBe('SOCIO')
    expect(useAuthStore().fullName).toBe('Ferretería Central')

    expect(wrapper.find('.socio-profile__identity h2').text()).toBe('Ferretería Central')
    expect(wrapper.find('.socio-profile__identity p').text()).toBe('cuenta@ferreteria.test')
    expect(wrapper.find('.socio-profile__badge').text()).toBe('Socio')
    expect(wrapper.find('.socio-profile__avatar').text()).toBe('FC')
    expect((campo(wrapper, 'Razón social').element as HTMLInputElement).value).toBe('Ferretería Central')
    expect((campo(wrapper, 'BPS / Cédula').element as HTMLInputElement).value).toBe('BPS 123456789')
    expect((campo(wrapper, 'RUT / Cédula').element as HTMLInputElement).value).toBe('210000000019')
    expect((campo(wrapper, 'Rubro').element as HTMLSelectElement).value).toBe('1')
    expect((campo(wrapper, 'Fecha de aniversario').element as HTMLInputElement).value).toBe('2020-05-10')
    expect((campo(wrapper, 'Localidad').element as HTMLSelectElement).value).toBe('Libertad')
    expect(wrapper.find('.socio-profile__mail').text()).toContain('Recibís comunicados y aniversarios por correo')
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('false')
  })

  it('completa con vacíos los datos nulos y muestra datos de directivo', async () => {
    const auth = useAuthStore()
    auth.setSession({ token: 't', email: 'sesion@ejemplo.test', role: 'SOCIO', fullName: 'Nombre Sesión', esDirectivo: true })
    vi.mocked(socioPerfilService.get).mockResolvedValueOnce(perfil({
      razonSocial: '', telefono: null, emailContacto: null, calle: null, numero: null, localidad: 'Paraje Nuevo',
      rubroId: null, fechaAniversario: null, emailUsuario: null, rut: null, silenciarCorreos: true,
    }))
    const wrapper = await montar()
    expect(wrapper.find('.shell').attributes('data-role')).toBe('SOCIO DIRECTIVO')
    expect(wrapper.find('.socio-profile__badge').text()).toBe('Socio directivo')
    // Sin razón social se usa el nombre de la sesión (que la carga dejó vacío) y luego "Socio".
    expect(wrapper.find('.socio-profile__identity h2').text()).toBe('Socio')
    expect(wrapper.find('.socio-profile__identity p').text()).toBe('sesion@ejemplo.test')
    expect((campo(wrapper, 'Teléfono').element as HTMLInputElement).value).toBe('')
    expect((campo(wrapper, 'RUT / Cédula').element as HTMLInputElement).value).toBe('')
    expect((campo(wrapper, 'Rubro').element as HTMLSelectElement).value).toBe('')
    expect(campo(wrapper, 'Localidad').findAll('option')[1]!.text()).toBe('Paraje Nuevo')
    expect(wrapper.find('.socio-profile__mail').classes()).toContain('socio-profile__mail--muted')
    expect(wrapper.find('.socio-profile__mail').text()).toContain('Correos silenciados')
  })

  it('tolera razón social y localidad nulas o en blanco', async () => {
    vi.mocked(socioPerfilService.get).mockResolvedValueOnce(perfil({
      razonSocial: null as unknown as string, localidad: null,
    }))
    const nulos = await montar()
    expect((campo(nulos, 'Razón social').element as HTMLInputElement).value).toBe('')
    expect((campo(nulos, 'Localidad').element as HTMLSelectElement).value).toBe('')
    expect(nulos.find('.socio-profile__identity h2').text()).toBe('Socio')

    vi.mocked(socioPerfilService.get).mockResolvedValueOnce(perfil({ razonSocial: '   ' }))
    const blanco = await montar()
    // Un nombre en blanco no genera iniciales: se usa la "S" genérica.
    expect(blanco.find('.shell').attributes('data-initials')).toBe('S')
    expect(blanco.find('.socio-profile__avatar').text()).toBe('S')
  })

  it('sin correo de cuenta ni de sesión no muestra email', async () => {
    useAuthStore().email = null
    vi.mocked(socioPerfilService.get).mockResolvedValueOnce(perfil({ emailUsuario: null }))
    const wrapper = await montar()
    expect(wrapper.find('.socio-profile__identity p').text()).toBe('')
  })

  it('informa el error de carga y no muestra el formulario', async () => {
    vi.mocked(socioPerfilService.get).mockRejectedValueOnce(new Error('Perfil inaccesible'))
    const wrapper = await montar()
    expect(wrapper.text()).toContain('Perfil inaccesible')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('guarda los datos de la firma normalizando los opcionales', async () => {
    const actualizado = perfil({ razonSocial: 'Ferretería Nueva', telefono: '099' })
    const respuesta = diferido<SocioRecord>()
    vi.mocked(socioPerfilService.update).mockReturnValueOnce(respuesta.promise)
    const wrapper = await montar()

    await campo(wrapper, 'Razón social').setValue('  Ferretería Nueva ')
    await campo(wrapper, 'Teléfono').setValue(' 099 ')
    await campo(wrapper, 'Email de contacto').setValue('   ')
    await campo(wrapper, 'Rubro').setValue('2')
    await campo(wrapper, 'Fecha de aniversario').setValue('')
    await campo(wrapper, 'Calle').setValue(' Rivera ')
    await campo(wrapper, 'Nro puerta').setValue('')
    await campo(wrapper, 'Localidad').setValue('San José de Mayo')
    const formulario = wrapper.findAll('form')[0]!
    await formulario.trigger('submit')
    expect(formulario.find('button[type="submit"]').text()).toBe('Guardando...')
    expect(socioPerfilService.update).toHaveBeenCalledWith({
      razonSocial: 'Ferretería Nueva', telefono: '099', emailContacto: null, calle: 'Rivera', numero: null,
      localidad: 'San José de Mayo', rubroId: 2, fechaAniversario: null,
    })

    respuesta.resolve(actualizado)
    await flushPromises()
    expect(wrapper.text()).toContain('Los cambios se guardaron correctamente.')
    expect(useAuthStore().fullName).toBe('Ferretería Nueva')
    expect(formulario.find('button[type="submit"]').text()).toBe('Guardar cambios')
  })

  it('exige rubro e informa errores al guardar', async () => {
    vi.mocked(socioPerfilService.get).mockResolvedValueOnce(perfil({ rubroId: null }))
    const wrapper = await montar()
    const formulario = wrapper.findAll('form')[0]!
    await formulario.trigger('submit')
    expect(wrapper.text()).toContain('Selecciona un rubro.')
    expect(socioPerfilService.update).not.toHaveBeenCalled()

    await campo(wrapper, 'Rubro').setValue('1')
    vi.mocked(socioPerfilService.update).mockRejectedValueOnce(new Error('Teléfono inválido'))
    await formulario.trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Teléfono inválido')
    expect(wrapper.text()).not.toContain('Selecciona un rubro.')
  })

  it('silencia y reactiva los correos, informando errores', async () => {
    const respuesta = diferido<SocioRecord>()
    vi.mocked(socioPerfilService.updateCorreos).mockReturnValueOnce(respuesta.promise)
    const wrapper = await montar()
    const interruptor = wrapper.find('[role="switch"]')

    await interruptor.trigger('click')
    expect(socioPerfilService.updateCorreos).toHaveBeenLastCalledWith(true)
    expect(wrapper.text()).toContain('Guardando preferencia...')
    expect(interruptor.attributes('disabled')).toBeDefined()
    respuesta.resolve(perfil({ silenciarCorreos: true }))
    await flushPromises()
    expect(interruptor.attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('No te enviaremos más comunicados ni saludos de aniversario por correo.')

    vi.mocked(socioPerfilService.updateCorreos).mockResolvedValueOnce(perfil({ silenciarCorreos: false }))
    await interruptor.trigger('click')
    await flushPromises()
    expect(socioPerfilService.updateCorreos).toHaveBeenLastCalledWith(false)
    expect(interruptor.attributes('aria-checked')).toBe('false')
    expect(wrapper.text()).toContain('Volviste a activar los correos de comunicados y aniversarios.')

    vi.mocked(socioPerfilService.updateCorreos).mockRejectedValueOnce(new Error('Preferencia no guardada'))
    await interruptor.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Preferencia no guardada')
    expect(wrapper.text()).not.toContain('Volviste a activar')
    expect(interruptor.attributes('aria-checked')).toBe('false')
  })

  it('cambia la contraseña validando los datos', async () => {
    const respuesta = diferido<Awaited<ReturnType<typeof authService.changePassword>>>()
    vi.mocked(authService.changePassword).mockReturnValueOnce(respuesta.promise)
    const wrapper = await montar()
    const formulario = wrapper.findAll('form')[1]!
    const claves = formulario.findAll('input')
    const boton = formulario.find('button[type="submit"]')
    expect(formulario.text()).toContain(PASSWORD_HINT)
    expect(boton.attributes('disabled')).toBeDefined()

    await formulario.trigger('submit')
    expect(formulario.text()).toContain(`Completa la clave actual y una nueva válida. ${PASSWORD_HINT}`)

    await claves[0]!.setValue('ClaveVieja1!')
    await claves[1]!.setValue(CLAVE_VALIDA)
    await claves[2]!.setValue(CLAVE_VALIDA)
    expect(boton.attributes('disabled')).toBeUndefined()
    await formulario.trigger('submit')
    expect(boton.text()).toBe('Actualizando...')
    expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: 'ClaveVieja1!', newPassword: CLAVE_VALIDA })

    respuesta.resolve({ token: 'nuevo', email: 'sesion@ejemplo.test', role: 'SOCIO' })
    await flushPromises()
    expect(useAuthStore().token).toBe('nuevo')
    expect(formulario.text()).toContain('La contraseña se actualizó correctamente.')
    expect(claves.map((clave) => (clave.element as HTMLInputElement).value)).toEqual(['', '', ''])

    await claves[0]!.setValue('ClaveVieja1!')
    await claves[1]!.setValue(CLAVE_VALIDA)
    await claves[2]!.setValue(CLAVE_VALIDA)
    vi.mocked(authService.changePassword).mockRejectedValueOnce(new Error('Clave actual incorrecta'))
    await formulario.trigger('submit')
    await flushPromises()
    expect(formulario.text()).toContain('Clave actual incorrecta')
    expect(formulario.text()).not.toContain('La contraseña se actualizó correctamente.')
  })

  it('valida y sube la foto de perfil desde cualquiera de sus entradas', async () => {
    vi.mocked(authService.uploadProfilePhoto).mockResolvedValueOnce({ fotoUrl: 'https://fotos.test/1.png' } as never)
    const wrapper = await montar()
    const entradas = wrapper.findAll('input[type="file"]')
    expect(entradas).toHaveLength(2)

    await elegirArchivo(entradas[0]!, null)
    expect(authService.uploadProfilePhoto).not.toHaveBeenCalled()
    expect(wrapper.find('.socio-profile__photo-error').exists()).toBe(false)

    await elegirArchivo(entradas[1]!, archivo('application/pdf'))
    expect(wrapper.find('.socio-profile__photo-error').text()).toBe('Elige una imagen (JPG, PNG o WEBP).')

    await elegirArchivo(entradas[0]!, archivo('image/png', 6 * 1024 * 1024))
    expect(wrapper.find('.socio-profile__photo-error').text()).toBe('La imagen debe pesar hasta 5 MB.')

    const foto = archivo('image/webp')
    await elegirArchivo(entradas[1]!, foto)
    expect(authService.uploadProfilePhoto).toHaveBeenCalledWith(foto)
    expect(wrapper.find('.socio-profile__photo-error').exists()).toBe(false)
    expect(wrapper.find('.socio-profile__avatar img').attributes('src')).toBe('https://fotos.test/1.png')
    expect(wrapper.find('.socio-profile__photo-button').text()).toBe('Cambiar foto')
  })

  it('informa errores al subir y permite quitar la foto', async () => {
    useAuthStore().setPhotoUrl('https://fotos.test/actual.png')
    vi.mocked(authService.uploadProfilePhoto).mockRejectedValueOnce(new Error('Imagen rechazada'))
    const wrapper = await montar()
    const entrada = wrapper.find('input[type="file"]')

    await elegirArchivo(entrada, archivo('image/jpeg'))
    expect(wrapper.find('.socio-profile__photo-error').text()).toBe('Imagen rechazada')

    vi.mocked(authService.removeProfilePhoto).mockRejectedValueOnce(new Error('No se pudo quitar'))
    await wrapper.find('.socio-profile__photo-clear').trigger('click')
    await flushPromises()
    expect(wrapper.find('.socio-profile__photo-error').text()).toBe('No se pudo quitar')
    expect(useAuthStore().photoUrl).toBe('https://fotos.test/actual.png')

    vi.mocked(authService.removeProfilePhoto).mockResolvedValueOnce(undefined as never)
    await wrapper.find('.socio-profile__photo-clear').trigger('click')
    await flushPromises()
    expect(useAuthStore().photoUrl).toBeNull()
    expect(wrapper.find('.socio-profile__photo-clear').exists()).toBe(false)
    expect(wrapper.find('.socio-profile__photo-error').exists()).toBe(false)
  })

  it('muestra el estado de subida de la foto', async () => {
    const subida = diferido<never>()
    vi.mocked(authService.uploadProfilePhoto).mockReturnValueOnce(subida.promise)
    const wrapper = await montar()
    const entrada = wrapper.find('input[type="file"]')
    Object.defineProperty(entrada.element, 'files', { value: [archivo('image/png')], configurable: true })
    await entrada.trigger('change')
    expect(wrapper.find('.socio-profile__photo-button').text()).toBe('Actualizando foto...')
    expect(entrada.attributes('disabled')).toBeDefined()
    subida.resolve({ fotoUrl: null } as never)
    await flushPromises()
    expect(wrapper.find('.socio-profile__photo-button').text()).toBe('Cambiar foto')
  })

  it('cierra la sesión y vuelve al acceso', async () => {
    vi.mocked(authService.logout).mockResolvedValueOnce(undefined as never)
    const wrapper = await montar()
    await wrapper.find('.socio-profile__logout-button').trigger('click')
    await flushPromises()
    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.name).toBe('access')
  })
})

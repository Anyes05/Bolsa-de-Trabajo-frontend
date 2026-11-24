// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import PostulanteMiPerfilView from './PostulanteMiPerfilView.vue'
import { authService } from '../../services/authService'
import { postulanteService } from '../../services/postulanteService'
import type { PersonalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../services/authService', () => ({
  authService: { changePassword: vi.fn(), currentUser: vi.fn(), logout: vi.fn(), uploadProfilePhoto: vi.fn(), removeProfilePhoto: vi.fn() },
}))
vi.mock('../../services/postulanteService', () => ({
  postulanteService: { personalProfile: vi.fn(), updatePersonalProfile: vi.fn(), uploadProfilePhoto: vi.fn() },
}))

const ShellStub = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })

function perfil(cambios: Partial<PersonalProfile> = {}): PersonalProfile {
  return {
    nombreCompleto: 'Ana María Pérez',
    cedulaIdentidad: '12345678',
    telefono: '099123456',
    zonaResidencia: 'San José de Mayo',
    email: 'ana@ejemplo.test',
    fotoUrl: null,
    ...cambios,
  }
}

const CLAVE_ACTUAL = 'Actual#2026'
const CLAVE_NUEVA = 'Nueva#2026x'

describe('mi perfil del postulante', () => {
  let pinia: Pinia

  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 'tok', email: 'ana@ejemplo.test', role: 'POSTULANTE' })
    vi.mocked(postulanteService.personalProfile).mockResolvedValue(perfil())
  })

  /** Sesión vacía: el servicio recibe `undefined` como token. */
  function sinSesion() {
    sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  }

  async function montar() {
    const wrapper = mount(PostulanteMiPerfilView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
    await flushPromises()
    return wrapper
  }

  const formDatos = (wrapper: VueWrapper) => wrapper.findAll('form')[0]
  const formClave = (wrapper: VueWrapper) => wrapper.find('form[aria-labelledby="applicant-password-title"]')
  const alerta = (wrapper: VueWrapper) => wrapper.find('.app-alert')

  describe('datos personales', () => {
    it('muestra "cargando" y luego los datos con las iniciales', async () => {
      vi.mocked(postulanteService.personalProfile).mockReturnValueOnce(new Promise(() => {}))
      const cargando = mount(PostulanteMiPerfilView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
      await flushPromises()
      expect(cargando.text()).toContain('Cargando datos personales...')
      cargando.unmount()

      const wrapper = await montar()
      expect(postulanteService.personalProfile).toHaveBeenLastCalledWith('tok')
      expect(wrapper.find('.personal-profile__photo-inline').text()).toBe('AM')
      expect(wrapper.find('.personal-profile__photo-image').exists()).toBe(false)
      const inputs = formDatos(wrapper).findAll('input:not([type="file"])')
      expect((inputs[0].element as HTMLInputElement).value).toBe('Ana María Pérez')
      expect((inputs[1].element as HTMLInputElement).value).toBe('ana@ejemplo.test')
      expect(inputs[1].attributes('disabled')).toBeDefined()
      expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('San José de Mayo')
    })

    it('muestra la foto y la guarda en la sesión; sin token pide el perfil igual', async () => {
      sinSesion()
      vi.mocked(postulanteService.personalProfile).mockResolvedValue(perfil({ fotoUrl: 'https://cdn.test/ana.jpg' }))
      const wrapper = await montar()
      expect(postulanteService.personalProfile).toHaveBeenCalledWith(undefined)
      expect(wrapper.find('.personal-profile__photo-image').attributes('src')).toBe('https://cdn.test/ana.jpg')
    })

    it('si no puede cargar los datos lo informa', async () => {
      vi.mocked(postulanteService.personalProfile).mockRejectedValue(new Error('Servicio caído'))
      const wrapper = await montar()
      expect(alerta(wrapper).text()).toContain('Servicio caído')
      expect(alerta(wrapper).classes()).toContain('app-alert--error')
      expect(wrapper.find('select').exists()).toBe(false)
    })

    it('no guarda sin nombre', async () => {
      const wrapper = await montar()
      await formDatos(wrapper).find('input:not([type="file"])').setValue('   ')
      await formDatos(wrapper).trigger('submit')
      expect(postulanteService.updatePersonalProfile).not.toHaveBeenCalled()
      expect(alerta(wrapper).text()).toContain('El nombre y apellido son obligatorios')
    })

    it('guarda sin enviar correo ni foto y actualiza la sesión', async () => {
      vi.mocked(postulanteService.updatePersonalProfile).mockResolvedValue(perfil({ nombreCompleto: 'Ana Pérez', telefono: '098000000', fotoUrl: 'https://cdn.test/f.jpg' }))
      const wrapper = await montar()
      const inputs = formDatos(wrapper).findAll('input:not([type="file"])')
      await inputs[0].setValue('Ana Pérez')
      await inputs[2].setValue('87654321')
      await inputs[3].setValue('098000000')
      await wrapper.find('select').setValue('Libertad')
      await formDatos(wrapper).trigger('submit')
      await flushPromises()

      expect(postulanteService.updatePersonalProfile).toHaveBeenCalledWith(
        { nombreCompleto: 'Ana Pérez', cedulaIdentidad: '87654321', telefono: '098000000', zonaResidencia: 'Libertad' },
        'tok',
      )
      expect(useAuthStore().fullName).toBe('Ana Pérez')
      expect(useAuthStore().photoUrl).toBe('https://cdn.test/f.jpg')
      expect(alerta(wrapper).text()).toContain('Tus datos personales se guardaron correctamente.')
      expect(alerta(wrapper).classes()).toContain('app-alert--success')
    })

    it('si falla al guardar muestra el motivo; sin token guarda igual', async () => {
      sinSesion()
      vi.mocked(postulanteService.updatePersonalProfile).mockRejectedValue(new Error('Cédula inválida'))
      const wrapper = await montar()
      await formDatos(wrapper).trigger('submit')
      await flushPromises()
      expect(postulanteService.updatePersonalProfile).toHaveBeenCalledWith(expect.any(Object), undefined)
      expect(alerta(wrapper).text()).toContain('Cédula inválida')
    })
  })

  describe('foto de perfil', () => {
    async function elegirFoto(wrapper: VueWrapper, archivo?: File) {
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: archivo ? [archivo] : [], configurable: true })
      await input.trigger('change')
      await flushPromises()
      return input
    }

    it('sin archivo elegido no hace nada', async () => {
      const wrapper = await montar()
      await elegirFoto(wrapper)
      expect(postulanteService.uploadProfilePhoto).not.toHaveBeenCalled()
      expect(alerta(wrapper).exists()).toBe(false)
    })

    it('rechaza formatos que no son imagen', async () => {
      const wrapper = await montar()
      await elegirFoto(wrapper, new File(['x'], 'cv.pdf', { type: 'application/pdf' }))
      expect(postulanteService.uploadProfilePhoto).not.toHaveBeenCalled()
      expect(alerta(wrapper).text()).toContain('Seleccioná una imagen (JPG, PNG o WEBP)')
    })

    it('sube la foto, muestra el progreso y actualiza la sesión', async () => {
      let resolver: (valor: PersonalProfile) => void = () => {}
      vi.mocked(postulanteService.uploadProfilePhoto).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
      const wrapper = await montar()
      const archivo = new File(['x'], 'yo.png', { type: 'image/png' })
      const input = wrapper.find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [archivo], configurable: true })
      await input.trigger('change')
      expect(wrapper.find('.personal-profile__photo-label').text()).toBe('Subiendo foto...')
      expect(input.attributes('disabled')).toBeDefined()

      resolver(perfil({ fotoUrl: 'https://cdn.test/yo.png' }))
      await flushPromises()
      expect(postulanteService.uploadProfilePhoto).toHaveBeenCalledWith(archivo, 'tok')
      expect(useAuthStore().photoUrl).toBe('https://cdn.test/yo.png')
      expect(wrapper.find('.personal-profile__photo-label').text()).toBe('Cambiar foto')
      expect(alerta(wrapper).text()).toContain('Tu foto de perfil se actualizó correctamente.')
    })

    it('si la subida falla lo informa; sin token sube igual', async () => {
      sinSesion()
      vi.mocked(postulanteService.uploadProfilePhoto).mockRejectedValue(new Error('Imagen demasiado grande'))
      const wrapper = await montar()
      const archivo = new File(['x'], 'yo.webp', { type: 'image/webp' })
      await elegirFoto(wrapper, archivo)
      expect(postulanteService.uploadProfilePhoto).toHaveBeenCalledWith(archivo, undefined)
      expect(alerta(wrapper).text()).toContain('Imagen demasiado grande')
    })
  })

  describe('cambio de contraseña', () => {
    async function completar(wrapper: VueWrapper, actual: string, nueva: string, repetir: string) {
      await wrapper.find('#applicant-current-password').setValue(actual)
      await wrapper.find('#applicant-new-password').setValue(nueva)
      await wrapper.find('#applicant-repeat-password').setValue(repetir)
    }
    const botonClave = (wrapper: VueWrapper) => formClave(wrapper).find('button[type="submit"]')

    it('avisa si las contraseñas nuevas no coinciden y no deja enviar', async () => {
      const wrapper = await montar()
      await completar(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, 'Otra#2026x')
      expect(formClave(wrapper).text()).toContain('Las contraseñas no coinciden.')
      expect(botonClave(wrapper).attributes('disabled')).toBeDefined()
      await formClave(wrapper).trigger('submit')
      expect(authService.changePassword).not.toHaveBeenCalled()
      expect(formClave(wrapper).text()).toContain('Completá la contraseña actual y una nueva válida')
    })

    it('no acepta una nueva igual a la actual', async () => {
      const wrapper = await montar()
      await completar(wrapper, CLAVE_NUEVA, CLAVE_NUEVA, CLAVE_NUEVA)
      expect(botonClave(wrapper).attributes('disabled')).toBeDefined()
    })

    it('actualiza la contraseña, renueva la sesión y limpia el formulario', async () => {
      let resolver: (valor: Awaited<ReturnType<typeof authService.changePassword>>) => void = () => {}
      vi.mocked(authService.changePassword).mockReturnValue(new Promise((resolve) => { resolver = resolve }))
      const wrapper = await montar()
      await completar(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, CLAVE_NUEVA)
      expect(botonClave(wrapper).attributes('disabled')).toBeUndefined()

      await formClave(wrapper).trigger('submit')
      expect(botonClave(wrapper).text()).toContain('Actualizando...')
      // Un segundo envío mientras se procesa se ignora.
      await formClave(wrapper).trigger('submit')
      expect(authService.changePassword).toHaveBeenCalledTimes(1)
      expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: CLAVE_ACTUAL, newPassword: CLAVE_NUEVA })

      resolver({ token: 'tok-nuevo', email: 'ana@ejemplo.test', role: 'POSTULANTE' } as Awaited<ReturnType<typeof authService.changePassword>>)
      await flushPromises()
      expect(useAuthStore().token).toBe('tok-nuevo')
      expect(formClave(wrapper).text()).toContain('Tu contraseña se actualizó correctamente.')
      expect((wrapper.find('#applicant-current-password').element as HTMLInputElement).value).toBe('')
      expect((wrapper.find('#applicant-new-password').element as HTMLInputElement).value).toBe('')
      expect((wrapper.find('#applicant-repeat-password').element as HTMLInputElement).value).toBe('')
      expect(botonClave(wrapper).text()).toContain('Actualizar contraseña')
    })

    it('si el servidor rechaza la contraseña actual lo informa', async () => {
      vi.mocked(authService.changePassword).mockRejectedValue(new Error('La contraseña actual no es correcta'))
      const wrapper = await montar()
      await completar(wrapper, CLAVE_ACTUAL, CLAVE_NUEVA, CLAVE_NUEVA)
      await formClave(wrapper).trigger('submit')
      await flushPromises()
      expect(formClave(wrapper).text()).toContain('La contraseña actual no es correcta')
      expect(formClave(wrapper).text()).not.toContain('Tu contraseña se actualizó')
    })
  })
})

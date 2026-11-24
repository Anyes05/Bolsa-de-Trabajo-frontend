// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import RegistrationView from './RegistrationView.vue'
import { authService } from '../services/authService'
import { catalogService } from '../services/catalogService'
import { postulanteService } from '../services/postulanteService'
import { ApiRequestError } from '../services/http'
import { useAuthStore } from '../stores/auth'
import { useGoogleRegistrationStore } from '../stores/googleRegistration'
import type { AuthResponse, GoogleRegistration } from '../services/types'

vi.mock('../services/authService', () => ({
  authService: { googleAuthenticate: vi.fn(), registerApplicant: vi.fn(), googleRegister: vi.fn(), logout: vi.fn() },
}))
vi.mock('../services/catalogService', () => ({ catalogService: { getSectors: vi.fn() } }))
vi.mock('../services/postulanteService', () => ({ postulanteService: { uploadCv: vi.fn() } }))

// jsPDF falso: registra lo escrito y las páginas agregadas para verificar el CV manual generado.
const pdf = vi.hoisted(() => ({
  alto: 297,
  fallar: false,
  documentos: [] as Array<{ textos: Array<string | string[]>; paginas: number }>,
}))
vi.mock('jspdf', () => {
  class jsPDF {
    textos: Array<string | string[]> = []
    paginas = 1
    internal = { pageSize: { getHeight: () => pdf.alto } }
    constructor() { pdf.documentos.push(this) }
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    addPage() { this.paginas += 1 }
    text(valor: string | string[]) { this.textos.push(valor) }
    splitTextToSize(valor: string) { return valor.split('\n') }
    output() {
      if (pdf.fallar) throw new Error('No se pudo generar el PDF')
      return new Blob(['%PDF-falso'], { type: 'application/pdf' })
    }
  }
  return { jsPDF }
})

const Vacia = defineComponent({ render: () => h('div') })
const GoogleFalso = defineComponent({
  name: 'GoogleSignInButton',
  props: { disabled: Boolean, text: String },
  emits: ['credential'],
  render() { return h('div', { class: 'google-falso', 'data-disabled': String(this.disabled) }) },
})

const CLAVE = 'Segura#123'
const sesion: AuthResponse = { token: 'tok-registro', email: 'ana@test.uy', role: 'POSTULANTE', fullName: 'Ana' }
const registroGoogle: GoogleRegistration = {
  registrationToken: 'reg-google', email: 'ana@gmail.com', fullName: 'Ana Google', fotoUrl: 'https://foto.test/a.jpg',
}
const credencial = { credential: 'jwt', nonce: 'n1' }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

type EstadoInterno = { form: { identityCard: string } }

describe('vista de registro de postulante', () => {
  let router: Router
  let wrapper: VueWrapper
  const storage = new Map<string, string>()

  async function montar(pendiente: GoogleRegistration | null = null) {
    if (pendiente) storage.set('ccisj-google-registration', JSON.stringify(pendiente))
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'access', component: Vacia },
        { path: '/registro', name: 'register', component: RegistrationView },
        { path: '/terminos', name: 'terminos', component: Vacia },
        { path: '/postulante/ofertas-empleo', name: 'postulante-bolsa-empleo', component: Vacia },
        { path: '/postulante/mi-perfil', name: 'postulante-mi-perfil', component: Vacia },
      ],
    })
    await router.push('/registro')
    await router.isReady()
    wrapper = mount(RegistrationView, {
      attachTo: document.body,
      global: { plugins: [router], stubs: { GoogleSignInButton: GoogleFalso } },
    })
    await flushPromises()
    return wrapper
  }

  function boton(texto: string) {
    const encontrado = wrapper.findAll('button').find((item) => item.text().includes(texto))
    if (!encontrado) throw new Error(`No existe el botón "${texto}"`)
    return encontrado
  }

  function titulo() {
    return wrapper.find('h2').text()
  }

  async function abrirReautenticacion() {
    const detalle = wrapper.find<HTMLDetailsElement>('.registration-google__reauth')
    detalle.element.open = true
    await detalle.trigger('toggle')
  }

  async function enviar() {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  async function completarPaso1(datos: Partial<Record<string, string>> = {}) {
    const valores = {
      fullName: 'Ana Pérez', identityCard: '4.876.543-2', phone: '099123456', email: 'ana@test.uy',
      password: CLAVE, confirmPassword: CLAVE, ...datos,
    }
    for (const [campo, valor] of Object.entries(valores)) {
      await wrapper.find(`input#${campo}`).setValue(valor)
    }
  }

  async function elegirRubro(rubro: string) {
    const select = wrapper.find<HTMLSelectElement>('.sector-picker__select')
    await select.setValue(rubro)
  }

  async function completarPaso2() {
    await wrapper.find('#profileName').setValue('Perfil Ventas')
    await elegirRubro('Ventas')
  }

  async function llegarAlPaso3() {
    await montar()
    await completarPaso1()
    await enviar()
    await completarPaso2()
    await enviar()
    expect(titulo()).toContain('Curriculum Vitae')
  }

  async function aceptarTerminos() {
    await wrapper.find('.registration-terms__input').setValue(true)
  }

  function cargarArchivos(input: DOMWrapper<HTMLInputElement>, archivos: File[]) {
    Object.defineProperty(input.element, 'files', { value: archivos, configurable: true })
    return input.trigger('change')
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    pdf.alto = 297
    pdf.fallar = false
    pdf.documentos.length = 0
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    vi.stubGlobal('scrollTo', vi.fn())
    vi.mocked(catalogService.getSectors).mockResolvedValue(['Ventas', 'Logistica', 'Salud', 'Comercio', 'Turismo'])
    vi.mocked(authService.registerApplicant).mockResolvedValue(sesion)
    vi.mocked(authService.googleRegister).mockResolvedValue(sesion)
    vi.mocked(postulanteService.uploadCv).mockResolvedValue({} as never)
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('salida del registro', () => {
    it('ofrece volver al inicio y navega a la pantalla de acceso sin pedir confirmación', async () => {
      await montar()
      await wrapper.find('#fullName').setValue('Ana a medias')
      const volver = wrapper.find('a.registration__back')
      expect(volver.text()).toBe('Volver al inicio')
      expect(volver.attributes('href')).toBe('/')
      expect(volver.find('.registration__back-icon').exists()).toBe(true)
      await volver.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('access')
    })

    it('también está disponible con un registro de Google pendiente', async () => {
      await montar(registroGoogle)
      expect(wrapper.find('.registration__toolbar').attributes('aria-label')).toBe('Salir del registro')
      expect(wrapper.find('a.registration__back').exists()).toBe(true)
    })
  })

  describe('paso 1: datos personales', () => {
    it('carga los rubros del catálogo y usa los de respaldo si falla', async () => {
      await montar()
      await completarPaso1()
      await enviar()
      const opciones = wrapper.findAll('.sector-picker__select option').map((opcion) => opcion.text())
      expect(opciones).toEqual(['Seleccionar rubro...', 'Ventas', 'Logistica', 'Salud', 'Comercio', 'Turismo'])
      wrapper.unmount()

      vi.mocked(catalogService.getSectors).mockRejectedValueOnce(new Error('offline'))
      await montar()
      await completarPaso1()
      await enviar()
      const respaldo = wrapper.findAll('.sector-picker__select option')
      expect(respaldo.length).toBeGreaterThan(20)
      expect(respaldo.map((opcion) => opcion.text())).toContain('Atencion al Cliente')
    })

    it('marca todos los campos obligatorios vacíos', async () => {
      await montar()
      expect(wrapper.find('.google-falso').attributes('data-disabled')).toBe('false')
      await wrapper.find('#residenceArea').setValue('')
      await enviar()
      expect(wrapper.text()).toContain('Completa los campos obligatorios y verifica la contraseña.')
      const errores = wrapper.findAll('.app-field__error').map((item) => item.text())
      expect(errores).toEqual([
        'Ingresa tu nombre completo.', 'Ingresa tu cédula.', 'Ingresa un teléfono.', 'Ingresa un correo.',
        'Ingresa una contraseña.', 'Confirma tu contraseña.', 'Selecciona una zona.',
      ])
      expect(wrapper.find('#fullName').attributes('aria-invalid')).toBe('true')
      expect(titulo()).toContain('Datos Personales')
    })

    it('valida formato de correo, fuerza de la contraseña y coincidencia', async () => {
      await montar()
      await completarPaso1({ email: 'no-es-correo', password: 'debil', confirmPassword: 'otra' })
      await enviar()
      const errores = wrapper.findAll('.app-field__error').map((item) => item.text())
      expect(errores).toContain('El correo no es válido.')
      expect(errores).toContain('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.')
      expect(errores).toContain('Las contraseñas no coinciden.')
    })

    it('con datos válidos avanza al paso 2 y puede volver al paso 1', async () => {
      await montar()
      expect(wrapper.findAll('button').some((item) => item.text().includes('Anterior'))).toBe(false)
      await completarPaso1()
      await enviar()
      expect(titulo()).toContain('Primer Perfil Laboral')
      expect(document.activeElement?.id).toBe('step-profile')
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
      expect(wrapper.find('.stepper__step--active').text()).toContain('Primer Perfil')
      await boton('Anterior').trigger('click')
      await flushPromises()
      expect(titulo()).toContain('Datos Personales')
      expect(wrapper.find<HTMLInputElement>('#fullName').element.value).toBe('Ana Pérez')
    })
  })

  describe('paso 2: primer perfil', () => {
    async function irAlPaso2() {
      await montar()
      await completarPaso1()
      await enviar()
    }

    it('exige nombre de perfil y al menos un rubro', async () => {
      await irAlPaso2()
      await enviar()
      expect(wrapper.text()).toContain('Indica un perfil y al menos un rubro.')
      expect(wrapper.find('.app-field__error').text()).toBe('Indica un nombre para este perfil.')

      await elegirRubro('Salud')
      await enviar()
      expect(wrapper.text()).toContain('Indica un perfil y al menos un rubro.')
      expect(titulo()).toContain('Primer Perfil Laboral')

      await wrapper.find('#profileName').setValue('Perfil Salud')
      await boton('Salud').trigger('click')
      await enviar()
      expect(wrapper.text()).toContain('Indica un perfil y al menos un rubro.')
      expect(wrapper.find('.app-field__error').exists()).toBe(false)
    })

    it('limita a cuatro rubros, permite quitarlos e ignora la opción vacía', async () => {
      await irAlPaso2()
      for (const rubro of ['Ventas', 'Logistica', 'Salud', 'Comercio']) await elegirRubro(rubro)
      const select = wrapper.find<HTMLSelectElement>('.sector-picker__select')
      expect(select.element.disabled).toBe(true)
      expect(wrapper.findAll('.sector-picker__chip').map((chip) => chip.text())).toEqual([
        'Ventas ×', 'Logistica ×', 'Salud ×', 'Comercio ×',
      ])
      // Aunque el desplegable está deshabilitado, un quinto rubro se rechaza con un mensaje.
      select.element.value = 'Turismo'
      select.element.dispatchEvent(new Event('change'))
      await flushPromises()
      expect(wrapper.text()).toContain('Puedes seleccionar un máximo de 4 rubros para este perfil.')
      expect(wrapper.findAll('.sector-picker__chip')).toHaveLength(4)

      await wrapper.findAll('.sector-picker__chip')[0].trigger('click')
      expect(wrapper.text()).not.toContain('Puedes seleccionar un máximo de 4 rubros')
      expect(wrapper.findAll('.sector-picker__chip')).toHaveLength(3)
      expect(select.element.disabled).toBe(false)

      select.element.value = ''
      select.element.dispatchEvent(new Event('change'))
      await flushPromises()
      expect(wrapper.findAll('.sector-picker__chip')).toHaveLength(3)
    })

    it('permite elegir disponibilidad y vehículo propio', async () => {
      vi.mocked(postulanteService.uploadCv).mockResolvedValue({} as never)
      await irAlPaso2()
      await completarPaso2()
      const partTime = boton('Part-time')
      await partTime.trigger('click')
      expect(partTime.attributes('aria-pressed')).toBe('true')
      expect(boton('Full-time').attributes('aria-pressed')).toBe('false')
      await boton('Full-time').trigger('click')
      await boton('Part-time').trigger('click')
      await wrapper.find('.registration-card__check input').setValue(true)
      await enviar()
      await aceptarTerminos()
      await enviar()
      expect(authService.registerApplicant).toHaveBeenCalledWith(expect.objectContaining({
        availability: 'PART_TIME', hasVehicle: true, sectors: ['Ventas'], profileName: 'Perfil Ventas',
      }))
    })
  })

  describe('paso 3: CV y alta de la cuenta', () => {
    it('no registra sin aceptar los términos', async () => {
      await llegarAlPaso3()
      expect(wrapper.find('.registration-terms__link').attributes('href')).toBe('/terminos')
      await enviar()
      expect(wrapper.text()).toContain('Para crear la cuenta tenés que aceptar los términos y condiciones.')
      expect(authService.registerApplicant).not.toHaveBeenCalled()
      await boton('Anterior').trigger('click')
      await flushPromises()
      expect(titulo()).toContain('Primer Perfil Laboral')
    })

    it('registra sin CV y muestra la pantalla de éxito con sus acciones', async () => {
      await llegarAlPaso3()
      await aceptarTerminos()
      const pendiente = deferred<AuthResponse>()
      vi.mocked(authService.registerApplicant).mockReturnValueOnce(pendiente.promise)
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(boton('Registrando...').attributes('disabled')).toBeDefined()
      pendiente.resolve(sesion)
      await flushPromises()
      expect(authService.registerApplicant).toHaveBeenCalledWith({
        fullName: 'Ana Pérez', identityCard: '4.876.543-2', phone: '099123456', email: 'ana@test.uy',
        password: CLAVE, confirmPassword: CLAVE, residenceArea: 'San José de Mayo', profileName: 'Perfil Ventas',
        availability: 'FULL_TIME', hasVehicle: false, latestJob: '', experienceDescription: '',
        sectors: ['Ventas'], acceptedTerms: true,
      })
      expect(postulanteService.uploadCv).not.toHaveBeenCalled()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(wrapper.find('h1').text()).toBe('Registro completado')
      expect(wrapper.find('.stepper').exists()).toBe(false)
      expect(wrapper.find('.registration__back').exists()).toBe(false)
      expect(wrapper.find('.app-alert--success').text()).toContain('Tu cuenta de postulante se creó correctamente.')
      expect(document.activeElement?.id).toBe('register-done-title')

      await boton('Ir a ofertas de empleo').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('postulante-bolsa-empleo')
      await boton('Configurar mi perfil').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('postulante-mi-perfil')
      await boton('Volver al inicio de sesión').trigger('click')
      await flushPromises()
      expect(authService.logout).toHaveBeenCalled()
      expect(useAuthStore().isAuthenticated).toBe(false)
      expect(router.currentRoute.value.name).toBe('access')
    })

    it('adjunta solo PDFs, permite quitarlos y sube el CV elegido', async () => {
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      expect(boton('Adjuntar CV').attributes('aria-pressed')).toBe('true')
      const input = wrapper.find<HTMLInputElement>('#cv-file-input')
      const cv = new File(['%PDF'], 'mi-cv.pdf', { type: 'application/pdf' })
      const otro = new File(['%PDF'], 'otro.pdf', { type: 'application/pdf' })
      const imagen = new File(['img'], 'foto.png', { type: 'image/png' })
      await cargarArchivos(input, [imagen, cv, otro])
      expect(wrapper.find('.upload-files__header strong').text()).toBe('Archivos seleccionados (1)')
      expect(wrapper.find('.upload-files__item span').text()).toBe('mi-cv.pdf')
      await wrapper.find('.upload-files__remove').trigger('click')
      expect(wrapper.find('.upload-files').exists()).toBe(false)
      await cargarArchivos(input, [cv])
      await wrapper.find('.upload-files__clear').trigger('click')
      expect(wrapper.find('.upload-files').exists()).toBe(false)
      Object.defineProperty(input.element, 'files', { value: null, configurable: true })
      await input.trigger('change')
      expect(wrapper.find('.upload-files').exists()).toBe(false)
      await cargarArchivos(input, [cv])

      await aceptarTerminos()
      await enviar()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(cv, '', 'tok-registro')
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('si falla la subida del CV por otro motivo, registra igual y lo deja en el log', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(postulanteService.uploadCv).mockRejectedValue(new Error('El archivo supera 5MB'))
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      await cargarArchivos(wrapper.find('#cv-file-input'), [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })])
      await aceptarTerminos()
      await enviar()
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(1)
      const mensajes = consola.mock.calls.map(([mensaje]) => String(mensaje))
      expect(mensajes[0]).toMatch(/^\[register-upload-first-attempt\] error .*El archivo supera 5MB/)
      expect(mensajes[1]).toMatch(/^\[register-upload-final\] error .*"hasAuthToken":true/)
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('reintenta una vez la subida ante un 403 esporádico', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(postulanteService.uploadCv)
        .mockRejectedValueOnce(new ApiRequestError(403, '/postulante/cvs', { detail: 'Forbidden' }, 'Forbidden'))
        .mockResolvedValueOnce({} as never)
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      await cargarArchivos(wrapper.find('#cv-file-input'), [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })])
      await aceptarTerminos()
      await wrapper.find('form').trigger('submit')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(2)
      expect(consola).toHaveBeenCalledTimes(1)
      expect(String(consola.mock.calls[0][0])).toMatch(/^\[register-upload-first-attempt\] API error .*"status":403/)
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('si el reintento también falla, lo registra y no bloquea el alta', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(postulanteService.uploadCv).mockRejectedValue(new Error('HTTP 403'))
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      await cargarArchivos(wrapper.find('#cv-file-input'), [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })])
      await aceptarTerminos()
      await wrapper.find('form').trigger('submit')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(2)
      const prefijos = consola.mock.calls.map(([mensaje]) => String(mensaje).split(']')[0])
      expect(prefijos).toEqual(['[register-upload-first-attempt', '[register-upload-retry', '[register-upload-final'])
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('muestra el error del servidor si el alta falla y lo registra', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authService.registerApplicant).mockRejectedValueOnce(
        new ApiRequestError(409, '/auth/register', { detail: 'La cédula ya está registrada.' }, 'La cédula ya está registrada.'),
      )
      await llegarAlPaso3()
      await aceptarTerminos()
      await enviar()
      expect(wrapper.text()).toContain('La cédula ya está registrada. Revisá los datos e intentá nuevamente.')
      expect(String(consola.mock.calls[0][0])).toMatch(/^\[register-submit\] API error .*"status":409.*"hasStoreToken":false/)
      expect(boton('Completar Registro').attributes('disabled')).toBeUndefined()
    })

    it('si la subida falla con algo que no es Error, no reintenta y registra igual', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(postulanteService.uploadCv).mockRejectedValue('sin conexión')
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      await cargarArchivos(wrapper.find('#cv-file-input'), [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })])
      await aceptarTerminos()
      await enviar()
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(1)
      expect(String(consola.mock.calls[0][0])).toContain('"message":"sin conexión"')
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('registra en el log fallas que no son Error', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(authService.registerApplicant).mockRejectedValueOnce('caída inesperada')
      await llegarAlPaso3()
      await aceptarTerminos()
      await enviar()
      expect(String(consola.mock.calls[0][0])).toContain('[register-submit] error {"message":"caída inesperada"')
      expect(wrapper.text()).toContain('No se pudo completar el registro. Intentá nuevamente; si el problema continúa, contactá al CCISJ.')
    })
  })

  describe('CV manual', () => {
    async function irAlCvManual() {
      await llegarAlPaso3()
      await boton('Adjuntar CV').trigger('click')
      await cargarArchivos(wrapper.find('#cv-file-input'), [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })])
      await boton('Crear CV manualmente').trigger('click')
      expect(wrapper.find('#manual-cv-title').exists()).toBe(true)
    }

    function textosDelPdf() {
      return pdf.documentos[0].textos.map((texto) => (Array.isArray(texto) ? texto.join(' ') : texto))
    }

    function entradas(seccion: number) {
      return wrapper.findAll('.manual-cv-section')[seccion]
    }

    it('exige al menos una referencia laboral o personal', async () => {
      await irAlCvManual()
      await aceptarTerminos()
      await enviar()
      expect(wrapper.text()).toContain('Agrega al menos una referencia laboral o personal para crear el CV manual.')
      expect(authService.registerApplicant).not.toHaveBeenCalled()
    })

    it('agrega y quita bloques del CV manual', async () => {
      await irAlCvManual()
      await boton('Agregar experiencia').trigger('click')
      expect(entradas(1).find('.manual-cv-entry__remove').exists()).toBe(false)
      await boton('Agregar experiencia').trigger('click')
      expect(entradas(1).findAll('.manual-cv-entry')).toHaveLength(2)
      await entradas(1).find('.manual-cv-entry__remove').trigger('click')
      expect(entradas(1).findAll('.manual-cv-entry')).toHaveLength(1)

      await boton('Agregar formación').trigger('click')
      await boton('Agregar formación').trigger('click')
      await entradas(2).find('.manual-cv-entry__remove').trigger('click')
      expect(entradas(2).findAll('.manual-cv-entry')).toHaveLength(1)

      await boton('Agregar idioma').trigger('click')
      await boton('Agregar idioma').trigger('click')
      await entradas(4).find('button[aria-label="Quitar idioma"]').trigger('click')
      expect(entradas(4).findAll('.manual-cv-language')).toHaveLength(1)

      await entradas(5).find('.manual-cv-section__heading button').trigger('click')
      await entradas(5).find('.manual-cv-entry__remove').trigger('click')
      expect(entradas(5).findAll('.manual-cv-entry')).toHaveLength(0)
      await entradas(6).find('.manual-cv-section__heading button').trigger('click')
      await entradas(6).find('.manual-cv-entry__remove').trigger('click')
      expect(entradas(6).findAll('.manual-cv-entry')).toHaveLength(0)

      expect(entradas(3).find('textarea').exists()).toBe(false)
      await boton('Agregar competencias').trigger('click')
      expect(entradas(3).findAll('textarea')).toHaveLength(2)
      expect(wrapper.findAll('button').some((item) => item.text().includes('Agregar competencias'))).toBe(false)
    })

    it('genera un PDF completo, lo sube y resume la experiencia en el perfil', async () => {
      pdf.alto = 60
      await irAlCvManual()
      await wrapper.find('#manualSummary').setValue('Vendedora con 5 años de experiencia')

      await boton('Agregar experiencia').trigger('click')
      await boton('Agregar experiencia').trigger('click')
      await boton('Agregar experiencia').trigger('click')
      const experiencias = entradas(1).findAll('.manual-cv-entry')
      await experiencias[0].find('input[placeholder="Ej: Auxiliar administrativo"]').setValue('Vendedora')
      await experiencias[0].find('input[placeholder="Ej: Empresa Ejemplo"]').setValue('Tienda Sol')
      await experiencias[0].findAll('input[type="month"]')[0].setValue('2020-01')
      await experiencias[0].find('input[type="checkbox"]').setValue(true)
      expect(experiencias[0].findAll<HTMLInputElement>('input[type="month"]')[1].element.disabled).toBe(true)
      await experiencias[0].find('textarea').setValue('Atención al público')
      await experiencias[1].find('input[placeholder="Ej: Empresa Ejemplo"]').setValue('Kiosco Luna')
      await experiencias[1].findAll('input[type="month"]')[0].setValue('2018-01')
      await experiencias[1].findAll('input[type="month"]')[1].setValue('2019-12')

      await boton('Agregar formación').trigger('click')
      await boton('Agregar formación').trigger('click')
      const formaciones = entradas(2).findAll('.manual-cv-entry')
      await formaciones[0].find('input[placeholder="Ej: UTU"]').setValue('UTU')
      await formaciones[0].find('input[placeholder="Ej: Técnico en administración"]').setValue('Técnico en ventas')
      await formaciones[0].find('select').setValue('Técnico')
      await formaciones[0].findAll('input[type="month"]')[0].setValue('2015-03')
      await formaciones[0].findAll('input[type="month"]')[1].setValue('2017-12')

      await boton('Agregar competencias').trigger('click')
      const competencias = entradas(3).findAll('textarea')
      await competencias[0].setValue('Excel, caja')
      await competencias[1].setValue('Curso de atención al cliente')

      await boton('Agregar idioma').trigger('click')
      await boton('Agregar idioma').trigger('click')
      const idiomas = entradas(4).findAll('.manual-cv-language')
      await idiomas[0].find('input').setValue('Inglés')
      await idiomas[0].find('select').setValue('Intermedio')
      await idiomas[1].find('input').setValue('Portugués')

      await entradas(5).find('.manual-cv-section__heading button').trigger('click')
      await entradas(5).find('.manual-cv-section__heading button').trigger('click')
      const laborales = entradas(5).findAll('.manual-cv-entry')
      await laborales[0].find('input[placeholder="Nombre completo"]').setValue('Luis Gómez')
      await laborales[0].find('input[placeholder="Ej: Supervisor"]').setValue('Supervisor')
      await laborales[0].find('input[placeholder="Empresa"]').setValue('Tienda Sol')
      await laborales[0].find('input[type="tel"]').setValue('099111222')
      await laborales[0].find('input[type="email"]').setValue('luis@sol.uy')

      await entradas(6).find('.manual-cv-section__heading button').trigger('click')
      await entradas(6).find('.manual-cv-section__heading button').trigger('click')
      const personales = entradas(6).findAll('.manual-cv-entry')
      await personales[0].find('input[placeholder="Nombre completo"]').setValue('Marta Ruiz')
      await personales[0].find('input[placeholder="Ej: Excompañero/a"]').setValue('Excompañera')
      await personales[0].find('input[type="tel"]').setValue('098765432')
      await personales[0].find('input[type="email"]').setValue('marta@correo.uy')

      await aceptarTerminos()
      await enviar()

      expect(authService.registerApplicant).toHaveBeenCalledWith(expect.objectContaining({
        latestJob: 'Vendedora - Tienda Sol', experienceDescription: 'Vendedora con 5 años de experiencia',
      }))
      expect(pdf.documentos).toHaveLength(1)
      const [documento] = pdf.documentos
      expect(documento.paginas).toBeGreaterThan(1)
      const textos = documento.textos.map((texto) => (Array.isArray(texto) ? texto.join('\n') : texto))
      expect(textos.slice(0, 5)).toEqual([
        'Ana Pérez', 'Correo: ana@test.uy', 'Teléfono: 099123456', 'Zona: San José de Mayo', 'Perfil: Perfil Ventas',
      ])
      expect(textos).toEqual(expect.arrayContaining([
        'Perfil profesional', 'Experiencia laboral', 'Vendedora | Tienda Sol', '2020-01 - Actualidad', 'Atención al público',
        'Kiosco Luna', '2018-01 - 2019-12', 'Formación académica', 'Técnico en ventas | UTU | Técnico | 2015-03 - 2017-12',
        'Habilidades técnicas', 'Excel, caja', 'Idiomas', 'Inglés - Intermedio, Portugués',
        'Cursos y certificaciones', 'Curso de atención al cliente', 'Referencias laborales',
        'Luis Gómez | Supervisor | Tienda Sol | 099111222 | luis@sol.uy', 'Referencias personales', 'Marta Ruiz | Excompañera | 098765432 | marta@correo.uy',
      ]))
      // Las entradas vacías no se imprimen.
      expect(textos.filter((texto) => texto === '')).toHaveLength(0)
      const [archivo, resumen, token] = vi.mocked(postulanteService.uploadCv).mock.calls[0]
      expect(archivo.name).toBe('cv-manual.pdf')
      expect(archivo.type).toBe('application/pdf')
      expect(resumen).toBe('Vendedora con 5 años de experiencia')
      expect(token).toBe('tok-registro')
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(1)
    })

    it('con solo una referencia genera un CV mínimo y usa la descripción de la experiencia como resumen', async () => {
      await irAlCvManual()
      await boton('Agregar experiencia').trigger('click')
      const experiencia = entradas(1).find('.manual-cv-entry')
      await experiencia.find('input[placeholder="Ej: Auxiliar administrativo"]').setValue('Repositor')
      await experiencia.find('textarea').setValue('Reposición de góndolas')
      await entradas(6).find('.manual-cv-section__heading button').trigger('click')
      await entradas(6).find('input[placeholder="Nombre completo"]').setValue('Marta Ruiz')
      await aceptarTerminos()
      await enviar()
      expect(authService.registerApplicant).toHaveBeenCalledWith(expect.objectContaining({
        latestJob: 'Repositor', experienceDescription: 'Reposición de góndolas',
      }))
      const textos = textosDelPdf()
      expect(textos).toContain('Experiencia laboral')
      expect(textos).not.toContain('Perfil profesional')
      expect(textos).not.toContain('Referencias laborales')
      expect(textos).toContain('Marta Ruiz')
      expect(vi.mocked(postulanteService.uploadCv).mock.calls[0][1]).toBe('Reposición de góndolas')
    })

    it('si no se puede generar el PDF igual completa el registro, porque la cuenta ya se creó', async () => {
      const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
      pdf.fallar = true
      await irAlCvManual()
      await entradas(5).find('.manual-cv-section__heading button').trigger('click')
      await entradas(5).find('input[placeholder="Nombre completo"]').setValue('Luis Gómez')
      await aceptarTerminos()
      await enviar()
      expect(authService.registerApplicant).toHaveBeenCalledTimes(1)
      expect(postulanteService.uploadCv).not.toHaveBeenCalled()
      // La falla del PDF queda registrada, pero no bloquea: el CV se puede cargar luego en Mis Perfiles.
      expect(String(consola.mock.calls[0][0])).toMatch(/^\[register-manual-cv\] error/)
      expect(wrapper.text()).not.toContain('No se pudo generar el PDF')
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('sin experiencia ni resumen envía el perfil sin último trabajo', async () => {
      await irAlCvManual()
      await entradas(5).find('.manual-cv-section__heading button').trigger('click')
      await entradas(5).find('input[placeholder="Nombre completo"]').setValue('Luis Gómez')
      await aceptarTerminos()
      await enviar()
      expect(authService.registerApplicant).toHaveBeenCalledWith(expect.objectContaining({
        latestJob: '', experienceDescription: '',
      }))
      expect(textosDelPdf()).toContain('Luis Gómez')
    })
  })

  describe('registro con Google', () => {
    it('desde el paso 1, Google sin cuenta completa nombre y correo y salta al paso 2', async () => {
      vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'REGISTER', ...registroGoogle })
      await montar()
      await wrapper.find('#password').setValue('algo')
      wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
      await flushPromises()
      expect(authService.googleAuthenticate).toHaveBeenCalledWith(credencial)
      expect(titulo()).toContain('Primer Perfil Laboral')
      expect(wrapper.find<HTMLInputElement>('#google-fullName').element.value).toBe('Ana Google')
      expect(wrapper.find<HTMLInputElement>('#google-email').element.value).toBe('ana@gmail.com')
      expect(wrapper.find('.registration-google img').attributes('src')).toBe('https://foto.test/a.jpg')
      expect(useGoogleRegistrationStore().pending).toMatchObject(registroGoogle)
      expect(wrapper.findAll('button').some((item) => item.text().includes('Anterior'))).toBe(false)
    })

    it('si la cuenta de Google ya existe, inicia sesión y va a las ofertas', async () => {
      vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LOGIN', session: sesion })
      await montar()
      wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
      await flushPromises()
      expect(useAuthStore().isAuthenticated).toBe(true)
      expect(router.currentRoute.value.name).toBe('postulante-bolsa-empleo')
    })

    it('si el correo ya tiene cuenta con contraseña, indica cómo vincular Google', async () => {
      vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'LINK_REQUIRED', email: 'ana@gmail.com', fullName: 'Ana' })
      await montar()
      wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
      await flushPromises()
      expect(wrapper.text()).toContain('Este correo ya tiene una cuenta. Entrá desde Iniciar sesión y confirmá tu contraseña para vincular Google.')
      expect(titulo()).toContain('Datos Personales')
    })

    it('muestra el error de Google e ignora credenciales mientras procesa', async () => {
      let rechazar!: (cause: unknown) => void
      vi.mocked(authService.googleAuthenticate).mockReturnValue(new Promise((_, fail) => { rechazar = fail }))
      await montar()
      const google = wrapper.findComponent(GoogleFalso)
      google.vm.$emit('credential', credencial)
      await flushPromises()
      expect(wrapper.find('.google-falso').attributes('data-disabled')).toBe('true')
      google.vm.$emit('credential', credencial)
      await flushPromises()
      expect(authService.googleAuthenticate).toHaveBeenCalledTimes(1)
      rechazar(new Error('Failed to fetch'))
      await flushPromises()
      expect(wrapper.text()).toContain('No se pudo registrarte con Google: no hay conexión con el servidor.')
    })

    it('con un registro pendiente arranca en el paso 2 y exige los datos que Google no da', async () => {
      await montar({ ...registroGoogle, fotoUrl: null })
      expect(titulo()).toContain('Primer Perfil Laboral')
      expect(wrapper.find('.registration-google__avatar').text()).toBe('A')
      await wrapper.find('#google-fullName').setValue('   ')
      await wrapper.find('#google-residenceArea').setValue('')
      await enviar()
      expect(wrapper.text()).toContain('Completa los datos personales que Google no proporciona.')
      const errores = wrapper.findAll('.app-field__error').map((item) => item.text())
      expect(errores).toEqual(['Ingresa tu nombre completo.', 'Ingresa tu cédula.', 'Ingresa un teléfono.', 'Selecciona una zona.'])
    })

    it('completa el registro con Google enviando el token de registro', async () => {
      await montar(registroGoogle)
      await wrapper.find('#google-identityCard').setValue('12345678')
      await wrapper.find('#google-phone').setValue('099000111')
      await completarPaso2()
      await enviar()
      expect(titulo()).toContain('Curriculum Vitae')
      await boton('Anterior').trigger('click')
      await flushPromises()
      expect(titulo()).toContain('Primer Perfil Laboral')
      expect(wrapper.findAll('button').some((item) => item.text().includes('Anterior'))).toBe(false)
      await enviar()
      await aceptarTerminos()
      await enviar()
      expect(authService.googleRegister).toHaveBeenCalledWith({
        registrationToken: 'reg-google', fullName: 'Ana Google', identityCard: '12345678', phone: '099000111',
        residenceArea: 'San José de Mayo', profileName: 'Perfil Ventas', sectors: ['Ventas'], availability: 'FULL_TIME',
        hasVehicle: false, latestJob: '', experienceDescription: '', acceptedTerms: true,
      })
      expect(authService.registerApplicant).not.toHaveBeenCalled()
      expect(useGoogleRegistrationStore().pending).toBeNull()
      expect(wrapper.find('h1').text()).toBe('Registro completado')
    })

    it('al completar vuelve al paso 2 si los datos de Google dejaron de ser válidos', async () => {
      await montar(registroGoogle)
      await wrapper.find('#google-identityCard').setValue('12345678')
      await wrapper.find('#google-phone').setValue('099000111')
      await completarPaso2()
      await enviar()
      // Simula que el dato se perdió entre pasos (no hay campo editable en el paso 3).
      ;(wrapper.vm as unknown as EstadoInterno).form.identityCard = ''
      await aceptarTerminos()
      await enviar()
      expect(titulo()).toContain('Primer Perfil Laboral')
      expect(wrapper.text()).toContain('Completa los datos personales que Google no proporciona.')
      expect(authService.googleRegister).not.toHaveBeenCalled()
    })

    it('al reautenticar con otra cuenta de Google rechaza el cambio', async () => {
      vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'REGISTER', ...registroGoogle, email: 'otra@gmail.com' })
      await montar(registroGoogle)
      await abrirReautenticacion()
      wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
      await flushPromises()
      expect(wrapper.text()).toContain('Usá la misma cuenta de Google para continuar este registro.')
      expect(useGoogleRegistrationStore().pending?.email).toBe('ana@gmail.com')
    })

    it('al reautenticar con la misma cuenta renueva el token y conserva el nombre editado', async () => {
      vi.mocked(authService.googleAuthenticate).mockResolvedValue({ status: 'REGISTER', ...registroGoogle, registrationToken: 'nuevo-token' })
      await montar(registroGoogle)
      await wrapper.find('#google-fullName').setValue('Ana María')
      await abrirReautenticacion()
      wrapper.findComponent(GoogleFalso).vm.$emit('credential', credencial)
      await flushPromises()
      expect(useGoogleRegistrationStore().pending?.registrationToken).toBe('nuevo-token')
      expect(wrapper.find<HTMLInputElement>('#google-fullName').element.value).toBe('Ana María')
    })

    it('la reautenticación con Google es un desplegable cerrado que monta el botón al abrirse', async () => {
      await montar(registroGoogle)
      const detalle = wrapper.find<HTMLDetailsElement>('.registration-google__reauth')
      expect(detalle.element.open).toBe(false)
      expect(detalle.classes()).not.toContain('registration-google__reauth--open')
      expect(wrapper.find('.registration-google__reauth-summary').text()).toBe('Volver a autenticarme con Google si venció el registro')
      expect(wrapper.find('.registration-google__reauth-icon').classes()).not.toContain('registration-google__reauth-icon--open')
      expect(wrapper.findComponent(GoogleFalso).exists()).toBe(false)

      await abrirReautenticacion()
      expect(detalle.classes()).toContain('registration-google__reauth--open')
      expect(wrapper.find('.registration-google__reauth-icon').classes()).toContain('registration-google__reauth-icon--open')
      expect(wrapper.findComponent(GoogleFalso).props('text')).toBe('signup_with')

      detalle.element.open = false
      await detalle.trigger('toggle')
      expect(detalle.classes()).not.toContain('registration-google__reauth--open')
      expect(wrapper.findComponent(GoogleFalso).exists()).toBe(false)
    })

    it('el botón para abandonar Google es un botón secundario de la app', async () => {
      await montar(registroGoogle)
      const cancelar = boton('Usar otro correo o registrarme con contraseña')
      expect(cancelar.classes()).toEqual(expect.arrayContaining(['app-button', 'app-button--secondary', 'registration-google__cancel']))
      expect(cancelar.attributes('type')).toBe('button')
    })

    it('permite abandonar el registro con Google y volver al paso 1', async () => {
      await montar(registroGoogle)
      await boton('Usar otro correo o registrarme con contraseña').trigger('click')
      await flushPromises()
      expect(titulo()).toContain('Datos Personales')
      expect(wrapper.find<HTMLInputElement>('#email').element.value).toBe('')
      expect(useGoogleRegistrationStore().pending).toBeNull()
      expect(storage.has('ccisj-google-registration')).toBe(false)
    })
  })
})

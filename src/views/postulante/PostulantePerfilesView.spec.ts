// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import PostulantePerfilesView from './PostulantePerfilesView.vue'
import { catalogService } from '../../services/catalogService'
import { postulanteService } from '../../services/postulanteService'
import type { CvResponse, DisponibilidadLaboral, ProfessionalProfile } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../services/postulanteService', () => ({
  postulanteService: {
    listProfiles: vi.fn(), listCvs: vi.fn(), disponibilidadLaboral: vi.fn(), updateDisponibilidadLaboral: vi.fn(),
    createProfile: vi.fn(), updateProfile: vi.fn(), uploadCv: vi.fn(), deleteCv: vi.fn(),
  },
}))
vi.mock('../../services/catalogService', () => ({ catalogService: { getSectors: vi.fn() } }))

// jsPDF falso: registra lo escrito y las páginas agregadas para verificar el CV manual generado.
const pdf = vi.hoisted(() => ({
  alto: 297,
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
    output() { return new Blob(['%PDF-falso'], { type: 'application/pdf' }) }
  }
  return { jsPDF }
})

const ShellStub = defineComponent({ setup: (_, { slots }) => () => h('div', slots.default?.()) })

function perfil(id: number, cambios: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id, nombre: `Perfil ${id}`, disponibilidadHoraria: 'FULL_TIME', tieneVehiculo: false, libreta: '',
    ultimoEmpleo: null, descripcionExperiencia: null, visible: true, rubros: [], ...cambios,
  }
}

function cv(id: number, perfilLaboralId: number, cambios: Partial<CvResponse> = {}): CvResponse {
  return {
    id, perfilLaboralId, resumen: null, nombreArchivo: `cv-${id}.pdf`, mimeType: 'application/pdf', sizeBytes: 10,
    fechaCarga: '2026-11-01', downloadUrl: `https://s3.test/cv-${id}.pdf`, ...cambios,
  }
}

const activa: DisponibilidadLaboral = { busquedaPausada: false }
const pausada: DisponibilidadLaboral = { busquedaPausada: true }

describe('mis perfiles profesionales', () => {
  let pinia: Pinia
  let confirmar: ReturnType<typeof vi.spyOn>
  let abrir: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    pdf.alto = 297
    pdf.documentos = []
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setSession({ token: 'tok', email: 'ana@ejemplo.test', role: 'POSTULANTE' })
    vi.mocked(postulanteService.listProfiles).mockResolvedValue([])
    vi.mocked(postulanteService.listCvs).mockResolvedValue([])
    vi.mocked(postulanteService.disponibilidadLaboral).mockResolvedValue(activa)
    vi.mocked(catalogService.getSectors).mockResolvedValue(['Ventas', 'Logística', 'Salud', 'Turismo', 'Comercio'])
    confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
    abrir = vi.spyOn(window, 'open').mockReturnValue(null)
  })

  afterEach(() => {
    confirmar.mockRestore()
    abrir.mockRestore()
  })

  async function montar() {
    const wrapper = mount(PostulantePerfilesView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
    await flushPromises()
    return wrapper
  }

  const boton = (scope: VueWrapper | ReturnType<VueWrapper['find']>, texto: string) =>
    scope.findAll('button').find((b) => b.text().trim() === texto)!
  const tarjetas = (wrapper: VueWrapper) => wrapper.findAll('.profile-card-postulante')
  const modal = (wrapper: VueWrapper) => wrapper.find('.modal')
  const alertaPrincipal = (wrapper: VueWrapper) => wrapper.find('.postulante-profiles > .app-alert')

  describe('carga', () => {
    it('muestra "cargando" y luego avisa que no hay perfiles', async () => {
      vi.mocked(postulanteService.listProfiles).mockReturnValueOnce(new Promise(() => {}))
      vi.mocked(postulanteService.disponibilidadLaboral).mockReturnValueOnce(new Promise(() => {}))
      const cargando = mount(PostulantePerfilesView, { global: { plugins: [pinia], stubs: { PostulanteShell: ShellStub } } })
      await flushPromises()
      expect(cargando.text()).toContain('Cargando perfiles...')
      expect(cargando.text()).toContain('Cargando disponibilidad...')
      cargando.unmount()

      const wrapper = await montar()
      expect(postulanteService.listProfiles).toHaveBeenLastCalledWith('tok')
      expect(wrapper.text()).toContain('Aún no tienes perfiles profesionales.')
      expect(wrapper.find('.job-search-status__state').text()).toBe('Estoy buscando trabajo')
    })

    it('sin sesión consulta igual sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      await montar()
      expect(postulanteService.listProfiles).toHaveBeenCalledWith(undefined)
      expect(postulanteService.listCvs).toHaveBeenCalledWith(undefined)
      expect(postulanteService.disponibilidadLaboral).toHaveBeenCalledWith(undefined)
    })

    it('si no puede cargar los perfiles lo informa', async () => {
      vi.mocked(catalogService.getSectors).mockRejectedValue(new Error('Catálogo caído'))
      const wrapper = await montar()
      expect(alertaPrincipal(wrapper).text()).toContain('Catálogo caído')
    })

    it('muestra el detalle de cada perfil y sus CV', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([
        perfil(1, { rubros: ['Ventas', 'Salud'], tieneVehiculo: true, libreta: 'Cat. A', ultimoEmpleo: 'Cajera', descripcionExperiencia: 'Cinco años', disponibilidadHoraria: 'PART_TIME' }),
        perfil(2, { visible: false, disponibilidadHoraria: 'INDEFINIDO' }),
      ])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1), cv(11, 1, { nombreArchivo: null })])
      const wrapper = await montar()
      const [primera, segunda] = tarjetas(wrapper)

      expect(primera.find('.profile-card-postulante__header-heading').text()).toBe('Perfil 1')
      expect(primera.find('.profile-card-postulante__visibility').text()).toBe('Perfil visible')
      expect(primera.find('.profile-card-postulante__visibility').classes()).toContain('profile-card-postulante__visibility--visible')
      expect(primera.findAll('.profile-card-postulante__skills-inline').map((r) => r.text())).toEqual(['Ventas', 'Salud'])
      const detalle = primera.find('.profile-card-postulante__details').text()
      expect(detalle).toContain('Part-time')
      expect(detalle).toContain('Vehículo propio: Sí')
      expect(detalle).toContain('Cat. A')
      expect(detalle).toContain('Cajera')
      expect(detalle).toContain('Cinco años')
      expect(primera.findAll('.profile-pdfs__item').map((i) => i.find('span').text())).toEqual(['cv-10.pdf', 'CV del perfil'])

      expect(segunda.find('.profile-card-postulante__visibility').text()).toBe('Perfil oculto')
      expect(segunda.find('.profile-card-postulante__visibility').classes()).toContain('profile-card-postulante__visibility--hidden')
      const otro = segunda.find('.profile-card-postulante__details').text()
      expect(otro).toContain('Cualquier horario')
      expect(otro).toContain('Vehículo propio: No')
      expect(otro).toContain('Libreta de conducir: No informada')
      expect(otro).toContain('Detalle del último empleo: No informado')
      expect(segunda.text()).toContain('Este perfil todavía no tiene un CV.')
      expect(boton(segunda, 'Hacer visible').exists()).toBe(true)
    })

    it('descarga el CV en una pestaña nueva', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      const wrapper = await montar()
      await boton(tarjetas(wrapper)[0], 'Descargar').trigger('click')
      expect(abrir).toHaveBeenCalledWith('https://s3.test/cv-10.pdf', '_blank', 'noopener,noreferrer')
    })
  })

  describe('disponibilidad laboral', () => {
    it('si no se pudo cargar permite reintentar', async () => {
      vi.mocked(postulanteService.disponibilidadLaboral).mockRejectedValueOnce(new Error('Sin conexión'))
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      const wrapper = await montar()
      const estado = wrapper.find('.job-search-status')
      expect(estado.text()).toContain('Disponibilidad no disponible')
      expect(estado.text()).toContain('Sin conexión')
      expect(estado.find('[role="switch"]').exists()).toBe(false)
      expect(tarjetas(wrapper)[0].find('.profile-card-postulante__visibility').text()).toBe('Visibilidad pendiente')

      await boton(estado, 'Reintentar').trigger('click')
      await flushPromises()
      expect(postulanteService.disponibilidadLaboral).toHaveBeenCalledTimes(2)
      expect(wrapper.find('.job-search-status__state').text()).toBe('Estoy buscando trabajo')
      expect(wrapper.find('.job-search-status').text()).not.toContain('Sin conexión')
    })

    it('pausa la búsqueda, oculta los perfiles y la vuelve a activar', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1), perfil(2, { visible: false })])
      let resolver: (valor: DisponibilidadLaboral) => void = () => {}
      vi.mocked(postulanteService.updateDisponibilidadLaboral).mockReturnValueOnce(new Promise((resolve) => { resolver = resolve }))
      const wrapper = await montar()
      const interruptor = wrapper.find('[role="switch"]')
      expect(interruptor.attributes('aria-checked')).toBe('false')

      await interruptor.trigger('click')
      expect(wrapper.text()).toContain('Guardando disponibilidad...')
      expect(interruptor.attributes('disabled')).toBeDefined()
      resolver(pausada)
      await flushPromises()
      expect(postulanteService.updateDisponibilidadLaboral).toHaveBeenCalledWith(true, 'tok')
      expect(wrapper.find('.job-search-status').classes()).toContain('job-search-status--paused')
      expect(wrapper.find('.job-search-status__state').text()).toBe('Búsqueda pausada')
      expect(wrapper.find('.job-search-status__confirmation').text()).toContain('Búsqueda pausada. Tus perfiles ya no aparecen')
      expect(wrapper.find('#job-search-help').text()).toContain('Tus perfiles están ocultos para las búsquedas de socios.')
      expect(tarjetas(wrapper)[0].find('.profile-card-postulante__visibility').text()).toBe('Oculto por búsqueda pausada')
      expect(boton(tarjetas(wrapper)[1], 'Habilitar al reanudar').exists()).toBe(true)

      vi.mocked(postulanteService.updateDisponibilidadLaboral).mockResolvedValueOnce(activa)
      await interruptor.trigger('click')
      await flushPromises()
      expect(postulanteService.updateDisponibilidadLaboral).toHaveBeenLastCalledWith(false, 'tok')
      expect(wrapper.find('.job-search-status__confirmation').text()).toContain('Volviste a activar tu búsqueda.')
    })

    it('si no puede guardar la disponibilidad lo informa sin ofrecer reintento', async () => {
      vi.mocked(postulanteService.updateDisponibilidadLaboral).mockRejectedValue(new Error('No se pudo pausar'))
      const wrapper = await montar()
      await wrapper.find('[role="switch"]').trigger('click')
      await flushPromises()
      const estado = wrapper.find('.job-search-status')
      expect(estado.text()).toContain('No se pudo pausar')
      expect(boton(estado, 'Reintentar')).toBeUndefined()
    })

    it('sin sesión guarda igual sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.updateDisponibilidadLaboral).mockResolvedValue(pausada)
      const wrapper = await montar()
      await wrapper.find('[role="switch"]').trigger('click')
      await flushPromises()
      expect(postulanteService.updateDisponibilidadLaboral).toHaveBeenCalledWith(true, undefined)
    })
  })

  describe('visibilidad de cada perfil', () => {
    it('oculta un perfil visible y vuelve a mostrarlo', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.updateProfile).mockImplementation(async (p) => p)
      const wrapper = await montar()

      await boton(tarjetas(wrapper)[0], 'Ocultar perfil').trigger('click')
      await flushPromises()
      expect(postulanteService.updateProfile).toHaveBeenLastCalledWith(expect.objectContaining({ id: 1, visible: false }), 'tok')
      expect(alertaPrincipal(wrapper).text()).toContain('El perfil quedó oculto y no aparecerá en la bolsa de empleo.')

      await boton(tarjetas(wrapper)[0], 'Hacer visible').trigger('click')
      await flushPromises()
      expect(alertaPrincipal(wrapper).text()).toContain('El perfil ahora es visible para los socios')
    })

    it('con la búsqueda pausada avisa que seguirá oculto', async () => {
      vi.mocked(postulanteService.disponibilidadLaboral).mockResolvedValue(pausada)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1, { visible: false })])
      vi.mocked(postulanteService.updateProfile).mockImplementation(async (p) => p)
      const wrapper = await montar()
      await boton(tarjetas(wrapper)[0], 'Habilitar al reanudar').trigger('click')
      await flushPromises()
      expect(alertaPrincipal(wrapper).text()).toContain('seguirá oculto mientras tu búsqueda esté pausada')
    })

    it('si el servidor rechaza el cambio lo informa; sin sesión envía sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.updateProfile).mockRejectedValue(new Error('Perfil bloqueado'))
      const wrapper = await montar()
      await boton(tarjetas(wrapper)[0], 'Ocultar perfil').trigger('click')
      await flushPromises()
      expect(postulanteService.updateProfile).toHaveBeenCalledWith(expect.any(Object), undefined)
      expect(alertaPrincipal(wrapper).text()).toContain('Perfil bloqueado')
    })
  })

  describe('editor de perfil', () => {
    it('crea un perfil nuevo con hasta 4 rubros', async () => {
      vi.mocked(postulanteService.createProfile).mockImplementation(async (p) => ({ ...p, id: 9 }))
      const wrapper = await montar()
      await boton(wrapper, 'Agregar perfil profesional').trigger('click')
      expect(modal(wrapper).exists()).toBe(true)
      // Un perfil nuevo todavía no tiene sección de CV.
      expect(modal(wrapper).find('.profile-pdfs--editor').exists()).toBe(false)

      await modal(wrapper).find('.profile-editor__input').setValue('Vendedor')
      const rubros = modal(wrapper).findAll('.profile-card-postulante__skills-button')
      for (const rubro of rubros.slice(0, 4)) await rubro.trigger('click')
      await rubros[4].trigger('click')
      expect(modal(wrapper).text()).toContain('Puedes seleccionar un máximo de 4 rubros para este perfil.')
      // Quitar uno libera el cupo y borra el aviso.
      await rubros[0].trigger('click')
      expect(modal(wrapper).text()).not.toContain('máximo de 4 rubros')
      expect(rubros[0].classes()).not.toContain('profile-card-postulante__skills-button--selected')
      expect(rubros[1].classes()).toContain('profile-card-postulante__skills-button--selected')

      await modal(wrapper).find('select').setValue('PART_TIME')
      const casillas = modal(wrapper).findAll('input[type="checkbox"]')
      await casillas[0].setValue(true)
      await casillas[1].setValue(false)
      await boton(modal(wrapper), 'Guardar cambios').trigger('click')
      await flushPromises()

      expect(postulanteService.createProfile).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Vendedor', rubros: ['Logística', 'Salud', 'Turismo'], disponibilidadHoraria: 'PART_TIME', tieneVehiculo: true, visible: false,
      }), 'tok')
      expect(postulanteService.createProfile).toHaveBeenCalledWith(expect.not.objectContaining({ id: expect.anything() }), 'tok')
      expect(modal(wrapper).exists()).toBe(false)
      expect(tarjetas(wrapper)).toHaveLength(1)
      expect(alertaPrincipal(wrapper).text()).toContain('El perfil profesional se creó correctamente.')
    })

    it('edita un perfil existente sin tocar el original hasta guardar', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1, { rubros: ['Ventas'] }), perfil(2)])
      vi.mocked(postulanteService.updateProfile).mockImplementation(async (p) => p)
      const wrapper = await montar()
      await boton(tarjetas(wrapper)[0], 'Editar').trigger('click')
      await modal(wrapper).find('.profile-editor__input').setValue('Vendedora senior')
      expect(tarjetas(wrapper)[0].find('.profile-card-postulante__header-heading').text()).toBe('Perfil 1')

      await boton(modal(wrapper), 'Guardar cambios').trigger('click')
      await flushPromises()
      expect(postulanteService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nombre: 'Vendedora senior', rubros: ['Ventas'] }), 'tok')
      expect(tarjetas(wrapper).map((t) => t.find('.profile-card-postulante__header-heading').text())).toEqual(['Vendedora senior', 'Perfil 2'])
      expect(alertaPrincipal(wrapper).text()).toContain('El perfil profesional se actualizó correctamente.')
    })

    it('con la búsqueda pausada explica el interruptor de visibilidad', async () => {
      vi.mocked(postulanteService.disponibilidadLaboral).mockResolvedValue(pausada)
      const wrapper = await montar()
      await boton(wrapper, 'Agregar perfil profesional').trigger('click')
      expect(modal(wrapper).text()).toContain('Habilitar este perfil para cuando reanude mi búsqueda')
    })

    it('si no puede guardar mantiene el editor abierto; sin sesión crea sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.createProfile).mockRejectedValue(new Error('Nombre repetido'))
      const wrapper = await montar()
      await boton(wrapper, 'Agregar perfil profesional').trigger('click')
      await boton(modal(wrapper), 'Guardar cambios').trigger('click')
      await flushPromises()
      expect(postulanteService.createProfile).toHaveBeenCalledWith(expect.any(Object), undefined)
      expect(alertaPrincipal(wrapper).text()).toContain('Nombre repetido')
      expect(modal(wrapper).exists()).toBe(true)
    })

    it('se cierra con la X, Cancelar o el fondo sin guardar', async () => {
      const wrapper = await montar()
      for (const cerrar of [
        () => modal(wrapper).find('.modal__close'),
        () => boton(modal(wrapper), 'Cancelar'),
        () => modal(wrapper).find('.modal__backdrop'),
      ]) {
        await boton(wrapper, 'Agregar perfil profesional').trigger('click')
        await cerrar().trigger('click')
        expect(modal(wrapper).exists()).toBe(false)
      }
      expect(postulanteService.createProfile).not.toHaveBeenCalled()
    })

    it('sin sesión edita sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.updateProfile).mockImplementation(async (p) => p)
      const wrapper = await montar()
      await boton(tarjetas(wrapper)[0], 'Editar').trigger('click')
      await boton(modal(wrapper), 'Guardar cambios').trigger('click')
      await flushPromises()
      expect(postulanteService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), undefined)
    })
  })

  describe('CV en PDF', () => {
    async function editar(wrapper: VueWrapper, indice = 0) {
      await boton(tarjetas(wrapper)[indice], 'Editar').trigger('click')
      return modal(wrapper)
    }

    async function elegirArchivo(wrapper: VueWrapper, archivo?: File) {
      const input = modal(wrapper).find('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: archivo ? [archivo] : [], configurable: true })
      await input.trigger('change')
    }

    const pdfValido = () => new File(['%PDF'], 'mi-cv.pdf', { type: 'application/pdf' })

    it('rechaza archivos que no son PDF y no deja subir sin archivo', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      const wrapper = await montar()
      const editor = await editar(wrapper)
      expect(boton(editor, 'Subir CV').attributes('disabled')).toBeDefined()
      await elegirArchivo(wrapper, new File(['x'], 'foto.png', { type: 'image/png' }))
      expect(alertaPrincipal(wrapper).text()).toContain('Solo se admiten archivos PDF.')
      expect(boton(modal(wrapper), 'Subir CV').attributes('disabled')).toBeDefined()
      // Sin archivo elegido no muestra error nuevo.
      await elegirArchivo(wrapper)
      expect(boton(modal(wrapper), 'Subir CV').attributes('disabled')).toBeDefined()
    })

    it('sube el primer CV del perfil y recarga la lista', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.uploadCv).mockResolvedValue(cv(10, 1) as never)
      const wrapper = await montar()
      await editar(wrapper)
      const archivo = pdfValido()
      await elegirArchivo(wrapper, archivo)
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      await boton(modal(wrapper), 'Subir CV').trigger('click')
      await flushPromises()

      expect(confirmar).not.toHaveBeenCalled()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(archivo, undefined, 'tok', 1, false)
      expect(alertaPrincipal(wrapper).text()).toContain('El PDF del CV se subió correctamente.')
      expect(boton(modal(wrapper), 'Reemplazar CV').exists()).toBe(true)
      expect(modal(wrapper).findAll('.profile-pdfs__item').map((i) => i.find('span').text())).toEqual(['cv-10.pdf'])
    })

    it('al reemplazar pide confirmación y respeta la cancelación', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1, { nombreArchivo: null })])
      vi.mocked(postulanteService.uploadCv).mockResolvedValue(cv(11, 1) as never)
      const wrapper = await montar()
      const editor = await editar(wrapper)
      expect(editor.find('.profile-pdfs__item span').text()).toBe('CV del perfil')
      await boton(editor, 'Descargar').trigger('click')
      expect(abrir).toHaveBeenCalledWith('https://s3.test/cv-10.pdf', '_blank', 'noopener,noreferrer')

      await elegirArchivo(wrapper, pdfValido())
      confirmar.mockReturnValueOnce(false)
      await boton(modal(wrapper), 'Reemplazar CV').trigger('click')
      await flushPromises()
      expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('¿Reemplazar el CV de este perfil?'))
      expect(postulanteService.uploadCv).not.toHaveBeenCalled()

      await boton(modal(wrapper), 'Reemplazar CV').trigger('click')
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(expect.any(File), undefined, 'tok', 1, true)
    })

    it('si la subida falla lo muestra también en el editor; sin sesión sube sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.uploadCv).mockRejectedValue(new Error('PDF dañado'))
      const wrapper = await montar()
      await editar(wrapper)
      await elegirArchivo(wrapper, pdfValido())
      await boton(modal(wrapper), 'Subir CV').trigger('click')
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(expect.any(File), undefined, undefined, 1, false)
      expect(alertaPrincipal(wrapper).text()).toContain('PDF dañado')
      expect(modal(wrapper).find('.app-alert').text()).toContain('PDF dañado')
    })

    it('elimina el CV tras confirmar, y no lo hace si se cancela', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      vi.mocked(postulanteService.deleteCv).mockResolvedValue(undefined as never)
      const wrapper = await montar()

      confirmar.mockReturnValueOnce(false)
      await boton(tarjetas(wrapper)[0], 'Eliminar').trigger('click')
      expect(postulanteService.deleteCv).not.toHaveBeenCalled()

      vi.mocked(postulanteService.listCvs).mockResolvedValue([])
      await boton(tarjetas(wrapper)[0], 'Eliminar').trigger('click')
      await flushPromises()
      expect(postulanteService.deleteCv).toHaveBeenCalledWith(10, 'tok')
      expect(alertaPrincipal(wrapper).text()).toContain('El PDF se eliminó correctamente.')
      expect(tarjetas(wrapper)[0].text()).toContain('Este perfil todavía no tiene un CV.')
    })

    it('si no puede eliminar lo informa; sin sesión elimina sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      vi.mocked(postulanteService.deleteCv).mockRejectedValue(new Error('CV en uso'))
      const wrapper = await montar()
      const editor = await editar(wrapper)
      await boton(editor, 'Eliminar').trigger('click')
      await flushPromises()
      expect(postulanteService.deleteCv).toHaveBeenCalledWith(10, undefined)
      expect(alertaPrincipal(wrapper).text()).toContain('CV en uso')
      expect(modal(wrapper).find('.app-alert').text()).toContain('CV en uso')
    })

    it('mientras sube bloquea otra subida, la eliminación y el CV manual', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      let resolver: () => void = () => {}
      vi.mocked(postulanteService.uploadCv).mockReturnValue(new Promise((resolve) => { resolver = () => resolve(cv(11, 1) as never) }))
      const wrapper = await montar()
      await editar(wrapper)
      await elegirArchivo(wrapper, pdfValido())
      await boton(modal(wrapper), 'Reemplazar CV').trigger('click')
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledTimes(1)

      // Mientras sube, los botones que lanzarían otra operación quedan deshabilitados.
      expect(boton(modal(wrapper), 'Eliminar').attributes('disabled')).toBeDefined()
      expect(modal(wrapper).find('input[type="file"]').attributes('disabled')).toBeDefined()
      expect(modal(wrapper).findAll('button').find((b) => b.text().includes('CV manual'))!.attributes('disabled')).toBeDefined()
      resolver()
      await flushPromises()
    })
  })

  describe('CV manual', () => {
    async function abrirManual(wrapper: VueWrapper) {
      await boton(tarjetas(wrapper)[0], 'Editar').trigger('click')
      const texto = modal(wrapper).findAll('button').find((b) => b.text().includes('CV manual'))!
      await texto.trigger('click')
      return modal(wrapper).find('.profile-manual-cv')
    }

    const agregar = (seccion: ReturnType<VueWrapper['find']>, indice: number) =>
      seccion.findAll('.profile-manual-cv__heading-button')[indice].trigger('click')

    it('exige al menos una referencia con nombre', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      const wrapper = await montar()
      const manual = await abrirManual(wrapper)
      await agregar(manual, 2)
      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      expect(modal(wrapper).text()).toContain('Agregá al menos una referencia laboral o personal')
      expect(postulanteService.uploadCv).not.toHaveBeenCalled()
    })

    it('arma el PDF con todas las secciones completas y lo sube', async () => {
      useAuthStore().setFullName('Ana Pérez')
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1, { nombre: 'Ventas' })])
      vi.mocked(postulanteService.uploadCv).mockResolvedValue(cv(10, 1) as never)
      const wrapper = await montar()
      const manual = await abrirManual(wrapper)
      await manual.findAll('textarea')[0].setValue('Vendedora con experiencia')
      for (const i of [0, 0, 1, 2, 2, 3]) await agregar(modal(wrapper).find('.profile-manual-cv'), i)

      const seccion = modal(wrapper).find('.profile-manual-cv')
      const entradas = seccion.findAll('.profile-manual-cv__entry')
      // Experiencias: la primera completa, la segunda vacía (se descarta).
      const exp = entradas[0].findAll('input')
      await exp[0].setValue('Cajera | Super')
      await exp[1].setValue('2020-01')
      await exp[2].setValue('2022-06')
      await entradas[0].find('textarea').setValue('Atención al público')
      // Formación
      await entradas[2].findAll('input')[0].setValue('Bachillerato | Liceo 1')
      // Referencias laborales: una completa y otra que se quita.
      const ref = entradas[3].findAll('input')
      await ref[0].setValue('Juan Gómez')
      await ref[1].setValue('Encargado')
      await ref[2].setValue('099111222')
      await ref[3].setValue('juan@test.uy')
      await entradas[4].find('.profile-manual-cv__entry-button').trigger('click')
      // Referencia personal
      await seccion.findAll('.profile-manual-cv__entry')[4].findAll('input')[0].setValue('María')
      const textos = seccion.findAll('textarea')
      await textos[textos.length - 3].setValue('Excel')
      await textos[textos.length - 2].setValue('Inglés - Intermedio')
      await textos[textos.length - 1].setValue('Curso de ventas')

      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      await flushPromises()

      expect(postulanteService.uploadCv).toHaveBeenCalledWith(expect.any(File), 'Vendedora con experiencia', 'tok', 1, false)
      const [archivo] = vi.mocked(postulanteService.uploadCv).mock.calls[0]
      expect(archivo.name).toBe('cv-manual.pdf')
      const escrito = pdf.documentos[0].textos.flat()
      expect(escrito).toEqual(expect.arrayContaining([
        'Ana Pérez', 'Perfil: Ventas', 'Perfil profesional', 'Vendedora con experiencia',
        'Experiencia laboral', 'Cajera | Super | 2020-01 | 2022-06 | Atención al público',
        'Formación académica', 'Bachillerato | Liceo 1', 'Habilidades técnicas', 'Excel', 'Idiomas', 'Inglés - Intermedio',
        'Cursos y certificaciones', 'Curso de ventas', 'Referencias laborales', 'Juan Gómez | Encargado | 099111222 | juan@test.uy',
        'Referencias personales', 'María',
      ]))
      expect(alertaPrincipal(wrapper).text()).toContain('El CV manual se generó y guardó correctamente.')
      expect(modal(wrapper).find('.profile-manual-cv').exists()).toBe(false)
    })

    it('agrega páginas cuando el contenido no entra y usa un título genérico sin nombre', async () => {
      pdf.alto = 60
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.uploadCv).mockResolvedValue(cv(10, 1) as never)
      const wrapper = await montar()
      const manual = await abrirManual(wrapper)
      await manual.findAll('textarea')[0].setValue('Línea 1\nLínea 2\nLínea 3')
      await agregar(modal(wrapper).find('.profile-manual-cv'), 3)
      await modal(wrapper).find('.profile-manual-cv__entry input').setValue('Referencia')
      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      await flushPromises()
      expect(pdf.documentos[0].textos[0]).toBe('Curriculum Vitae')
      expect(pdf.documentos[0].paginas).toBeGreaterThan(1)
    })

    it('quita entradas de experiencia, formación y referencias personales', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      const wrapper = await montar()
      await abrirManual(wrapper)
      for (const i of [0, 1, 3]) await agregar(modal(wrapper).find('.profile-manual-cv'), i)
      expect(modal(wrapper).findAll('.profile-manual-cv__entry')).toHaveLength(3)
      for (let i = 0; i < 3; i += 1) {
        await modal(wrapper).find('.profile-manual-cv__entry .profile-manual-cv__entry-button').trigger('click')
      }
      expect(modal(wrapper).findAll('.profile-manual-cv__entry')).toHaveLength(0)
    })

    it('al reemplazar por un CV manual pide confirmación, sin resumen envía undefined y muestra el error', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.listCvs).mockResolvedValue([cv(10, 1)])
      vi.mocked(postulanteService.uploadCv).mockRejectedValue(new Error('S3 no disponible'))
      const wrapper = await montar()
      await abrirManual(wrapper)
      expect(boton(modal(wrapper), 'Reemplazar por CV manual').exists()).toBe(true)
      await agregar(modal(wrapper).find('.profile-manual-cv'), 3)
      await modal(wrapper).find('.profile-manual-cv__entry input').setValue('María')

      confirmar.mockReturnValueOnce(false)
      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      await flushPromises()
      expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('por el CV manual'))
      expect(postulanteService.uploadCv).not.toHaveBeenCalled()

      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(expect.any(File), undefined, 'tok', 1, true)
      expect(modal(wrapper).find('.app-alert').text()).toContain('S3 no disponible')
      expect(modal(wrapper).find('.profile-manual-cv').exists()).toBe(true)
    })

    it('sin sesión sube el CV manual sin token', async () => {
      sessionStorage.clear()
      pinia = createPinia()
      setActivePinia(pinia)
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      vi.mocked(postulanteService.uploadCv).mockResolvedValue(cv(10, 1) as never)
      const wrapper = await montar()
      await abrirManual(wrapper)
      await agregar(modal(wrapper).find('.profile-manual-cv'), 2)
      await modal(wrapper).find('.profile-manual-cv__entry input').setValue('Juan')
      await boton(modal(wrapper), 'Generar y subir PDF').trigger('click')
      await flushPromises()
      expect(postulanteService.uploadCv).toHaveBeenCalledWith(expect.any(File), undefined, undefined, 1, false)
    })

    it('el botón alterna el formulario manual', async () => {
      vi.mocked(postulanteService.listProfiles).mockResolvedValue([perfil(1)])
      const wrapper = await montar()
      await abrirManual(wrapper)
      await boton(modal(wrapper), 'Crear CV manual').trigger('click')
      expect(modal(wrapper).find('.profile-manual-cv').exists()).toBe(false)
    })
  })
})

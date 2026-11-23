// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AdminCommunicationsView from './AdminCommunicationsView.vue'
import {
  comunicadoService,
  type AudienciaCounts,
  type ComunicadoRecord,
} from '../../services/comunicadoService'

// Se conserva destinatarioLabel real y solo se mockean las llamadas HTTP.
vi.mock('../../services/comunicadoService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/comunicadoService')>()
  return {
    ...original,
    comunicadoService: { list: vi.fn(), audiencia: vi.fn(), publish: vi.fn() },
  }
})

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

function comunicado(id: number, overrides: Partial<ComunicadoRecord> = {}): ComunicadoRecord {
  return {
    id,
    titulo: `Aviso ${id}`,
    contenido: `Contenido del aviso ${id}`,
    destinatario: 'SOCIOS',
    popup: false,
    fechaPublicacion: '2026-11-20T15:30:00Z',
    autorEmail: null,
    destinatariosNotificados: 10,
    correosEnviados: 10,
    correosFallidos: 0,
    sociosSinEmail: 0,
    correosDestino: [],
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

const audiencia: AudienciaCounts = { sociosActivos: 120, sociosDirectivos: 9 }

function cargar(lista: ComunicadoRecord[] = [], conteo: AudienciaCounts = audiencia) {
  vi.mocked(comunicadoService.list).mockResolvedValueOnce(lista)
  vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce(conteo)
}

function montar() {
  return mount(AdminCommunicationsView, {
    attachTo: document.body,
    global: { stubs: { AdminShell: AdminShellStub } },
  })
}

function fechaLarga(valor: string) {
  return new Date(valor).toLocaleString('es-UY', { dateStyle: 'long', timeStyle: 'short' })
}

async function redactar(wrapper: ReturnType<typeof montar>, titulo: string, mensaje: string) {
  await wrapper.find('.communication-editor input:not([type])').setValue(titulo)
  await wrapper.find('.communication-editor textarea').setValue(mensaje)
}

function botonEnviar(wrapper: ReturnType<typeof montar>) {
  return wrapper.find('.communication-send')
}

describe('comunicados del administrador', () => {
  let wrapper: ReturnType<typeof montar> | null = null

  beforeEach(() => {
    vi.mocked(comunicadoService.list).mockReset()
    vi.mocked(comunicadoService.audiencia).mockReset()
    vi.mocked(comunicadoService.publish).mockReset()
    document.body.style.overflow = ''
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('carga el historial y la audiencia mostrando el estado de carga', async () => {
    const lista = deferred<ComunicadoRecord[]>()
    vi.mocked(comunicadoService.list).mockReturnValueOnce(lista.promise)
    vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce(audiencia)
    wrapper = montar()
    await nextTick()
    expect(wrapper.text()).toContain('Cargando historial...')
    expect(botonEnviar(wrapper).attributes('disabled')).toBeDefined()

    lista.resolve([
      comunicado(1, { popup: true, destinatario: 'SOLO_DIRECTIVOS' }),
      comunicado(2, { fechaPublicacion: null, destinatario: 'POSTULANTES' }),
    ])
    await flushPromises()

    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('comunicados')
    expect(wrapper.text()).toContain('120 socios activos')
    expect(wrapper.text()).toContain('Comisión directiva (9)')
    const filas = wrapper.findAll('.communication-previous__row')
    expect(filas).toHaveLength(2)
    expect(filas[0]!.text()).toContain('Aviso 1')
    expect(filas[0]!.text()).toContain(fechaLarga('2026-11-20T15:30:00Z'))
    expect(filas[0]!.text()).toContain('Audiencia: Socios Directivos')
    expect(filas[0]!.text()).toContain('· Pop-up')
    expect(filas[1]!.text()).toContain('Sin fecha')
    expect(filas[1]!.text()).toContain('Audiencia: Postulantes')
    expect(filas[1]!.text()).not.toContain('Pop-up')
    expect(botonEnviar(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('avisa cuando todavía no hay comunicados y muestra la vista previa por defecto', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Todavía no hay comunicados enviados.')
    const vistaPortal = wrapper.find('.preview-window article')
    expect(vistaPortal.text()).toContain('Título del comunicado')
    expect(vistaPortal.text()).toContain('El mensaje aparecerá aquí.')
    expect(vistaPortal.text()).toContain('Audiencia: Todos los socios')
    expect(vistaPortal.text()).toContain('Notificación interna')
  })

  it('muestra el error si falla la carga inicial', async () => {
    vi.mocked(comunicadoService.list).mockRejectedValueOnce(new Error('Servidor de comunicados caído'))
    vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce(audiencia)
    wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Servidor de comunicados caído')
    expect(wrapper.text()).toContain('0 socios activos')
  })

  it('actualiza la vista previa mientras se redacta', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()

    await redactar(wrapper, '  Asamblea anual  ', '  Los esperamos el viernes.  ')
    const botones = wrapper.findAll('.communication-audiences button')
    await botones[1]!.trigger('click')
    expect(botones[1]!.classes()).toContain('communication-audience--active')
    await wrapper.find('input[type="checkbox"]').setValue(true)

    const portal = wrapper.find('.preview-window article')
    expect(portal.find('strong').text()).toBe('📢 Asamblea anual')
    expect(portal.find('p').text()).toBe('Los esperamos el viernes.')
    expect(portal.text()).toContain('Audiencia: Socios Directivos')
    expect(portal.find('b').text()).toBe('Pop-up bloqueante + campana')
    expect(wrapper.find('.preview-email').text()).toContain('Para: Socios Directivos')
    expect(wrapper.find('.preview-email').text()).toContain('Asunto: CCISJ: Asamblea anual')

    await botones[0]!.trigger('click')
    expect(botones[0]!.classes()).toContain('communication-audience--active')
    expect(portal.text()).toContain('Audiencia: Todos los socios')
  })

  it('exige título y mensaje antes de enviar', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()

    await redactar(wrapper, '   ', 'Mensaje')
    await botonEnviar(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Completá el título y el mensaje antes de enviar.')

    await redactar(wrapper, 'Título', '   ')
    await botonEnviar(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Completá el título y el mensaje antes de enviar.')
    expect(comunicadoService.publish).not.toHaveBeenCalled()
  })

  it('publica el comunicado, abre el detalle y resume el envío completo', async () => {
    cargar([comunicado(1)])
    wrapper = montar()
    await flushPromises()

    const creado = comunicado(5, {
      titulo: 'Corte de luz',
      contenido: 'Mañana no habrá energía.',
      destinatario: 'SOLO_DIRECTIVOS',
      popup: true,
      autorEmail: 'admin@ccisj.test',
      destinatariosNotificados: 9,
      correosEnviados: 7,
      correosFallidos: 1,
      sociosSinEmail: 1,
      correosDestino: ['a@test.uy', 'b@test.uy'],
    })
    const publicacion = deferred<ComunicadoRecord>()
    vi.mocked(comunicadoService.publish).mockReturnValueOnce(publicacion.promise)
    vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce({ sociosActivos: 121, sociosDirectivos: 9 })

    await redactar(wrapper, '  Corte de luz ', ' Mañana no habrá energía. ')
    await wrapper.findAll('.communication-audiences button')[1]!.trigger('click')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await botonEnviar(wrapper).trigger('click')

    expect(comunicadoService.publish).toHaveBeenCalledWith({
      titulo: 'Corte de luz',
      contenido: 'Mañana no habrá energía.',
      destinatario: 'SOLO_DIRECTIVOS',
      popup: true,
    })
    expect(botonEnviar(wrapper).text()).toBe('Enviando...')
    expect(botonEnviar(wrapper).attributes('disabled')).toBeDefined()

    publicacion.resolve(creado)
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Comunicado publicado. Campana interna: 9 socios · Gmail: 7 enviados · pop-up bloqueante activado'
      + ' · 1 correos fallaron · 1 socios sin email de contacto · Destinos: a@test.uy, b@test.uy.',
    )
    expect(wrapper.text()).toContain('121 socios activos')
    expect((wrapper.find('.communication-editor textarea').element as HTMLTextAreaElement).value).toBe('')
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    const filas = wrapper.findAll('.communication-previous__row')
    expect(filas[0]!.text()).toContain('Corte de luz')
    expect(filas[0]!.classes()).toContain('communication-previous__row--active')

    const modal = wrapper.find('[role="dialog"]')
    expect(modal.attributes('aria-labelledby')).toBe('admin-comunicado-5')
    expect(modal.find('h2').text()).toBe('Corte de luz')
    expect(modal.find('.communication-modal__meta').text()).toContain('· Pop-up bloqueante')
    expect(modal.find('.communication-modal__meta').text()).toContain('· Autor: admin@ccisj.test')
    expect(modal.find('.communication-modal__emails').text()).toContain('a@test.uy, b@test.uy')
    expect(document.body.style.overflow).toBe('hidden')

    // La vista previa refleja el comunicado abierto.
    const portal = wrapper.find('.preview-window article')
    expect(portal.text()).toContain('Audiencia: Socios Directivos')
    expect(portal.text()).toContain(fechaLarga('2026-11-20T15:30:00Z'))
    expect(portal.find('b').text()).toBe('Pop-up bloqueante + campana')
  })

  it('advierte cuando no se envió ningún correo por falta de emails de contacto', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()
    vi.mocked(comunicadoService.publish).mockResolvedValueOnce(comunicado(6, {
      correosEnviados: 0,
      sociosSinEmail: 4,
      correosDestino: undefined as unknown as string[],
    }))
    vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce(audiencia)

    await redactar(wrapper, 'Aviso', 'Mensaje')
    await botonEnviar(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Comunicado publicado. Campana interna: 10 socios · Gmail: 0 enviados · 4 socios sin email de contacto.')
    expect(wrapper.text()).toContain('no hay emails de contacto cargados en los socios de esa audiencia')
    expect(wrapper.find('.communication-modal__emails').exists()).toBe(false)
  })

  it('advierte cuando Gmail no pudo enviar ningún correo', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()
    vi.mocked(comunicadoService.publish).mockResolvedValueOnce(comunicado(7, { correosEnviados: 0 }))
    vi.mocked(comunicadoService.audiencia).mockResolvedValueOnce(audiencia)

    await redactar(wrapper, 'Aviso', 'Mensaje')
    await botonEnviar(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Comunicado publicado. Campana interna: 10 socios · Gmail: 0 enviados.')
    expect(wrapper.text()).toContain('Gmail no pudo enviar ningún correo')
  })

  it('muestra el error si la publicación falla', async () => {
    cargar()
    wrapper = montar()
    await flushPromises()
    vi.mocked(comunicadoService.publish).mockRejectedValueOnce(new Error('SMTP no configurado'))

    await redactar(wrapper, 'Aviso', 'Mensaje')
    await botonEnviar(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('SMTP no configurado')
    expect(botonEnviar(wrapper).text()).toBe('Enviar Comunicado')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('abre un comunicado anterior y lo cierra con el botón, la X, el fondo o Escape', async () => {
    cargar([comunicado(1, { destinatario: 'TODOS' }), comunicado(2, { fechaPublicacion: null })])
    wrapper = montar()
    await flushPromises()
    const ver = () => wrapper!.findAll('.communication-previous__view')

    await ver()[0]!.trigger('click')
    let modal = wrapper.find('[role="dialog"]')
    expect(modal.find('h2').text()).toBe('Aviso 1')
    expect(modal.find('.communication-modal__meta').text()).toContain('Audiencia: Todos los socios')
    expect(modal.find('.communication-modal__meta').text()).not.toContain('Pop-up')
    expect(modal.find('.communication-modal__meta').text()).not.toContain('Autor')
    expect(wrapper.find('.preview-window article b').text()).toBe('Notificación interna')
    expect(document.body.style.overflow).toBe('hidden')

    await modal.find('.notification-modal__done').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')
    // El comunicado sigue seleccionado aunque el modal se cierre.
    expect(wrapper.findAll('.communication-previous__row')[0]!.classes()).toContain('communication-previous__row--active')
    expect(wrapper.find('.preview-window article strong').text()).toBe('📢 Aviso 1')

    await ver()[1]!.trigger('click')
    modal = wrapper.find('[role="dialog"]')
    expect(modal.find('time').text()).toBe('Sin fecha')
    await modal.find('.notification-modal__close').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await ver()[1]!.trigger('click')
    await wrapper.find('.notification-modal__panel').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.find('[role="dialog"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await ver()[0]!.trigger('click')
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('al ver un comunicado limpia los mensajes previos', async () => {
    cargar([comunicado(1)])
    wrapper = montar()
    await flushPromises()

    await botonEnviar(wrapper).trigger('click')
    expect(wrapper.text()).toContain('Completá el título y el mensaje antes de enviar.')
    await wrapper.find('.communication-previous__view').trigger('click')
    expect(wrapper.text()).not.toContain('Completá el título y el mensaje antes de enviar.')
  })

  it('restaura el scroll del documento al desmontarse', async () => {
    cargar([comunicado(1)])
    wrapper = montar()
    await flushPromises()

    await wrapper.find('.communication-previous__view').trigger('click')
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
    wrapper = null
    expect(document.body.style.overflow).toBe('')
  })
})

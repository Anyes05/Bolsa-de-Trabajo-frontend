// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import AdminRubrosView from './AdminRubrosView.vue'
import { rubroService, type RubroAdmin, type RubroPage } from '../../services/rubroService'
import { pageOf, waitForSearch } from '../../test/pages'

vi.mock('../../services/rubroService', () => ({
  rubroService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), setActivo: vi.fn() },
}))

// El layout administrativo se reemplaza por un contenedor que solo renderiza el contenido.
const AdminShellStub = defineComponent({
  props: { title: String, subtitle: String, active: String },
  setup(props, { slots }) {
    return () => h('div', { 'data-active': props.active }, slots.default?.())
  },
})

function rubro(id: number, nombreRubro: string, activo = true): RubroAdmin {
  return { id, nombreRubro, activo }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

// Doble del backend: filtra, ordena y pagina como RubroAdminController; las mutaciones alteran su estado.
let db: RubroAdmin[] = []
function respuesta(q = '', page = 0, size = 20): RubroPage {
  const term = q.trim().toLowerCase()
  const filtrados = [...db].sort((a, b) => a.nombreRubro.localeCompare(b.nombreRubro, 'es'))
    .filter((r) => !term || r.nombreRubro.toLowerCase().includes(term))
  return {
    pagina: pageOf(filtrados.slice(page * size, page * size + size), page, size, filtrados.length),
    activos: db.filter((r) => r.activo).length,
  }
}
function servidor(lista: RubroAdmin[]) {
  db = [...lista]
  vi.mocked(rubroService.list).mockImplementation(async (params = {}) => respuesta(params.q, params.page, params.size))
}

function montar() {
  return mount(AdminRubrosView, { global: { stubs: { AdminShell: AdminShellStub } } })
}

function nombres(wrapper: ReturnType<typeof montar>) {
  return wrapper.findAll('tbody .company-table__name strong').map((celda) => celda.text())
}

describe('gestión de rubros', () => {
  beforeEach(() => {
    vi.mocked(rubroService.list).mockReset()
    vi.mocked(rubroService.create).mockReset()
    vi.mocked(rubroService.update).mockReset()
    vi.mocked(rubroService.setActivo).mockReset()
  })

  it('carga el catálogo incluyendo inactivos y muestra los contadores', async () => {
    db = [rubro(1, 'Comercio'), rubro(2, 'Industria', false)]
    const carga = deferred<RubroPage>()
    vi.mocked(rubroService.list).mockReturnValueOnce(carga.promise)
    const wrapper = montar()
    await nextTick()
    expect(wrapper.text()).toContain('Cargando rubros...')

    carga.resolve(respuesta())
    await flushPromises()

    expect(rubroService.list).toHaveBeenCalledWith({ incluirInactivos: true, q: '', page: 0 })
    expect(wrapper.find('[data-active]').attributes('data-active')).toBe('rubros')
    expect(wrapper.text()).toContain('1 activos · 2 listados')
    expect(nombres(wrapper)).toEqual(['Comercio', 'Industria'])
    const estados = wrapper.findAll('.cash-status')
    expect(estados[0]!.text()).toBe('Activo')
    expect(estados[0]!.classes()).toContain('cash-status--green')
    expect(estados[1]!.text()).toBe('Inactivo')
    expect(estados[1]!.classes()).toContain('cash-status--red')
    const toggles = wrapper.findAll('.company-toggle')
    expect(toggles[0]!.attributes('aria-label')).toBe('Desactivar rubro')
    expect(toggles[0]!.classes()).toContain('company-toggle--on')
    expect(toggles[1]!.attributes('aria-label')).toBe('Activar rubro')
  })

  it('envía la búsqueda al servidor y avisa cuando no hay coincidencias', async () => {
    servidor([rubro(1, 'Comercio'), rubro(2, 'Industria')])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-search input').setValue('  INDUS ')
    await waitForSearch()
    expect(rubroService.list).toHaveBeenLastCalledWith({ incluirInactivos: true, q: '  INDUS ', page: 0 })
    expect(nombres(wrapper)).toEqual(['Industria'])
    expect(wrapper.text()).toContain('2 activos · 1 listados')

    await wrapper.find('.company-search input').setValue('construcción')
    await waitForSearch()
    expect(wrapper.text()).toContain('No hay rubros para mostrar.')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('pagina en el servidor', async () => {
    servidor(Array.from({ length: 25 }, (_, i) => rubro(i + 1, `Rubro ${String(i + 1).padStart(2, '0')}`)))
    const wrapper = montar()
    await flushPromises()
    expect(nombres(wrapper)).toHaveLength(20)
    expect(wrapper.find('.pagination-bar').text()).toContain('Página 1 de 2 · 25 resultados')

    await wrapper.find('button[aria-label="Página siguiente"]').trigger('click')
    await flushPromises()
    expect(rubroService.list).toHaveBeenLastCalledWith({ incluirInactivos: true, q: '', page: 1 })
    expect(nombres(wrapper)).toEqual(['Rubro 21', 'Rubro 22', 'Rubro 23', 'Rubro 24', 'Rubro 25'])
  })

  it('muestra el error de carga', async () => {
    vi.mocked(rubroService.list).mockRejectedValueOnce(new Error('Servicio caído'))
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Servicio caído')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('valida que el nombre no esté vacío antes de crear', async () => {
    servidor([])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-button--primary').trigger('click')
    expect(wrapper.find('[role="dialog"] h2').text()).toBe('Nuevo rubro')
    expect(wrapper.find('.new-company-submit').text()).toBe('Crear rubro')
    await wrapper.find('.new-company-form input').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Ingresa el nombre del rubro.')
    expect(rubroService.create).not.toHaveBeenCalled()
  })

  it('crea un rubro, recarga la página del servidor y cierra el formulario', async () => {
    servidor([rubro(1, 'Comercio'), rubro(3, 'Servicios')])
    const creacion = deferred<RubroAdmin>()
    vi.mocked(rubroService.create).mockReturnValueOnce(creacion.promise)
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-button--primary').trigger('click')
    await wrapper.find('.new-company-form input').setValue('  Industria  ')
    await wrapper.find('form').trigger('submit')

    expect(rubroService.create).toHaveBeenCalledWith('Industria')
    expect(wrapper.find('.new-company-submit').text()).toBe('Guardando...')
    expect(wrapper.find('.new-company-submit').attributes('disabled')).toBeDefined()

    db.push(rubro(2, 'Industria'))
    creacion.resolve(rubro(2, 'Industria'))
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(nombres(wrapper)).toEqual(['Comercio', 'Industria', 'Servicios'])
  })

  it('edita un rubro existente y recarga la página', async () => {
    servidor([rubro(1, 'Comercio'), rubro(2, 'Industria')])
    vi.mocked(rubroService.update).mockImplementationOnce(async (id, nombre) => {
      db = db.map((r) => r.id === id ? { ...r, nombreRubro: nombre } : r)
      return rubro(id, nombre)
    })
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('.company-edit')[1]!.trigger('click')
    expect(wrapper.find('[role="dialog"] h2').text()).toBe('Editar rubro')
    expect((wrapper.find('.new-company-form input').element as HTMLInputElement).value).toBe('Industria')
    expect(wrapper.find('.new-company-submit').text()).toBe('Guardar cambios')

    await wrapper.find('.new-company-form input').setValue('Industria pesada')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(rubroService.update).toHaveBeenCalledWith(2, 'Industria pesada')
    expect(nombres(wrapper)).toEqual(['Comercio', 'Industria pesada'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('muestra el error al guardar y mantiene abierto el formulario', async () => {
    servidor([rubro(1, 'Comercio')])
    vi.mocked(rubroService.create).mockRejectedValueOnce(new Error('Ya existe un rubro con ese nombre'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-button--primary').trigger('click')
    await wrapper.find('.new-company-form input').setValue('Comercio')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').text()).toContain('Ya existe un rubro con ese nombre')
    expect(wrapper.find('.new-company-submit').attributes('disabled')).toBeUndefined()
  })

  it('cierra el formulario con Cancelar o con el fondo y lo reinicia', async () => {
    servidor([rubro(1, 'Comercio')])
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-edit').trigger('click')
    await wrapper.find('.new-company-cancel').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.find('.company-edit').trigger('click')
    await wrapper.find('.admin-modal__backdrop').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.find('.company-button--primary').trigger('click')
    expect(wrapper.find('[role="dialog"] h2').text()).toBe('Nuevo rubro')
    expect((wrapper.find('.new-company-form input').element as HTMLInputElement).value).toBe('')
  })

  it('activa y desactiva rubros y recarga desde el servidor', async () => {
    servidor([rubro(1, 'Comercio'), rubro(2, 'Industria', false)])
    vi.mocked(rubroService.setActivo).mockImplementationOnce(async (id, activo) => {
      db = db.map((r) => r.id === id ? { ...r, activo } : r)
      return rubro(id, 'Comercio', activo)
    })
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('.company-toggle')[0]!.trigger('click')
    await flushPromises()

    expect(rubroService.setActivo).toHaveBeenCalledWith(1, false)
    expect(wrapper.findAll('.cash-status')[0]!.text()).toBe('Inactivo')
    expect(wrapper.text()).toContain('0 activos · 2 listados')
  })

  it('muestra el error si no se puede cambiar el estado', async () => {
    servidor([rubro(2, 'Industria', false)])
    vi.mocked(rubroService.setActivo).mockRejectedValueOnce(new Error('Sin permiso'))
    const wrapper = montar()
    await flushPromises()

    await wrapper.find('.company-toggle').trigger('click')
    await flushPromises()

    expect(rubroService.setActivo).toHaveBeenCalledWith(2, true)
    expect(wrapper.text()).toContain('Sin permiso')
  })
})

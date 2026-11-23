// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import SocioDirectorioView from './SocioDirectorioView.vue'
import { socioDirectorioService, type DirectorioSocio } from '../../services/socioDirectorioService'
import type { EstadoMorosidad } from '../../services/types'
import { useAuthStore } from '../../stores/auth'

vi.mock('../../services/socioDirectorioService', () => ({ socioDirectorioService: { list: vi.fn() } }))

// El layout real se reemplaza por un contenedor que expone sus props.
const SocioShellStub = defineComponent({
  props: { title: String, subtitle: String, activeNav: String, companyName: String, companyInitials: String, companyRole: String },
  setup(props, { slots }) {
    return () => h('div', {
      class: 'shell', 'data-active': props.activeNav, 'data-name': props.companyName,
      'data-initials': props.companyInitials, 'data-role': props.companyRole,
    }, slots.default?.())
  },
})

function socio(id: number, cambios: Partial<DirectorioSocio> = {}): DirectorioSocio {
  return {
    id, razonSocial: `Empresa ${id}`, rubro: 'Comercio', telefono: '4342 0000', email: `e${id}@ejemplo.test`,
    estadoMorosidad: 'AL_DIA', fechaAlta: '2020-03-15T00:00:00', esDirectivo: false, ...cambios,
  }
}

function diferido<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((ok) => { resolve = ok })
  return { promise, resolve }
}

describe('directorio de socios para directivos', () => {
  let pinia: Pinia

  beforeEach(() => {
    sessionStorage.clear()
    vi.resetAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  async function montar() {
    const wrapper = mount(SocioDirectorioView, { global: { plugins: [pinia], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    return wrapper
  }

  function filas(wrapper: Awaited<ReturnType<typeof montar>>) {
    return wrapper.findAll('tbody tr')
  }

  it('muestra la carga y luego la tabla con estados y fechas formateadas', async () => {
    useAuthStore().setSession({ token: 't', email: 'd@ejemplo.test', role: 'SOCIO', fullName: 'Constructora Palleiro SRL', esDirectivo: true })
    const pendiente = diferido<DirectorioSocio[]>()
    vi.mocked(socioDirectorioService.list).mockReturnValueOnce(pendiente.promise)
    const wrapper = mount(SocioDirectorioView, { global: { plugins: [pinia], stubs: { SocioShell: SocioShellStub } } })
    await flushPromises()
    const shell = wrapper.find('.shell')
    expect(shell.attributes('data-active')).toBe('directorio')
    expect(shell.attributes('data-name')).toBe('Constructora Palleiro SRL')
    expect(shell.attributes('data-initials')).toBe('CP')
    expect(shell.attributes('data-role')).toBe('SOCIO DIRECTIVO')
    expect(wrapper.text()).toContain('Cargando directorio...')

    pendiente.resolve([
      socio(1),
      socio(2, { estadoMorosidad: 'MOROSO', rubro: '', telefono: null, email: null, fechaAlta: null }),
      socio(3, { estadoMorosidad: 'INACTIVO', fechaAlta: 'fecha-rota' }),
      socio(4, { estadoMorosidad: 'DESCONOCIDO' as EstadoMorosidad }),
    ])
    await flushPromises()
    const lista = filas(wrapper)
    expect(lista).toHaveLength(4)
    expect(wrapper.find('.socio-directory__count').text()).toBe('4 de 4 socios')

    const celdas = (indice: number) => lista[indice]!.findAll('td').map((td) => td.text())
    expect(celdas(0)[0]).toContain('Empresa 1')
    expect(celdas(0)[0]).toMatch(/Alta: .*2020/)
    expect(celdas(0)[4]).toBe('Al día')
    expect(lista[0]!.find('.socio-directory__status').classes()).toContain('socio-directory__status--ok')

    expect(celdas(1).slice(1)).toEqual(['—', '—', '—', 'Moroso'])
    expect(celdas(1)[0]).toContain('Alta: —')
    expect(lista[1]!.find('.socio-directory__status').classes()).toContain('socio-directory__status--pending')

    expect(celdas(2)[0]).toContain('Alta: fecha-rota')
    expect(celdas(2)[4]).toBe('Inactivo')
    expect(lista[2]!.find('.socio-directory__status').classes()).toContain('socio-directory__status--inactive')

    // Un estado desconocido se muestra tal cual.
    expect(celdas(3)[4]).toBe('DESCONOCIDO')
    expect(wrapper.find('.socio-directory__empty').exists()).toBe(false)
  })

  it('sin nombre en sesión usa "Socio" como empresa', async () => {
    vi.mocked(socioDirectorioService.list).mockResolvedValueOnce([])
    const wrapper = await montar()
    expect(wrapper.find('.shell').attributes('data-name')).toBe('Socio')
    expect(wrapper.find('.shell').attributes('data-initials')).toBe('S')
    expect(wrapper.find('.socio-directory__empty').text()).toBe('No hay socios que coincidan con la búsqueda.')
  })

  it('busca por razón social, email, rubro o teléfono y filtra por estado', async () => {
    vi.mocked(socioDirectorioService.list).mockResolvedValueOnce([
      socio(1, { razonSocial: 'Panadería Sol', email: 'sol@ejemplo.test', rubro: 'Alimentos', telefono: '111' }),
      socio(2, { razonSocial: 'Taller Norte', email: null, rubro: 'Mecánica', telefono: null, estadoMorosidad: 'MOROSO' }),
      // El backend puede omitir el rubro aunque el tipo lo declare obligatorio.
      socio(4, { razonSocial: 'Kiosco Sur', email: null, rubro: null as unknown as string, telefono: null, estadoMorosidad: 'MOROSO' }),
      socio(3, { razonSocial: 'Farmacia Luz', email: 'luz@ejemplo.test', rubro: 'Salud', telefono: '222333', estadoMorosidad: 'INACTIVO' }),
    ])
    const wrapper = await montar()
    const buscador = wrapper.find('input[type="search"]')
    const nombres = () => filas(wrapper).map((fila) => fila.find('strong').text())

    await buscador.setValue('  PANADERÍA ')
    expect(nombres()).toEqual(['Panadería Sol'])
    await buscador.setValue('luz@')
    expect(nombres()).toEqual(['Farmacia Luz'])
    await buscador.setValue('mecánica')
    expect(nombres()).toEqual(['Taller Norte'])
    await buscador.setValue('kiosco')
    expect(nombres()).toEqual(['Kiosco Sur'])
    await buscador.setValue('222')
    expect(nombres()).toEqual(['Farmacia Luz'])
    await buscador.setValue('inexistente')
    expect(nombres()).toEqual([])
    expect(wrapper.find('.socio-directory__count').text()).toBe('0 de 4 socios')
    expect(wrapper.find('.socio-directory__empty').exists()).toBe(true)

    await buscador.setValue('')
    const estado = wrapper.find('select')
    expect(estado.findAll('option').map((option) => option.text())).toEqual(['Todos', 'Al día', 'Moroso', 'Inactivo'])
    await estado.setValue('MOROSO')
    expect(nombres()).toEqual(['Taller Norte', 'Kiosco Sur'])
    await estado.setValue('Todos')
    expect(nombres()).toHaveLength(4)
  })

  it('informa el error de carga en lugar de la tabla', async () => {
    vi.mocked(socioDirectorioService.list).mockRejectedValueOnce(new Error('Acceso solo para directivos'))
    const wrapper = await montar()
    expect(wrapper.text()).toContain('Acceso solo para directivos')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

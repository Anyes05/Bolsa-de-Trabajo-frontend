// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GoogleSignInButton from './GoogleSignInButton.vue'
import { loadGoogleIdentity } from '../services/googleIdentity'

vi.mock('../services/googleIdentity', () => ({ loadGoogleIdentity: vi.fn() }))

type Callback = (response: { credential: string }) => void

function apiFalsa() {
  const api = {
    initialize: vi.fn<(options: { client_id: string; nonce: string; callback: Callback }) => void>(),
    renderButton: vi.fn<(container: HTMLElement, options: Record<string, string>) => void>(),
  }
  vi.mocked(loadGoogleIdentity).mockResolvedValue(api)
  return api
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

describe('botón de acceso con Google', () => {
  beforeEach(() => {
    vi.mocked(loadGoogleIdentity).mockReset()
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-123')
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('nonce-1-2-3-4' as `${string}-${string}-${string}-${string}-${string}`)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('muestra un error y no carga Google si falta el client id', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    const wrapper = mount(GoogleSignInButton)
    await flushPromises()
    expect(loadGoogleIdentity).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('El acceso con Google no está configurado. Contactá al administrador.')
    expect(wrapper.find('button').text()).toBe('Reintentar acceso con Google')
  })

  it('inicializa Google y dibuja el botón con el texto pedido', async () => {
    const api = apiFalsa()
    const wrapper = mount(GoogleSignInButton, { props: { text: 'signup_with' } })
    await flushPromises()
    expect(api.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'client-123', nonce: 'nonce-1-2-3-4' }))
    const [container, opciones] = api.renderButton.mock.calls[0]
    expect(container).toBe(wrapper.find('.google-sign-in > div').element)
    expect(opciones).toEqual({ type: 'standard', theme: 'outline', size: 'large', text: 'signup_with' })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emite la credencial con el nonce y valida respuestas vacías', async () => {
    const api = apiFalsa()
    const wrapper = mount(GoogleSignInButton)
    await flushPromises()
    expect(api.renderButton.mock.calls[0][1].text).toBe('signin_with')
    const callback = api.initialize.mock.calls[0][0].callback
    callback({ credential: 'jwt-ok' })
    expect(wrapper.emitted('credential')).toEqual([[{ credential: 'jwt-ok', nonce: 'nonce-1-2-3-4' }]])
    callback({ credential: '' })
    await flushPromises()
    expect(wrapper.text()).toContain('Google no devolvió una credencial. Intentá nuevamente.')
    expect(wrapper.emitted('credential')).toHaveLength(1)
  })

  it('ignora credenciales mientras está deshabilitado o tras desmontarse', async () => {
    const api = apiFalsa()
    const wrapper = mount(GoogleSignInButton, { props: { disabled: true } })
    await flushPromises()
    const contenedor = wrapper.find('.google-sign-in > div')
    expect(contenedor.attributes('aria-busy')).toBe('true')
    const callback = api.initialize.mock.calls[0][0].callback
    callback({ credential: 'jwt' })
    expect(wrapper.emitted('credential')).toBeUndefined()
    await wrapper.setProps({ disabled: false })
    wrapper.unmount()
    callback({ credential: 'jwt' })
    expect(wrapper.emitted('credential')).toBeUndefined()
  })

  it('no inicializa si se desmonta antes de que Google termine de cargar', async () => {
    const carga = deferred<ReturnType<typeof apiFalsa>>()
    const api = { initialize: vi.fn(), renderButton: vi.fn() }
    vi.mocked(loadGoogleIdentity).mockReturnValue(carga.promise)
    const wrapper = mount(GoogleSignInButton)
    wrapper.unmount()
    carga.resolve(api)
    await flushPromises()
    expect(api.initialize).not.toHaveBeenCalled()
  })

  it('no muestra errores de carga ocurridos después de desmontarse', async () => {
    const carga = deferred<never>()
    vi.mocked(loadGoogleIdentity).mockReturnValue(carga.promise)
    const wrapper = mount(GoogleSignInButton)
    const vm = wrapper.vm as unknown as { $el: HTMLElement }
    const raiz = vm.$el
    wrapper.unmount()
    carga.reject(new Error('fallo tardío'))
    await flushPromises()
    expect(raiz.textContent).not.toContain('fallo tardío')
  })

  it('muestra el error de carga y permite reintentar', async () => {
    vi.mocked(loadGoogleIdentity).mockRejectedValueOnce(new Error('No se pudo conectar con Google.'))
    const wrapper = mount(GoogleSignInButton)
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo conectar con Google.')
    const api = apiFalsa()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(api.renderButton).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('No se pudo conectar con Google.')
  })

  it('usa un mensaje genérico si la falla no es un Error', async () => {
    vi.mocked(loadGoogleIdentity).mockRejectedValueOnce('sin detalle')
    const wrapper = mount(GoogleSignInButton, { props: { disabled: true } })
    await flushPromises()
    expect(wrapper.text()).toContain('No se pudo cargar el acceso con Google.')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})

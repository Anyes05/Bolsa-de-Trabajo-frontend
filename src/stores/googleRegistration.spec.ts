import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGoogleRegistrationStore } from './googleRegistration'
import type { GoogleRegistration } from '../services/types'

const KEY = 'ccisj-google-registration'
const registro: GoogleRegistration = {
  registrationToken: 'reg-token', email: 'ana@gmail.com', fullName: 'Ana Pérez', fotoUrl: null,
}

describe('store de registro pendiente con Google', () => {
  const storage = new Map<string, string>()
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('arranca sin registro pendiente cuando no hay nada guardado', () => {
    expect(useGoogleRegistrationStore().pending).toBeNull()
  })

  it.each([
    ['sin foto', null],
    ['con foto', 'https://foto.test/ana.jpg'],
  ])('recupera un registro válido guardado (%s)', (_, fotoUrl) => {
    storage.set(KEY, JSON.stringify({ ...registro, fotoUrl, extra: 'ignorado' }))
    expect(useGoogleRegistrationStore().pending).toEqual({ ...registro, fotoUrl })
  })

  it.each([
    ['JSON corrupto', '{no-json', 'SyntaxError'],
    ['un valor primitivo', '"texto"', 'Error'],
    ['null', 'null', 'Error'],
    ['token faltante', JSON.stringify({ email: 'a', fullName: 'b', fotoUrl: null }), 'Error'],
    ['token no texto', JSON.stringify({ registrationToken: 1, email: 'a', fullName: 'b', fotoUrl: null }), 'Error'],
    ['email faltante', JSON.stringify({ registrationToken: 't', fullName: 'b', fotoUrl: null }), 'Error'],
    ['email no texto', JSON.stringify({ registrationToken: 't', email: 2, fullName: 'b', fotoUrl: null }), 'Error'],
    ['nombre faltante', JSON.stringify({ registrationToken: 't', email: 'a', fotoUrl: null }), 'Error'],
    ['nombre no texto', JSON.stringify({ registrationToken: 't', email: 'a', fullName: 3, fotoUrl: null }), 'Error'],
    ['foto faltante', JSON.stringify({ registrationToken: 't', email: 'a', fullName: 'b' }), 'Error'],
    ['foto inválida', JSON.stringify({ registrationToken: 't', email: 'a', fullName: 'b', fotoUrl: 5 }), 'Error'],
  ])('descarta y limpia un registro inválido: %s', (_, raw, errorType) => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    storage.set(KEY, raw)
    expect(useGoogleRegistrationStore().pending).toBeNull()
    expect(storage.has(KEY)).toBe(false)
    expect(consola).toHaveBeenCalledWith(
      '[google-registration] No se pudo recuperar el registro pendiente.', { errorType },
    )
  })

  it('informa tipo desconocido cuando lo lanzado no es un Error', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(JSON, 'parse').mockImplementationOnce(() => { throw 'fallo raro' })
    storage.set(KEY, '{}')
    expect(useGoogleRegistrationStore().pending).toBeNull()
    expect(consola).toHaveBeenCalledWith(expect.any(String), { errorType: 'unknown' })
  })

  it('guarda y limpia el registro pendiente en sessionStorage', () => {
    const store = useGoogleRegistrationStore()
    store.save(registro)
    expect(store.pending).toEqual(registro)
    expect(JSON.parse(storage.get(KEY)!)).toEqual(registro)
    store.clear()
    expect(store.pending).toBeNull()
    expect(storage.has(KEY)).toBe(false)
  })
})

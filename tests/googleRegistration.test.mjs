import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useGoogleRegistrationStore } from '../src/stores/googleRegistration.ts'

const originalStorage = globalThis.sessionStorage
const key = 'ccisj-google-registration'
const draft = {
  registrationToken: 'onboarding-token',
  email: 'demo@example.test',
  fullName: 'Demo',
  fotoUrl: null,
}

beforeEach(() => {
  const values = new Map()
  globalThis.sessionStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, value),
    removeItem: (name) => values.delete(name),
  }
  setActivePinia(createPinia())
})

afterEach(() => {
  mock.restoreAll()
  if (originalStorage === undefined) delete globalThis.sessionStorage
  else globalThis.sessionStorage = originalStorage
})

test('saves and restores onboarding without creating an authenticated session', () => {
  useGoogleRegistrationStore().save(draft)
  assert.equal(sessionStorage.getItem('ccisj-session'), null)
  setActivePinia(createPinia())
  assert.deepEqual(useGoogleRegistrationStore().pending, draft)
})

test('clears onboarding from memory and storage', () => {
  const store = useGoogleRegistrationStore()
  store.save(draft)
  store.clear()
  assert.equal(store.pending, null)
  assert.equal(sessionStorage.getItem(key), null)
})

test('removes invalid stored shapes and explicitly logs without exposing the token', () => {
  const log = mock.method(console, 'error', () => {})
  sessionStorage.setItem(key, JSON.stringify({ ...draft, email: null }))
  assert.equal(useGoogleRegistrationStore().pending, null)
  assert.equal(sessionStorage.getItem(key), null)
  assert.equal(log.mock.callCount(), 1)
  assert.ok(!JSON.stringify(log.mock.calls[0].arguments).includes(draft.registrationToken))
})

test('removes malformed JSON without logging credential fragments', () => {
  const log = mock.method(console, 'error', () => {})
  sessionStorage.setItem(key, '{"registrationToken": "private-fragment"')
  assert.equal(useGoogleRegistrationStore().pending, null)
  assert.equal(sessionStorage.getItem(key), null)
  assert.equal(log.mock.callCount(), 1)
  assert.ok(!JSON.stringify(log.mock.calls[0].arguments).includes('private-fragment'))
})

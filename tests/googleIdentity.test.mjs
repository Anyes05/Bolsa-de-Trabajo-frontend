import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

const originalWindow = globalThis.window
const originalDocument = globalThis.document
let sequence = 0

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
  if (originalDocument === undefined) delete globalThis.document
  else globalThis.document = originalDocument
})

async function loader() {
  return (await import(`../src/services/googleIdentity.ts?test=${sequence++}`)).loadGoogleIdentity
}

function setup() {
  const scripts = []
  globalThis.window = {}
  globalThis.document = {
    createElement: () => ({ remove() { this.removed = true } }),
    head: { append(script) { scripts.push(script) } },
  }
  return scripts
}

test('uses an already loaded Google SDK without injecting another script', async () => {
  const scripts = setup()
  const identity = {}
  window.google = { accounts: { id: identity } }
  assert.equal(await (await loader())(), identity)
  assert.equal(scripts.length, 0)
})

test('shares one SDK load across simultaneous buttons', async () => {
  const scripts = setup()
  const load = await loader()
  const first = load()
  const second = load()
  assert.equal(first, second)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, 'https://accounts.google.com/gsi/client')
  assert.equal(scripts[0].async, true)
  const identity = {}
  window.google = { accounts: { id: identity } }
  scripts[0].onload()
  assert.equal(await first, identity)
})

test('reports SDK connection failure and permits retry', async () => {
  const scripts = setup()
  const load = await loader()
  const first = load()
  scripts[0].onerror()
  await assert.rejects(first, /No se pudo conectar/)
  assert.equal(scripts[0].removed, true)
  const retry = load()
  assert.equal(scripts.length, 2)
  window.google = { accounts: { id: {} } }
  scripts[1].onload()
  assert.equal(await retry, window.google.accounts.id)
})

test('reports a loaded script missing the Google identity API', async () => {
  const scripts = setup()
  const first = (await loader())()
  scripts[0].onload()
  await assert.rejects(first, /No se pudo inicializar/)
  assert.equal(scripts[0].removed, true)
})

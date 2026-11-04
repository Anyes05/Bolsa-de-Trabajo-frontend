import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { openCvInNewTab } from '../src/utils/openCvInNewTab.ts'

const originalWindow = globalThis.window
afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

function setup() {
  const events = []
  const tab = {
    opener: { original: true },
    closed: false,
    location: { replace: (url) => events.push(['navigate', url]) },
    close: () => { tab.closed = true; events.push(['close']) },
  }
  globalThis.window = {
    open: (...args) => { events.push(['open', ...args]); return tab },
    location: { assign: () => assert.fail('The original page must never navigate') },
  }
  return { tab, events }
}

test('opens one detached tab before requesting the URL and navigates only that tab', async () => {
  const { tab, events } = setup()
  await openCvInNewTab(async () => {
    assert.deepEqual(events, [['open', 'about:blank', '_blank']])
    assert.equal(tab.opener, null)
    events.push(['request'])
    return { url: 'https://example.test/cv.pdf?signature=test' }
  })
  assert.deepEqual(events, [
    ['open', 'about:blank', '_blank'],
    ['request'],
    ['navigate', 'https://example.test/cv.pdf?signature=test'],
  ])
  assert.equal(tab.closed, false)
})

test('keeps the reserved tab while the download request is pending', async () => {
  const { events } = setup()
  let resolve
  const request = new Promise((complete) => { resolve = complete })
  const download = openCvInNewTab(() => request)
  assert.deepEqual(events, [['open', 'about:blank', '_blank']])
  resolve({ url: 'https://example.test/cv.pdf' })
  await download
  assert.deepEqual(events[1], ['navigate', 'https://example.test/cv.pdf'])
})

test('reports blocked popups without fetching or navigating the original page', async () => {
  const { events } = setup()
  globalThis.window.open = () => null
  await assert.rejects(openCvInNewTab(() => assert.fail('Must not fetch after popup blocking')),
    /Permití las ventanas emergentes/)
  assert.deepEqual(events, [])
})

test('closes the blank tab and propagates download errors', async () => {
  const { tab, events } = setup()
  const failure = new Error('Download unavailable')
  await assert.rejects(openCvInNewTab(async () => { throw failure }), (error) => error === failure)
  assert.equal(tab.closed, true)
  assert.deepEqual(events, [['open', 'about:blank', '_blank'], ['close']])
})

test('does not navigate or reopen a tab that the user closed during the request', async () => {
  const { tab, events } = setup()
  await assert.rejects(openCvInNewTab(async () => {
    tab.closed = true
    return { url: 'https://example.test/cv.pdf' }
  }), /pestaña de descarga se cerró/)
  assert.deepEqual(events, [['open', 'about:blank', '_blank'], ['close']])
})

test('closes the tab if navigation fails and reports the error', async () => {
  const { tab } = setup()
  const failure = new Error('Navigation failed')
  tab.location.replace = () => { throw failure }
  await assert.rejects(openCvInNewTab(async () => ({ url: 'https://example.test/cv.pdf' })),
    (error) => error === failure)
  assert.equal(tab.closed, true)
})

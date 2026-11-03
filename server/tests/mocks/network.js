/**
 * Replacement for global `fetch`. The app's only outbound HTTP is fetch, so
 * this is the single choke point for the network:
 *
 *   http://classifier.test/...         CLIP classifier (mode set per test)
 *   https://res.cloudinary.com/...     image bytes from the fake Cloudinary store
 *   https://nominatim.openstreetmap... canned reverse-geocode answer
 *   anything else (not localhost)      rejected and recorded in blockedCalls
 *
 * The server itself does not call Nominatim today (geocoding happens in the
 * browser); the stub exists so any future server-side call cannot escape.
 */
import { mockState } from './state.js'
import { TEST_CLOUD_HOST, TEST_CLOUD_NAME } from './cloudinary.js'

const realFetch = globalThis.fetch

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

async function classifierResponse(url, init) {
  const c = mockState.classifier
  c.calls.push({ url, body: init?.body ? JSON.parse(init.body) : null, signal: init?.signal ?? null })
  switch (c.mode) {
    case 'hang':
      // never answers, only ends when our timeout fires
      return new Promise((resolve, reject) => {
        const signal = init?.signal
        if (!signal) return
        if (signal.aborted) reject(signal.reason)
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    case 'timeout':
      // what a timeout looks like
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    case 'down':
      throw new TypeError('fetch failed')
    case 'error':
      return json({ error: 'internal error' }, 500)
    case 'garbage':
      return json({ unexpected: true })
    default:
      return json({ score: c.score, spam: c.spam, version: 'clip-test' })
  }
}

function cloudinaryResponse(url) {
  const prefix = `/${TEST_CLOUD_NAME}/image/upload/`
  const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : ''
  const publicId = path.replace(/\.[a-z]+$/i, '')
  const image = mockState.images.get(publicId)
  if (!image) return new Response('not found', { status: 404 })
  return new Response(image.buffer, { status: 200, headers: { 'Content-Type': 'image/jpeg' } })
}

export async function fakeFetch(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url)

  if (url.hostname === 'classifier.test') return classifierResponse(url.href, init)
  if (url.hostname === TEST_CLOUD_HOST) return cloudinaryResponse(url)
  if (url.hostname.endsWith('nominatim.openstreetmap.org')) {
    mockState.nominatimCalls.push(url.href)
    return json({ display_name: 'Test Road, Ward 5, Kathmandu, Nepal', address: { road: 'Test Road' } })
  }
  if (['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) return realFetch(input, init)

  mockState.blockedCalls.push(url.href)
  throw new Error(`Blocked outbound network call in tests: ${url.href}`)
}

export function installFetchStub() {
  globalThis.fetch = fakeFetch
}

// how the fake classifier behaves: 'score' | 'hang' | 'timeout' | 'down' | 'error' | 'garbage'
export function setClassifier({ mode = 'score', score = 0.9, spam = null } = {}) {
  Object.assign(mockState.classifier, { mode, score, spam })
}

export const classifierCalls = () => mockState.classifier.calls
export const blockedCalls = () => mockState.blockedCalls

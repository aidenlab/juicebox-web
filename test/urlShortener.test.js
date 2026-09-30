import { describe, it, expect, vi, afterEach } from 'vitest'

import { tinyURLShortener } from '../js/urlShortener.js'
import { juiceboxConfig } from '../js/juiceboxConfig.js'

const ENDPOINT = 'https://juicebox.aidenlab.org/shorten'
const LONG_URL = 'https://aidenlab.org/juicebox/?session=abcdef'

/** Stands in for the shortening endpoint. Only the fields the shortener reads are provided. */
function respondWith(body) {
    const fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body
    }))
    vi.stubGlobal('fetch', fetch)
    return fetch
}

/** A network that must not be touched: calling it fails the test that installed it. */
function forbidRequests() {
    const fetch = vi.fn(() => { throw new Error('the shortener made a request it should not have') })
    vi.stubGlobal('fetch', fetch)
    return fetch
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('tinyURL shortener', () => {

    /** The key stays on the worker (workers/jb-shortlink); the page posts the bare url. */
    it('posts the url to the endpoint, without a key, and reads the short link back', async () => {
        const fetch = respondWith({ data: { tiny_url: 'https://t.3dg.io/xyz' } })

        const shorten = tinyURLShortener({ endpoint: ENDPOINT })

        await expect(shorten(LONG_URL)).resolves.toBe('https://t.3dg.io/xyz')

        const [ endpoint, init ] = fetch.mock.calls[0]
        expect(endpoint).toBe(ENDPOINT)
        expect(init.headers.Authorization).toBeUndefined()
        expect(JSON.parse(init.body)).toEqual({ url: LONG_URL })
    })

    /**
     * The degraded path: a build with no endpoint must still hand back a usable link rather
     * than throwing out of the share modal. See aidenlab/juicebox-web#65.
     */
    it('returns the url unshortened, without a request, when no endpoint is configured', async () => {
        const fetch = forbidRequests()
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const shorten = tinyURLShortener({})

        await expect(shorten(LONG_URL)).resolves.toBe(LONG_URL)
        expect(fetch).not.toHaveBeenCalled()
        expect(warn).toHaveBeenCalled()
    })

    it('throws on a failed answer so the modal can fall back', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, statusText: 'Bad Gateway', json: async () => ({}) })))
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const shorten = tinyURLShortener({ endpoint: ENDPOINT })

        await expect(shorten(LONG_URL)).rejects.toThrow(/502/)
    })
})

describe('url shortener configuration', () => {

    it('points at the jb-shortlink worker and carries no key', () => {
        expect(juiceboxConfig.urlShortener.endpoint).toBe(ENDPOINT)
        expect(juiceboxConfig.urlShortener.apiKey).toBeUndefined()
    })
})

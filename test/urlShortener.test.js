import { describe, it, expect, vi, afterEach } from 'vitest'

import { tinyURLShortener } from '../js/urlShortener.js'

const API_KEY = 'test-api-key'
const LONG_URL = 'https://aidenlab.org/juicebox/?session=abcdef'

/** Stands in for the TinyURL create endpoint. Only the fields the shortener reads are provided. */
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

/** The config is read at module scope, so the env has to be in place before it is imported. */
async function loadConfig(apiKey) {
    vi.stubEnv('VITE_TINYURL_JUICEBOX_API_KEY', apiKey)
    vi.resetModules()
    const { juiceboxConfig } = await import('../js/juiceboxConfig.js')
    return juiceboxConfig
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('tinyURL shortener', () => {

    it('shortens through the configured endpoint when an API key is present', async () => {
        const fetch = respondWith({ data: { tiny_url: 'https://t.3dg.io/xyz' } })

        const shorten = tinyURLShortener({ apiKey: API_KEY, domain: 't.3dg.io', tags: ['juicebox'] })

        await expect(shorten(LONG_URL)).resolves.toBe('https://t.3dg.io/xyz')

        const [ endpoint, init ] = fetch.mock.calls[0]
        expect(endpoint).toBe('https://api.tinyurl.com/create')
        expect(init.headers.Authorization).toBe(`Bearer ${ API_KEY }`)
        expect(JSON.parse(init.body)).toMatchObject({ url: LONG_URL, domain: 't.3dg.io' })
    })

    /**
     * The degraded path the `!apiKey` guard exists for: a build with no key must still hand back
     * a usable link rather than throwing out of the share modal.
     * See aidenlab/juicebox-web#65.
     */
    it('returns the url unshortened, without a request, when no API key is configured', async () => {
        const fetch = forbidRequests()
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const shorten = tinyURLShortener({})

        await expect(shorten(LONG_URL)).resolves.toBe(LONG_URL)
        expect(fetch).not.toHaveBeenCalled()
        expect(warn).toHaveBeenCalled()
    })
})

describe('url shortener configuration', () => {

    /**
     * A placeholder standing in for the missing secret is truthy, so it defeats the `!apiKey`
     * guard in tinyURLShortener and sends `Bearer YOUR_...` to TinyURL.
     * See aidenlab/juicebox-web#65.
     */
    it('leaves the API key falsy when the env var is unset', async () => {
        const config = await loadConfig(undefined)

        expect(config.urlShortener.apiKey).toBeFalsy()
    })

    it('leaves the API key falsy when the env var is set but empty', async () => {
        const config = await loadConfig('')

        expect(config.urlShortener.apiKey).toBeFalsy()
    })

    it('uses the env var when it is set', async () => {
        const config = await loadConfig(API_KEY)

        expect(config.urlShortener.apiKey).toBe(API_KEY)
    })
})

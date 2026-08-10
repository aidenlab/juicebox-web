import { describe, it, expect, afterEach } from 'vitest'

import { loadString, loadJson } from '../js/stringLoader.js'

const realFetch = globalThis.fetch

/**
 * Stands in for the network. A response is only ever consumed as an arrayBuffer here, so that is
 * all the fake provides — plus the two fields the loader must now consult before decoding it.
 */
function respondWith({ status = 200, body = '' }) {
    globalThis.fetch = async () => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: 200 === status ? 'OK' : 'Error',
        arrayBuffer: async () => new TextEncoder().encode(body).buffer
    })
}

afterEach(() => {
    globalThis.fetch = realFetch
})

describe('string loader', () => {

    it('returns the body of a successful response', async () => {
        respondWith({ body: 'label\thttps://example.com/a.bedpe' })

        await expect(loadString('https://example.com/menu.txt')).resolves.toBe('label\thttps://example.com/a.bedpe')
    })

    /**
     * The defect this module was fixed for: a 404 used to resolve, handing S3's `NoSuchKey` XML
     * back as though it were the requested file. See aidenlab/juicebox-web#63.
     */
    it('rejects rather than returning the body of a 404', async () => {
        respondWith({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })

        await expect(loadString('https://example.com/missing.txt')).rejects.toThrow()
    })

    it('rejects on a non-404 failure', async () => {
        respondWith({ status: 403, body: '<Error><Code>AccessDenied</Code></Error>' })

        await expect(loadString('https://example.com/forbidden.txt')).rejects.toThrow()
    })

    /** Callers branch on the status, so it travels as a number rather than only in the message. */
    it('carries the http status on the rejection, as a number', async () => {
        respondWith({ status: 403, body: '' })

        await expect(loadString('https://example.com/forbidden.txt')).rejects.toMatchObject({ status: 403 })
    })

    it('names the url in the rejection message', async () => {
        respondWith({ status: 500, body: '' })

        await expect(loadString('https://example.com/broken.txt')).rejects.toThrow(/https:\/\/example\.com\/broken\.txt/)
    })

    /** Local files never went through fetch, and keep their behavior. */
    it('reads a local file without consulting the network', async () => {
        globalThis.fetch = () => { throw new Error('the file path must not fetch') }

        const file = new File([ 'first\tsecond' ], 'menu.txt')

        await expect(loadString(file)).resolves.toBe('first\tsecond')
    })

    describe('json loader', () => {

        it('parses a successful response', async () => {
            respondWith({ body: '{"hg38":["a","b"]}' })

            await expect(loadJson('https://example.com/registry.json')).resolves.toEqual({ hg38: [ 'a', 'b' ] })
        })

        /** Built on the string loader, so it inherits the rejection rather than re-wrapping it. */
        it('rejects with the same error the string loader raises', async () => {
            respondWith({ status: 404, body: '<Error><Code>NoSuchKey</Code></Error>' })

            await expect(loadJson('https://example.com/missing.json')).rejects.toMatchObject({ status: 404 })
        })
    })
})

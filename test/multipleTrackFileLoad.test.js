import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../js/alertSingleton.js', () => ({ AlertSingleton: { present: vi.fn() } }))

// igv-utils declares only `module`, which Vite's browser build honours and Vitest's Node resolver does not.
vi.mock('igv-utils', () => import('../node_modules/igv-utils/src/index.js'))

import { AlertSingleton } from '../js/alertSingleton.js'
import { ingestPaths } from '../js/widgets/multipleTrackFileLoad.js'

/** The configs the loader would hand to juicebox.js for these paths, or undefined if it handed none. */
async function configsFor(paths) {
    const fileLoadHandler = vi.fn()
    await ingestPaths({ paths, fileLoadHandler })
    return fileLoadHandler.mock.calls[0]?.[0]
}

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    AlertSingleton.present.mockClear()
})

/**
 * juicebox.js names a track itself — decoded, from its URL or File — whenever the host supplies no
 * `name`, and lets a `track name=` line override that. So the host must not name these tracks.
 */
describe('track configs built from picked paths', () => {

    it('carry no name, so juicebox.js derives one', async () => {
        const [ config ] = await configsFor([ 'https://example.org/data/sample%5Fa.bigWig' ])

        expect(config).not.toHaveProperty('name')
        expect(config).not.toHaveProperty('_derivedName')
        expect(config.url).toBe('https://example.org/data/sample%5Fa.bigWig')
    })

    it('still carry the file name juicebox.js reads the format from', async () => {
        const [ config ] = await configsFor([ 'https://www.dropbox.com/s/abc/signal.bigWig?dl=0' ])

        expect(config.filename).toBe('signal.bigWig')
    })

    it('name nothing for a local File either', async () => {
        const file = new File([ '' ], 'peaks.bed')
        const [ config ] = await configsFor([ file ])

        expect(config).toEqual({ url: file, filename: 'peaks.bed' })
    })

    it('pair a BAM with its index into one track', async () => {
        const configs = await configsFor([ 'https://example.org/reads.bam', 'https://example.org/reads.bam.bai' ])

        expect(configs).toEqual([
            { url: 'https://example.org/reads.bam', filename: 'reads.bam', indexURL: 'https://example.org/reads.bam.bai' }
        ])
    })

    it('report a BAM picked without its index', async () => {
        const configs = await configsFor([ 'https://example.org/reads.bam' ])

        expect(configs).toBeUndefined()
        expect(AlertSingleton.present).toHaveBeenCalledWith(expect.stringContaining('reads.bam'))
    })
})

/**
 * GEO and others encode dots in URLs (`%2E`). The filename juicebox.js reads the format from — and
 * that the loader pairs indexes by — must be decoded, while the URL loaded stays as given.
 */
describe('track configs built from URLs with encoded characters', () => {

    it('pair an encoded BAM with its encoded index', async () => {
        const configs = await configsFor([ 'https://example.org/reads%2Ebam', 'https://example.org/reads%2Ebam%2Ebai' ])

        expect(configs).toEqual([
            { url: 'https://example.org/reads%2Ebam', filename: 'reads.bam', indexURL: 'https://example.org/reads%2Ebam%2Ebai' }
        ])
    })

    it('report an encoded BAM picked without its index', async () => {
        const configs = await configsFor([ 'https://example.org/reads%2Ebam' ])

        expect(configs).toBeUndefined()
        expect(AlertSingleton.present).toHaveBeenCalledWith(expect.stringContaining('reads.bam'))
    })

    it('decode the filename of a text format', async () => {
        const [ config ] = await configsFor([ 'https://example.org/peaks%2Ebed' ])

        expect(config).toEqual({ url: 'https://example.org/peaks%2Ebed', filename: 'peaks.bed' })
    })

    it('decode a .bedpe filename, which juicebox.js routes as a 2D annotation', async () => {
        const [ config ] = await configsFor([ 'https://example.org/loops%2Ebedpe' ])

        expect(config.filename).toBe('loops.bedpe')
    })

    it('keep a malformed escape raw and still load', async () => {
        const [ config ] = await configsFor([ 'https://example.org/100%.bed' ])

        expect(config).toEqual({ url: 'https://example.org/100%.bed', filename: '100%.bed' })
    })

    it('strip the query before decoding', async () => {
        const [ config ] = await configsFor([ 'https://example.org/x.bigWig?dl=0' ])

        expect(config.filename).toBe('x.bigWig')
    })
})

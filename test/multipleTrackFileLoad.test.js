// @vitest-environment happy-dom
// juicebox.js's bundle touches `document` on import, and the loader pairs by juicebox.js's own filename rule.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../js/alertSingleton.js', () => ({ AlertSingleton: { present: vi.fn() } }))

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

    it('carry no filename, so juicebox.js derives the one it reads the format from', async () => {
        const [ config ] = await configsFor([ 'https://www.dropbox.com/s/abc/signal.bigWig?dl=0' ])

        expect(config).toEqual({ url: 'https://www.dropbox.com/s/abc/signal.bigWig?dl=0' })
    })

    it('name nothing for a local File either', async () => {
        const file = new File([ '' ], 'peaks.bed')
        const [ config ] = await configsFor([ file ])

        expect(config).toEqual({ url: file })
    })

    it('pair a BAM with its index into one track', async () => {
        const configs = await configsFor([ 'https://example.org/reads.bam', 'https://example.org/reads.bam.bai' ])

        expect(configs).toEqual([
            { url: 'https://example.org/reads.bam', indexURL: 'https://example.org/reads.bam.bai' }
        ])
    })

    it('report a BAM picked without its index', async () => {
        const configs = await configsFor([ 'https://example.org/reads.bam' ])

        expect(configs).toBeUndefined()
        expect(AlertSingleton.present).toHaveBeenCalledWith(expect.stringContaining('reads.bam'))
    })
})

/**
 * GEO and others encode dots in URLs (`%2E`). The loader pairs indexes by the decoded filename
 * juicebox.js derives, while the URL loaded stays as given.
 */
describe('track configs built from URLs with encoded characters', () => {

    it('pair an encoded BAM with its encoded index', async () => {
        const configs = await configsFor([ 'https://example.org/reads%2Ebam', 'https://example.org/reads%2Ebam%2Ebai' ])

        expect(configs).toEqual([
            { url: 'https://example.org/reads%2Ebam', indexURL: 'https://example.org/reads%2Ebam%2Ebai' }
        ])
    })

    it('report an encoded BAM picked without its index', async () => {
        const configs = await configsFor([ 'https://example.org/reads%2Ebam' ])

        expect(configs).toBeUndefined()
        expect(AlertSingleton.present).toHaveBeenCalledWith(expect.stringContaining('reads.bam'))
    })

    it('load a URL with a malformed escape', async () => {
        const [ config ] = await configsFor([ 'https://example.org/100%.bed' ])

        expect(config).toEqual({ url: 'https://example.org/100%.bed' })
    })
})

/**
 * GEO's download link names the file in its `file=` query parameter; its path ends in `/download/`.
 * Pairing picked files is the host's job alone, so it must see through that. Deriving the filename
 * the format is read from is juicebox.js's (aidenlab/juicebox.js#698), so these say nothing of it.
 */
describe('tracks picked as GEO download links', () => {

    const GEO_DOWNLOAD = 'https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSM1&format=file&file='

    it('pair a BAM with its index into one track', async () => {
        const bam = `${GEO_DOWNLOAD}GSM1%5Freads%2Ebam`
        const bai = `${GEO_DOWNLOAD}GSM1%5Freads%2Ebam%2Ebai`
        const configs = await configsFor([ bam, bai ])

        expect(configs).toHaveLength(1)
        expect(configs[0]).toMatchObject({ url: bam, indexURL: bai })
    })

    it('report a BAM picked without its index', async () => {
        const configs = await configsFor([ `${GEO_DOWNLOAD}GSM1%5Freads%2Ebam` ])

        expect(configs).toBeUndefined()
        expect(AlertSingleton.present).toHaveBeenCalledWith(expect.stringContaining('GSM1_reads.bam'))
    })
})

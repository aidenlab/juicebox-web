import { describe, it, expect, vi, afterEach } from 'vitest'

import { loadTrackMenu } from '../js/trackMenu.js'

/** Just enough of a `<datalist>` to observe what the loader appended to it. */
function fakeDatalist() {
    const options = []
    return {
        options,
        replaceChildren() { options.length = 0 },
        insertAdjacentHTML(_position, html) { options.push(html) }
    }
}

/** The rejection shape the string loader now raises for a failed request. */
function httpError(status) {
    const error = new Error(`HTTP ${ status }`)
    error.status = status
    return error
}

function setup({ load }) {
    const datalist = fakeDatalist()
    const presentAlert = vi.fn()
    return { datalist, presentAlert, run: url => loadTrackMenu(datalist, url, { load, presentAlert }) }
}

afterEach(() => {
    vi.restoreAllMocks()
})

describe('track menu', () => {

    it('offers one option per tab-delimited line', async () => {
        const { datalist, run } = setup({ load: async () => 'CTCF\thttps://example.com/ctcf.bedpe\nRad21\thttps://example.com/rad21.bedpe' })

        await run('https://example.com/hg19-2d.txt')

        expect(datalist.options).toEqual([
            '<option data-url="https://example.com/ctcf.bedpe">CTCF</option>',
            '<option data-url="https://example.com/rad21.bedpe">Rad21</option>'
        ])
    })

    it('skips blank lines and lines carrying no url', async () => {
        const { datalist, run } = setup({ load: async () => 'CTCF\thttps://example.com/ctcf.bedpe\n\nnot-a-row\n' })

        await run('https://example.com/hg19-2d.txt')

        expect(datalist.options).toEqual([ '<option data-url="https://example.com/ctcf.bedpe">CTCF</option>' ])
    })

    it('clears what an earlier genome left behind', async () => {
        const { datalist, run } = setup({ load: async () => 'CTCF\thttps://example.com/ctcf.bedpe' })
        datalist.options.push('<option data-url="stale">Stale</option>')

        await run('https://example.com/hg19-2d.txt')

        expect(datalist.options).toEqual([ '<option data-url="https://example.com/ctcf.bedpe">CTCF</option>' ])
    })

    /**
     * Not every assembly has a curated menu, so a 404 is the expected condition: leave the menu
     * empty, say so in the console, and do not put a dialog in front of the user.
     */
    describe('when the menu is missing', () => {

        it('leaves the menu empty and warns, without alerting', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const { datalist, presentAlert, run } = setup({ load: async () => { throw httpError(404) } })

            await run('https://example.com/hg38-2d.txt')

            expect(datalist.options).toEqual([])
            expect(presentAlert).not.toHaveBeenCalled()
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('https://example.com/hg38-2d.txt'))
        })
    })

    /** Anything else is a genuine failure and must not be mistaken for an absent menu. */
    describe('when the request fails for another reason', () => {

        it('alerts on a 403', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { datalist, presentAlert, run } = setup({ load: async () => { throw httpError(403) } })

            await run('https://example.com/hg19-2d.txt')

            expect(datalist.options).toEqual([])
            expect(presentAlert).toHaveBeenCalledWith(expect.stringContaining('https://example.com/hg19-2d.txt'))
        })

        it('alerts on a network error, which carries no status', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const { presentAlert, run } = setup({ load: async () => { throw new Error('Failed to fetch') } })

            await run('https://example.com/hg19-2d.txt')

            expect(presentAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'))
        })
    })
})

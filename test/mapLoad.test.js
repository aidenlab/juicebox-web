import { describe, it, expect } from 'vitest'
import { loadMapIntoTargets, mapSummaryMessage } from '../js/mapLoad.js'

/**
 * A stand-in for a juicebox.js BrowserRegistry, implementing only the declared surface this module
 * uses: `targetedBrowsers` (the resolved aim, current browser included) and the two map fan-outs,
 * each resolving to `{loaded, failed, skipped}`.
 */
function fakeRegistry({ browserCount = 3, withMaps = false } = {}) {

    const fail = []
    const incompatible = []

    const browsers = Array.from({ length: browserCount }, (_, i) => ({
        name: `browser-${ i }`,
        dataset: withMaps ? { name: `map-${ i }` } : undefined,
        events: [],
        reset() { this.events.push('reset') },
    }))

    const fanOut = kind => async function (config) {
        const summary = { loaded: [], failed: [], skipped: [] }
        for (const browser of this.targetedBrowsers) {
            if ('control' === kind && undefined === browser.dataset) { summary.skipped.push({ browser, reason: 'no-primary' }); continue }
            if (incompatible.includes(browser)) { summary.skipped.push({ browser, reason: 'control-incompatible' }); continue }
            if (fail.includes(browser)) { summary.failed.push({ browser, error: new Error('nope') }); continue }
            browser.events.push({ kind, config: { ...config } })
            summary.loaded.push(browser)
        }
        return summary
    }

    const registry = {
        browsers,
        fail,
        incompatible,
        currentBrowser: browsers[ 0 ],
        get targetedBrowsers() { return browsers },
        loadHicFileIntoTargets: fanOut('map'),
        loadHicControlFileIntoTargets: fanOut('control'),
    }

    browsers.forEach(browser => browser.registry = registry)

    return registry
}

const optionsFor = (registry, alerts = [], loaded = []) => ({
    getCurrentBrowser: () => registry.currentBrowser,
    presentAlert: message => alerts.push(message),
    onLoaded: browser => loaded.push(browser)
})

describe('contact map load', () => {

    it('loads a contact map into every targeted browser, not only the current one', async () => {

        const registry = fakeRegistry()
        const alerts = []

        await loadMapIntoTargets({ url: 'https://example.org/a.hic', name: 'a' }, 'contact-map', optionsFor(registry, alerts))

        for (const browser of registry.browsers) {
            const loads = browser.events.filter(e => 'reset' !== e)
            expect(loads.map(({ kind, config }) => `${ kind }:${ config.name }`), `${ browser.name } received the map`).toEqual([ 'map:a' ])
        }

        expect(alerts).toEqual([])
    })

    it('resets each target before its map arrives, as the single-panel load always has', async () => {

        const registry = fakeRegistry()

        await loadMapIntoTargets({ url: 'https://example.org/a.hic', name: 'a' }, 'contact-map', optionsFor(registry))

        for (const browser of registry.browsers) {
            expect(browser.events[ 0 ], `${ browser.name } was reset first`).toBe('reset')
        }
    })

    it('tells the shell about each browser that took the map', async () => {

        const registry = fakeRegistry()
        registry.fail.push(registry.browsers[ 1 ])
        const loaded = []

        await loadMapIntoTargets({ url: 'https://example.org/a.hic', name: 'a' }, 'contact-map', optionsFor(registry, [], loaded))

        expect(loaded).toEqual([ registry.browsers[ 0 ], registry.browsers[ 2 ] ])
    })

    it('loads a control map into every targeted browser, without resetting any of them', async () => {

        const registry = fakeRegistry({ withMaps: true })
        const alerts = []

        await loadMapIntoTargets({ url: 'https://example.org/b.hic', name: 'b' }, 'control-map', optionsFor(registry, alerts))

        for (const browser of registry.browsers) {
            expect(browser.events.map(e => e.kind ?? e), `${ browser.name } received the control map`).toEqual([ 'control' ])
            expect(browser.events[ 0 ].config.isControl).toBe(true)
        }

        expect(alerts).toEqual([])
    })

    it('reports, once, the panels a control map passed over', async () => {

        const registry = fakeRegistry({ withMaps: true })
        registry.browsers[ 1 ].dataset = undefined
        registry.incompatible.push(registry.browsers[ 2 ])
        const alerts = []

        await loadMapIntoTargets({ url: 'https://example.org/b.hic', name: 'b' }, 'control-map', optionsFor(registry, alerts))

        expect(alerts).toHaveLength(1)
        expect(alerts[ 0 ]).toMatch(/1 panel\(s\) loaded/)
        expect(alerts[ 0 ]).toMatch(/1 panel\(s\) with no contact map loaded/)
        expect(alerts[ 0 ]).toMatch(/1 panel\(s\) whose contact map cannot pair with it/)
    })

    it('reports a failure with the url, so an unaimed load reads as it always did', async () => {

        const registry = fakeRegistry({ browserCount: 1 })
        registry.fail.push(registry.browsers[ 0 ])
        const alerts = []

        await loadMapIntoTargets({ url: 'https://example.org/a.hic', name: 'a' }, 'contact-map', optionsFor(registry, alerts))

        expect(alerts).toEqual([ 'Error loading https://example.org/a.hic: nope' ])
    })

    it('says nothing when every target loaded', () => {
        expect(mapSummaryMessage({ loaded: [ {}, {} ], failed: [], skipped: [] }, { url: 'u', isControl: false })).toBeUndefined()
    })

    it('alerts rather than throws when no browser is open', async () => {

        const alerts = []

        await loadMapIntoTargets({ url: 'https://example.org/a.hic' }, 'contact-map', {
            getCurrentBrowser: () => undefined,
            presentAlert: message => alerts.push(message)
        })

        expect(alerts).toHaveLength(1)
    })
})

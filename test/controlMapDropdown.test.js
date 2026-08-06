import { describe, it, expect } from 'vitest'

import { createControlMapDropdown } from '../js/controlMapDropdown.js'

/**
 * Stands in for juicebox.js's coordinator, reproducing the parts this seam depends on: the
 * known-event check and the unsubscribe function `addCallback` returns. Keeping the event-name
 * check faithful is the point of the fake — a subscription to a name juicebox.js does not know
 * is the regression this module exists to prevent (aidenlab/juicebox-web#61).
 */
class FakeCoordinator {

    constructor() {
        this.externalCallbacks = {
            onMapLoaded: [],
            onControlMapLoaded: [],
            onLocusChange: [],
            onGenomeChange: [],
            onBackgroundColorChange: [],
            onForegroundColorChange: []
        }
    }

    addCallback(event, callback) {
        if (!this.externalCallbacks[ event ]) {
            throw new Error(`Unknown event: ${ event }. Available: ${ Object.keys(this.externalCallbacks).join(', ') }`)
        }
        this.externalCallbacks[ event ].push(callback)
        return () => {
            const index = this.externalCallbacks[ event ].indexOf(callback)
            if (index > -1) this.externalCallbacks[ event ].splice(index, 1)
        }
    }
}

/** A browser with no map loaded until `loadMap()` gives it a dataset. */
class FakeBrowser {

    constructor() {
        this.dataset = undefined
        this.coordinator = new FakeCoordinator()
    }

    loadMap() {
        this.dataset = { name: 'a contact map' }
        for (const callback of this.coordinator.externalCallbacks.onMapLoaded) {
            callback({ dataset: this.dataset, state: {}, datasetType: 'hic', browser: this })
        }
    }
}

/** Just enough of the dropdown element to observe whether it is enabled. */
function fakeElement() {
    const classes = new Set([ 'disabled' ])
    return {
        classList: {
            remove: name => classes.delete(name),
            add: name => classes.add(name),
            contains: name => classes.has(name)
        },
        get disabled() {
            return classes.has('disabled')
        }
    }
}

function setup(browsers = []) {
    const element = fakeElement()
    const dropdown = createControlMapDropdown({ getBrowsers: () => browsers, element })
    return { element, dropdown, browsers }
}

describe('control map dropdown', () => {

    it('stays disabled while no browser has a map loaded', () => {
        const { element, dropdown } = setup([ new FakeBrowser() ])

        dropdown.sync()

        expect(element.disabled).toBe(true)
    })

    it('is enabled by a map already loaded when it syncs', () => {
        const browser = new FakeBrowser()
        browser.loadMap()
        const { element, dropdown } = setup([ browser ])

        dropdown.sync()

        expect(element.disabled).toBe(false)
    })

    /** The regression: the dropdown must re-evaluate on loads that happen after subscribe time. */
    it('is enabled by a map loaded after it syncs', () => {
        const browser = new FakeBrowser()
        const { element, dropdown } = setup([ browser ])

        dropdown.sync()
        browser.loadMap()

        expect(element.disabled).toBe(false)
    })

    it('subscribes through the event name juicebox.js publishes', () => {
        const browser = new FakeBrowser()
        const { dropdown } = setup([ browser ])

        expect(() => dropdown.sync()).not.toThrow()
        expect(browser.coordinator.externalCallbacks.onMapLoaded).toHaveLength(1)
    })

    it('subscribes a browser once however often it syncs', () => {
        const browser = new FakeBrowser()
        const { dropdown } = setup([ browser ])

        dropdown.sync()
        dropdown.sync()
        dropdown.sync()

        expect(browser.coordinator.externalCallbacks.onMapLoaded).toHaveLength(1)
    })

    it('picks up a browser opened after the first sync', () => {
        const { element, dropdown, browsers } = setup([ new FakeBrowser() ])
        dropdown.sync()

        const clone = new FakeBrowser()
        browsers.push(clone)
        dropdown.sync()
        clone.loadMap()

        expect(element.disabled).toBe(false)
    })

    it('releases a browser that is no longer open', () => {
        const browser = new FakeBrowser()
        const { dropdown, browsers } = setup([ browser ])
        dropdown.sync()

        browsers.length = 0
        dropdown.sync()

        expect(browser.coordinator.externalCallbacks.onMapLoaded).toHaveLength(0)
    })

    it('is enabled by selecting a browser that has a map loaded', () => {
        const browser = new FakeBrowser()
        browser.loadMap()
        const { element, dropdown } = setup()

        dropdown.enableIfMapLoaded(browser)

        expect(element.disabled).toBe(false)
    })

    it('is unmoved by selecting a browser with no map loaded', () => {
        const { element, dropdown } = setup()

        dropdown.enableIfMapLoaded(new FakeBrowser())
        dropdown.enableIfMapLoaded(undefined)

        expect(element.disabled).toBe(true)
    })
})

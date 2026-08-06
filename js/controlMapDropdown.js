/**
 * The control map dropdown, which is disabled until some browser has a contact map loaded.
 *
 * Re-evaluation runs off juicebox.js's coordinator callback rather than its event bus. juicebox.js
 * stopped posting "MapLoad" on the per-browser bus in v3.1.0 (aidenlab/juicebox.js#406, "Refactor
 * browser god object"), and `EventBus.subscribe` accepts any string — so the subscription this
 * replaces was silently inert and the dropdown only ever reflected the state at subscribe time.
 * See aidenlab/juicebox-web#61.
 */
export function createControlMapDropdown({ getBrowsers, element }) {

    // One entry per subscribed browser, holding the unsubscribe function `addCallback` returns.
    // Keyed by browser so `sync` can be called whenever the set of open browsers changes — a clone
    // opened, a session restored — without stacking duplicate callbacks or holding a callback on a
    // browser that is gone.
    const releaseByBrowser = new Map()

    // The dropdown is a single shared element, so any one browser with a map loaded enables it.
    // Nothing disables it again: that is the behavior this repo has always had.
    const enableIfMapLoaded = browser => {
        if (browser && browser.dataset) {
            element.classList.remove('disabled')
        }
    }

    return {

        /** Evaluate the browsers open now, and subscribe them so later map loads re-evaluate. */
        sync() {

            const browsers = getBrowsers()

            for (const browser of browsers) {
                if (!releaseByBrowser.has(browser)) {
                    // The payload carries the browser that just loaded, which is precisely the one
                    // whose dataset should enable the dropdown.
                    releaseByBrowser.set(browser, browser.coordinator.addCallback('onMapLoaded', ({ browser }) => enableIfMapLoaded(browser)))
                }
                enableIfMapLoaded(browser)
            }

            for (const [ browser, release ] of releaseByBrowser) {
                if (!browsers.includes(browser)) {
                    release()
                    releaseByBrowser.delete(browser)
                }
            }
        },

        /** Evaluate one browser directly — used when the current browser changes or loads a map. */
        enableIfMapLoaded
    }
}

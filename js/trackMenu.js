import { loadString } from './stringLoader.js'
import { AlertSingleton } from './alertSingleton.js'

/**
 * Fills a `<datalist>` from a genome's curated track menu: one tab-delimited `label<TAB>url` line
 * per option.
 *
 * The two failure modes are not the same thing, and the point of this module is to keep them apart:
 * a 404 means the genome simply has no curated menu for that dimension, which is expected and
 * belongs in the console; anything else — 403, 5xx, a network error — is a genuine failure the user
 * should see. Until aidenlab/juicebox-web#63 neither branch could run, because the loader resolved
 * with the error body instead of throwing.
 *
 * `load` and `presentAlert` are injectable so the branching can be tested without a network or a
 * dialog; the defaults are what the app runs with.
 */
async function loadTrackMenu(datalist, url, { load = loadString, presentAlert = message => AlertSingleton.present(message) } = {}) {

    datalist.replaceChildren()

    let data
    try {
        data = await load(url)
    } catch (e) {
        if (404 === e.status) {
            // Expected: not every genome has a track menu.
            console.warn(`No track menu found ${ url }`)
        } else {
            const message = `Error loading track menu: ${ url } ${ e.message }`
            console.error(message)
            presentAlert(message)
        }
        return
    }

    for (const line of data.split(/\n|\r\n|\r/g)) {

        if ('' !== line) {
            const tokens = line.split('\t')

            if (tokens.length > 1) {
                const [ label, value ] = tokens
                datalist.insertAdjacentHTML('beforeend', `<option data-url="${ value }">${ label }</option>`)
            }
        }
    }
}

export { loadTrackMenu }

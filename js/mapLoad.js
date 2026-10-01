/**
 * Where a contact map load lands.
 *
 * The same two decisions `trackLoad.js` answers for tracks, answered for maps. juicebox.js ships
 * `browser.loadHicFile`, which loads into that one browser, and `registry.loadHicFileIntoTargets`,
 * which loads the same map into every browser the user aimed at with shift-click — and likewise
 * for the control ("B") map. A host opts in by calling the plural one. Until this module did, every
 * map menu in the shell loaded into the current browser alone: an aim was drawn on the panels and
 * then ignored by the load it was set up for.
 *
 * The fan-out raises no alert. It returns `{loaded, failed, skipped}` and the host reports — one
 * report per gesture, on the shell's own alert surface.
 *
 * `getCurrentBrowser`, `presentAlert` and `onLoaded` are passed in rather than imported, as in
 * `trackLoad.js`: it keeps this testable without a viewer or a dialog.
 */

/**
 * The one message a gesture produces, or `undefined` when there is nothing worth saying.
 *
 * Silence is the common case. A load that failed in the only panel it was aimed at reads as it did
 * before there was a target set; anything involving several panels says how many took the map and
 * why the rest did not.
 *
 * Only a control map is ever skipped, and its two reasons are juicebox.js contract: `no-primary`
 * is a panel with no map for this one to be the "B" of, `control-incompatible` is a panel whose
 * own map cannot pair with it.
 */
function mapSummaryMessage({ loaded, failed, skipped }, { url, isControl }) {

    if (1 === failed.length && 0 === loaded.length && 0 === skipped.length) {
        return `Error loading ${ url }: ${ failed[ 0 ].error.message }`
    }

    const notes = []

    for (const { error } of failed) {
        notes.push(`failed in one panel: ${ error.message }`)
    }

    const noPrimary = skipped.filter(({ reason }) => 'no-primary' === reason).length
    const incompatible = skipped.filter(({ reason }) => 'control-incompatible' === reason).length

    if (noPrimary > 0) {
        notes.push(`skipped ${ noPrimary } panel(s) with no contact map loaded`)
    }

    if (incompatible > 0) {
        notes.push(`skipped ${ incompatible } panel(s) whose contact map cannot pair with it`)
    }

    if (0 === notes.length) {
        return undefined
    }

    return `${ isControl ? '"B" map' : 'Map' } load: ${ loaded.length } panel(s) loaded, ${ notes.join(', ') }.`
}

/**
 * Load one contact map, or one control map, into every browser the user has aimed at.
 *
 * With no aim in progress the target set resolves to `[currentBrowser]`, so this is the previous
 * single-browser behaviour — the feature is opt-in at the *gesture*, not at this call site.
 *
 * A contact map load resets each target first, as the single-panel load in this shell always has:
 * a new map starts from a clean panel. The aim survives a reset, so the set read here is the set
 * the fan-out then reaches. A control map joins the map already there and resets nothing.
 *
 * `onLoaded` is called with each browser that took the map.
 */
async function loadMapIntoTargets({ url, name }, mapType, { getCurrentBrowser, presentAlert, onLoaded = () => {} }) {

    const browser = getCurrentBrowser()

    if (undefined === browser) {
        presentAlert('A browser must be open and selected before loading a contact map')
        return
    }

    const isControl = ('control-map' === mapType)
    const config = { url, name, isControl }
    const { registry } = browser

    let summary
    try {
        if (isControl) {
            summary = await registry.loadHicControlFileIntoTargets(config)
        } else {
            for (const target of registry.targetedBrowsers) {
                target.reset()
            }
            summary = await registry.loadHicFileIntoTargets(config)
        }
    } catch (e) {
        presentAlert(`Error loading ${ url }: ${ e }`)
        return
    }

    summary.loaded.forEach(onLoaded)

    const message = mapSummaryMessage(summary, config)

    if (undefined !== message) {
        presentAlert(message)
    }

    return summary
}

export { loadMapIntoTargets, mapSummaryMessage }

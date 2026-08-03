/*
 * Client half of the juicebox.js dev proxy; the server half is the Vite plugin in
 * vite.config.mjs. Routes WAF-challenged data hosts through the dev server, which fetches
 * them from Node where the Origin header can be set to an allowlisted one — see
 * aidenlab/juicebox-web#54.
 *
 * The dev-mode check has to live here rather than inside juicebox.js: the library is installed
 * from git and built by its own `prepare`, so import.meta.env.DEV is already baked false inside
 * the dist this app consumes.
 *
 * The dev-only import is inside the gate, so a production build folds the branch away and never
 * has to resolve `juicebox.js/dev-proxy/map-url`. A static import would still have to resolve at
 * build time even though it does nothing there, which hard-fails `vite build` wherever that
 * export is missing — as it is against any dependency cache older than the juicebox.js bump that
 * introduced it. Nothing dev-only should be able to break a production build. juicebox.js itself
 * stays a static import: it is the app's core dependency, always present, and never the fragile
 * specifier.
 */

import hic from 'juicebox.js'

export async function registerDevUrlMapper() {

    if (!import.meta.env.DEV) {
        return
    }

    let devMapUrl
    try {
        ({ devMapUrl } = await import('juicebox.js/dev-proxy/map-url'))
    } catch (e) {
        // Dev-only convenience: never take the app down over a missing module. The cost is that
        // ENCODE-hosted maps won't load from localhost — worth a warning, not a crash. Scoped to
        // the import alone so a real setUrlMapper break still surfaces.
        console.warn(`Dev URL mapper unavailable (${e.message}). ENCODE-hosted contact maps will not load from localhost.`)
        return
    }

    hic.setUrlMapper(devMapUrl)
}

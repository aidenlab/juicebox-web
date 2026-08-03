/*
 * Routes WAF-challenged data hosts through the dev server's proxy — see aidenlab/juicebox-web#54.
 * Imported for its side effect by every entry point; a no-op in a production build.
 *
 * The dev-mode check has to live here rather than inside juicebox.js: the library is installed
 * from git and built by its own `prepare`, so import.meta.env.DEV is already baked false inside
 * the dist this app consumes.
 */

import hic from 'juicebox.js'
import {devMapUrl} from 'juicebox.js/dev-proxy/map-url'

if (import.meta.env.DEV) hic.setUrlMapper(devMapUrl)

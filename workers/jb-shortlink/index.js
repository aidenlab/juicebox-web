// Short links for jb.3dg.io.
//
//   https://jb.3dg.io/                     -> the app
//   https://jb.3dg.io/<hic-url>            -> the app with that map loaded
//   https://jb.3dg.io/?hicUrl=<hic-url>    -> unchanged, still works
//
// Replaces the redirect rule that used to sit on this hostname. A rule could not do the
// path form: it has no way to lift the path into a query parameter, and it dropped the
// path outright, so /<hic-url> landed on a bare app with no map.

const APP = 'https://aidenlab.org/juicebox/'

// The path form embeds a whole URL after the first slash. Cloudflare passes the double
// slash through untouched, but a client or intermediary that collapses it to `https:/`
// would otherwise produce an unloadable map URL, so accept one slash or two.
const EMBEDDED_URL = /^\/(https?):\/{1,2}(.+)$/

// juicebox.js decodes query values by unescaping this exact set (and, on its other code
// path, with decodeURIComponent, which is a superset). So escaping only these leaves the
// `https://` in the address bar human-readable — matching the ?hicUrl= links already in
// circulation — while still surviving a .hic URL that carries its own query string, which
// signed S3 links do.
// `%` is deliberately absent. A .hic URL that already carries percent-encoding — %20 in a
// filename, say — decodes correctly on both of juicebox's paths if left alone. Escaping it
// to %25 would round-trip to a literal %20 instead of a space, breaking the very URLs the
// escaping is meant to protect.
const ESCAPES = [
    [ '&', '%26' ],
    [ '#', '%23' ],
    [ '?', '%3F' ],
    [ '=', '%3D' ],
    [ '|', '%7C' ],
    [ ' ', '%20' ],
]

function escapeValue(value) {
    return ESCAPES.reduce((acc, [ char, escaped ]) => acc.replaceAll(char, escaped), value)
}

export default {
    async fetch(request) {
        const url = new URL(request.url)
        const match = url.pathname.match(EMBEDDED_URL)

        if (!match) {
            // No embedded URL: hand over whatever query string was supplied, so the existing
            // ?hicUrl= form (and every other juicebox parameter) keeps working untouched.
            return Response.redirect(`${APP}${url.search}`, 302)
        }

        // The trailing query belongs to the embedded URL, not to us — a signed .hic link
        // carries its credentials there. The cost is that the path form cannot also pass
        // juicebox's own parameters; ?hicUrl= remains the way to combine them.
        const hicUrl = `${match[1]}://${match[2]}${url.search}`

        // 302, not 301: these are one-off, user-supplied URLs, and a permanent redirect
        // would be cached by the browser against a path that never repeats.
        return Response.redirect(`${APP}?hicUrl=${escapeValue(hicUrl)}`, 302)
    },
}

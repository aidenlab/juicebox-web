// Short links for jb.3dg.io.
//
//   https://jb.3dg.io/                     -> the app
//   https://jb.3dg.io/<hic-url>            -> the app with that map loaded
//   https://jb.3dg.io/ENCFF622YUQ          -> the app with that ENCODE file loaded
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

// ENCODE file accessions. Checked before EMBEDDED_URL, which cannot match these anyway,
// but the intent reads better in this order.
const ENCODE_ACCESSION = /^\/(ENCFF[0-9A-Z]{6})\/?$/i

const ENCODE_API = 'https://www.encodeproject.org/files'

// The portal's WAF answers 403 to a request that does not identify itself, which is the same
// obstacle js/devUrlMapper.js works around on the client side. Measured from a worker: no
// user-agent gives 403, and a spoofed browser user-agent gives 502 — so pretending to be
// Chrome is both dishonest and broken. A name and a contact URL gets a clean 200, and leaves
// ENCODE able to identify this traffic.
const USER_AGENT = 'juicebox-web (+https://aidenlab.org/juicebox/)'

// juicebox.js decodes query values by unescaping this exact set (and, on its other code
// path, with decodeURIComponent, which is a superset). So escaping only these leaves the
// `https://` in the address bar human-readable — matching the ?hicUrl= links already in
// circulation — while still surviving a .hic URL that carries its own query string, which
// signed S3 links do.
//
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

function appUrl(hicUrl, name) {
    const params = [ `hicUrl=${escapeValue(hicUrl)}` ]
    if (name) {
        params.push(`name=${escapeValue(name)}`)
    }
    return `${APP}?${params.join('&')}`
}

function problem(status, message) {
    return new Response(`${message}\n`, {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
}

// Accessions are immutable, so a hit is worth caching for a day. Only successes are stored:
// caching by cf.cacheTtl instead would pin failures too, turning a momentary ENCODE outage —
// or a WAF 403 — into a day of dead short links for every accession fetched during it.
//
// The key is synthetic — our own hostname, not the ENCODE URL — so this cache holds only
// entries this worker chose to store. Keying on the upstream URL would share a namespace with
// Cloudflare's own handling of the subrequest, where anything already stored under that URL
// (a WAF 403, say) would be served back as though we had cached it deliberately.
async function lookup(endpoint, cacheKey, context) {
    const cached = await caches.default.match(cacheKey)
    if (cached) {
        return cached
    }

    const response = await fetch(endpoint, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    })
    if (!response.ok) {
        return response
    }

    const storable = new Response(response.clone().body, response)
    storable.headers.set('cache-control', 'max-age=86400')
    storable.headers.delete('set-cookie')  // a response carrying one cannot be cached
    context.waitUntil(caches.default.put(cacheKey, storable))

    return response
}

// Turns an accession into a directly loadable .hic URL via the ENCODE portal's REST API.
//
// Resolution deliberately yields cloud_metadata.url — the object's own S3 address — rather
// than the portal's /@@download/ href. The portal sits behind the WAF noted above, while the
// S3 object answers range requests directly with access-control-allow-origin: *. So the
// resolved URL loads from anywhere, localhost included, and nothing has to be proxied.
async function resolveAccession(accession, context) {
    const response = await lookup(
        `${ENCODE_API}/${accession}/?format=json`,
        new Request(`https://jb.3dg.io/__encode/${accession}`),
        context,
    )

    if (response.status === 404) {
        return { error: problem(404, `No such ENCODE file: ${accession}`) }
    }
    if (!response.ok) {
        return { error: problem(502, `ENCODE lookup for ${accession} failed (${response.status}).`) }
    }

    const file = await response.json()

    if (file.file_format !== 'hic') {
        return { error: problem(415, `${accession} is a ${file.file_format} file, not a contact map.`) }
    }

    const hicUrl = file.cloud_metadata?.url
    if (!hicUrl) {
        return { error: problem(502, `${accession} has no cloud storage URL to load.`) }
    }

    return { hicUrl }
}

export default {
    async fetch(request, env, context) {
        const url = new URL(request.url)

        const accession = url.pathname.match(ENCODE_ACCESSION)
        if (accession) {
            const identifier = accession[1].toUpperCase()
            const { hicUrl, error } = await resolveAccession(identifier, context)
            if (error) {
                return error
            }
            // Name it for the accession; the alternative label is a bare S3 object path.
            return Response.redirect(appUrl(hicUrl, identifier), 302)
        }

        const embedded = url.pathname.match(EMBEDDED_URL)
        if (!embedded) {
            // No embedded URL: hand over whatever query string was supplied, so the existing
            // ?hicUrl= form (and every other juicebox parameter) keeps working untouched.
            return Response.redirect(`${APP}${url.search}`, 302)
        }

        // The trailing query belongs to the embedded URL, not to us — a signed .hic link
        // carries its credentials there. The cost is that the path form cannot also pass
        // juicebox's own parameters; ?hicUrl= remains the way to combine them.
        const hicUrl = `${embedded[1]}://${embedded[2]}${url.search}`

        // 302, not 301: these are one-off, user-supplied URLs, and a permanent redirect
        // would be cached by the browser against a path that never repeats.
        return Response.redirect(appUrl(hicUrl), 302)
    },
}

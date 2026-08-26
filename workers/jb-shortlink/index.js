// Short links for jb.3dg.io.
//
//   https://jb.3dg.io/                     -> the app
//   https://jb.3dg.io/<hic-url>            -> the app with that map loaded
//   https://jb.3dg.io/ENCFF622YUQ          -> the app with that ENCODE file loaded
//   https://jb.3dg.io/4DNFI916JQ1Y         -> the app with that 4DN file loaded
//   https://jb.3dg.io/ENCSR410MDC          -> that ENCODE experiment's contact map
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

// Data-portal file accessions, checked before EMBEDDED_URL — which cannot match these anyway,
// but the intent reads better in this order.
//
// Both portals run the same software (encoded / fourfront), so they are shaped alike: fetch
// the item as JSON, read the object's public cloud address off it. They differ only in which
// field carries that address, so the difference is data rather than a second code path.
const PORTALS = [
    {
        name: 'ENCODE',
        accession: /^\/(ENCFF[0-9A-Z]{6})\/?$/i,
        item: (accession) => `https://www.encodeproject.org/files/${accession}/?format=json`,
        hicUrl: (file) => file.cloud_metadata?.url,
    },
    {
        name: '4DN',
        accession: /^\/(4DNF[A-Z0-9]{8})\/?$/i,
        // Addressed at the portal root rather than under /files-processed/, so an accession
        // that turns out to be some other kind of item still resolves and can be reported as
        // the wrong format instead of as missing.
        item: (accession) => `https://data.4dnucleome.org/${accession}/?format=json`,
        hicUrl: (file) => file.open_data_url,
    },
]

// ENCODE experiment and series accessions. These name a set of files rather than one file, so
// resolving them means choosing among the contact maps the dataset holds.
const ENCODE_DATASET = /^\/(ENCSR[0-9A-Z]{6})\/?$/i

const ENCODE_SEARCH = 'https://www.encodeproject.org/search/'

// Contact-map kinds, best first. This ordering is ENCODE's own rather than ours: across every
// released .hic file the portal flags preferred_default, 284 are mapping-quality-thresholded
// and 94 are plain contact matrices, and not one is a haplotype-specific, fold-change or
// variants map. The last three are still ranked rather than excluded, so a dataset holding
// only those resolves to something instead of to an error.
const OUTPUT_TYPES = [
    'mapping quality thresholded contact matrix',
    'contact matrix',
    'haplotype-specific contact matrix',
    'fold over change matrix',
    'variants contact matrix',
]

// Newest assembly first, for the datasets that carry a map against more than one.
const ASSEMBLIES = [ 'GRCh38', 'hg19', 'mm10', 'mm9' ]

// Narrows a dataset's contact maps to the one to load.
//
// Measured against the whole released corpus — 842 datasets, 629 of them holding more than one
// .hic file — this resolves every one of the 629 to a single file, and reaches the recency
// tiebreak already decided in all but a handful. preferred_default alone settles about half;
// the rest need the ranking below.
function chooseContactMap(files) {
    // ENCODE's own opinion wins where it has one. It marks two files on a few datasets, where
    // the same data was reprocessed under a later analysis — recency separates those.
    let pool = files.filter((file) => file.preferred_default)
    if (pool.length === 0) {
        pool = files
    }

    for (const outputType of OUTPUT_TYPES) {
        const tier = pool.filter((file) => file.output_type === outputType)
        if (tier.length > 0) {
            pool = tier
            break
        }
    }

    for (const assembly of ASSEMBLIES) {
        const tier = pool.filter((file) => file.assembly === assembly)
        if (tier.length > 0) {
            pool = tier
            break
        }
    }

    // Whatever survives, take the most recently created: where two files are otherwise
    // identical they come from different analyses of the same data, and the later analysis is
    // the current one.
    return pool.reduce((best, file) => ((file.date_created ?? '') > (best.date_created ?? '') ? file : best))
}

// file_format arrives as a bare string from ENCODE and from 4DN's collection endpoints, but as
// an embedded object from 4DN's root endpoint, and as an @id path under some framings. Reduce
// all three to the format name.
function fileFormat(file) {
    const format = file.file_format
    if (typeof format === 'string') {
        return format.replace(/^\/file-formats\//, '').replace(/\/$/, '')
    }
    return format?.file_format ?? format?.display_title
}

// The portals' WAF answers 403 to a request that does not identify itself, which is the same
// obstacle js/devUrlMapper.js works around on the client side. Measured from a worker against
// ENCODE: no user-agent gives 403, and a spoofed browser user-agent gives 502 — so pretending
// to be Chrome is both dishonest and broken. A name and a contact URL gets a clean 200, and
// leaves both portals able to identify this traffic.
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
// caching by cf.cacheTtl instead would pin failures too, turning a momentary portal outage —
// or a WAF 403 — into a day of dead short links for every accession fetched during it.
//
// The key is synthetic — our own hostname, not the portal URL — so this cache holds only
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

// Turns an accession into a directly loadable .hic URL via its portal's REST API.
//
// Resolution deliberately yields the object's own S3 address rather than the portal's
// /@@download/ href. Both portals sit behind the WAF noted above, while the S3 objects answer
// range requests directly with access-control-allow-origin: *. So the resolved URL loads from
// anywhere, localhost included, and nothing has to be proxied.
async function resolveAccession(accession, portal, context) {
    const response = await lookup(
        portal.item(accession),
        new Request(`https://jb.3dg.io/__accession/${accession}`),
        context,
    )

    if (response.status === 404) {
        return { error: problem(404, `No such ${portal.name} file: ${accession}`) }
    }
    if (!response.ok) {
        return { error: problem(502, `${portal.name} lookup for ${accession} failed (${response.status}).`) }
    }

    const file = await response.json()

    const format = fileFormat(file)
    if (format !== 'hic') {
        return { error: problem(415, `${accession} is a ${format ?? 'unrecognized'} file, not a contact map.`) }
    }

    // A file can be released and still have no public object — restricted 4DN data, for
    // instance. The map the caller asked for is not there to load, so report that as a 404
    // rather than as our own lookup being broken.
    const hicUrl = portal.hicUrl(file)
    if (!hicUrl) {
        return { error: problem(404, `${accession} has no public cloud URL to load.`) }
    }

    return { hicUrl }
}

// Turns an experiment or series accession into a loadable contact map.
//
// Two lookups rather than one. The dataset page does embed its files, but the embedded copies
// omit preferred_default — the single most informative field here — so the files are fetched
// through search instead, which requires the dataset's collection path (/experiments/ versus
// /aggregate-series/). Resolving the accession at the portal root yields that path without
// having to guess it, and works for any dataset type. Both lookups are cached.
async function resolveDataset(accession, context) {
    const item = await lookup(
        `https://www.encodeproject.org/${accession}/?format=json&frame=object`,
        new Request(`https://jb.3dg.io/__dataset/${accession}`),
        context,
    )

    if (item.status === 404) {
        return { error: problem(404, `No such ENCODE dataset: ${accession}`) }
    }
    if (!item.ok) {
        return { error: problem(502, `ENCODE lookup for ${accession} failed (${item.status}).`) }
    }

    const dataset = await item.json()

    const query = new URLSearchParams({
        type: 'File',
        file_format: 'hic',
        status: 'released',
        dataset: dataset['@id'],
        limit: 'all',
        format: 'json',
    })
    for (const field of [ 'accession', 'preferred_default', 'output_type', 'assembly', 'date_created', 'cloud_metadata' ]) {
        query.append('field', field)
    }

    const found = await lookup(
        `${ENCODE_SEARCH}?${query}`,
        new Request(`https://jb.3dg.io/__dataset-files/${accession}`),
        context,
    )

    // ENCODE answers a search with no matches as 404, so this is "holds no released contact
    // map" rather than "the dataset is missing" — which the lookup above already ruled out.
    if (found.status === 404) {
        return { error: problem(404, `${accession} has no released contact map to load.`) }
    }
    if (!found.ok) {
        return { error: problem(502, `ENCODE file search for ${accession} failed (${found.status}).`) }
    }

    const files = (await found.json())['@graph'] ?? []
    if (files.length === 0) {
        return { error: problem(404, `${accession} has no released contact map to load.`) }
    }

    const chosen = chooseContactMap(files)
    const hicUrl = chosen.cloud_metadata?.url
    if (!hicUrl) {
        return { error: problem(404, `${chosen.accession} has no public cloud URL to load.`) }
    }

    // Named for both, since which map was chosen out of the dataset is not otherwise visible.
    return { hicUrl, name: `${accession} (${chosen.accession})` }
}

export default {
    async fetch(request, env, context) {
        const url = new URL(request.url)

        const dataset = url.pathname.match(ENCODE_DATASET)
        if (dataset) {
            const accession = dataset[1].toUpperCase()
            const { hicUrl, name, error } = await resolveDataset(accession, context)
            if (error) {
                return error
            }
            return Response.redirect(appUrl(hicUrl, name), 302)
        }

        for (const portal of PORTALS) {
            const match = url.pathname.match(portal.accession)
            if (!match) {
                continue
            }
            const accession = match[1].toUpperCase()
            const { hicUrl, error } = await resolveAccession(accession, portal, context)
            if (error) {
                return error
            }
            // Name it for the accession; the alternative label is a bare S3 object path.
            return Response.redirect(appUrl(hicUrl, accession), 302)
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

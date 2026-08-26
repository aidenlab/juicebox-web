// Serves the Cloudflare Pages deployment at https://aidenlab.org/juicebox/.
//
// A Pages custom domain is hostname-level and cannot own a subpath of another site, so
// reaching the app at a path on aidenlab.org needs a worker in front. This one strips the
// prefix and proxies; it deliberately does not touch response bodies.
//
// The sibling worker for Spacewalk (spacewalk-proxy) does rewrite bodies, buffering every
// HTML *and* JavaScript response through response.text() to patch root-absolute `/assets/`
// URLs into `/spacewalk/assets/`. That is only necessary because the build emits root-
// absolute paths. juicebox-web sets `base: './'` instead (see vite.config.mjs), so every
// asset URL is already relative and correct under any prefix — which means this worker can
// stream bodies straight through, and no string in the bundle can be corrupted by a blind
// replaceAll. juicebox passes around arbitrary user-supplied map and track URLs, so that
// last point matters more here than it does for Spacewalk.

const ORIGIN = 'https://juicebox-web.pages.dev'
const PREFIX = '/juicebox'

export default {
    async fetch(request) {
        const url = new URL(request.url)

        // Relative asset URLs resolve against the directory, so at /juicebox (no trailing
        // slash) `./assets/` would resolve to the aidenlab.org root and 404. Redirect rather
        // than serve a page whose every asset is wrong.
        if (url.pathname === PREFIX) {
            url.pathname = `${PREFIX}/`
            return Response.redirect(url.toString(), 301)
        }

        if (!url.pathname.startsWith(`${PREFIX}/`)) {
            return new Response('Not found', { status: 404 })
        }

        const target = new URL(url.pathname.slice(PREFIX.length) || '/', ORIGIN)
        target.search = url.search

        // redirect: 'manual' so the origin's own redirects can be re-prefixed below instead
        // of being followed here, which would leave the browser's URL and the served content
        // disagreeing about where the app lives.
        const response = await fetch(new Request(target, request), { redirect: 'manual' })

        // Pages redirects /embed.html to the extensionless /embed. That Location is rooted at
        // the origin and would drop the prefix, bouncing the visitor to aidenlab.org/embed.
        // Headers are the only thing rewritten; the body streams through untouched.
        const location = response.headers.get('location')
        if (!location) {
            return response
        }

        const resolved = new URL(location, target)
        if (resolved.origin !== ORIGIN) {
            return response
        }

        const headers = new Headers(response.headers)
        headers.set('location', `${PREFIX}${resolved.pathname}${resolved.search}`)
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        })
    },
}

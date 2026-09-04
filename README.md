# juicebox-web

[![Netlify Status](https://api.netlify.com/api/v1/badges/0f4a804f-32b2-4680-a8d6-9f095da45af5/deploy-status)](https://app.netlify.com/projects/juicebox-web/deploys)

*Netlify status is the work-in-progress preview, not production — see [Deployment](#deployment).*

The web application that wraps [juicebox.js](https://github.com/aidenlab/juicebox.js), an
interactive viewer for Hi-C contact maps. The viewer itself belongs to the library; this repo
owns everything around it — the catalogs a user picks data from, the load and share surfaces,
and the shipped distributions.

Public instances: [aidenlab.org/juicebox](https://aidenlab.org/juicebox) and
[igv.org/juicebox](https://igv.org/juicebox).

User documentation lives in [`docs/`](docs/index.md). `CONTEXT.md` defines the vocabulary this
repo uses for its own concepts — *shell*, *browser*, *datasource*, *distribution* — and is worth
reading before making changes.

## Getting started

Requires Node 24 or newer, and the npm that ships with it. `.nvmrc` pins 24 so the
deploy hosts agree; npm 10 cannot resolve this dependency tree (see Deployment).

```bash
npm install
cp .env.example .env   # optional; see Environment below
npm run dev
```

## Scripts

| Command                     | What it does                                                    |
| --------------------------- | --------------------------------------------------------------- |
| `npm run dev`               | Vite dev server, default distribution                            |
| `npm run dev:aidenlab`      | Dev server, AidenLab distribution                                |
| `npm run build`             | Production build → `dist/`                                       |
| `npm run build:aidenlab`    | AidenLab build → `dist-aidenlab/`                                |
| `npm run preview`           | Serve the built `dist/`                                          |
| `npm run preview:aidenlab`  | Serve the built `dist-aidenlab/`                                 |
| `npm test`                  | Vitest, single run                                               |

## Distributions

Two builds of the same shell, selected by Vite mode rather than at runtime:

- **default** — entry `index.html`, output `dist/`
- **aidenlab** — entry `aidenLab.html`, output `dist-aidenlab/`, where the build renames
  `aidenLab.html` to `index.html` so it serves at the directory root

Both builds also emit `embed.html`, a bare viewer with no shell, for hosting a map inside
someone else's page.

Assets are emitted with relative URLs (`base: './'`), so a single build serves both at a domain
root and behind a path prefix without rebuilding. See the comments in `vite.config.mjs` — they
carry the reasoning for this and for the dev-proxy plugin.

## Layout

```
js/            shell application code (app, load menus, datasources, shortener)
js/widgets/    modals, file-load widgets, and other shell UI
css/           styles
public/        static assets copied verbatim
test/          Vitest suites
docs/          user documentation (GitHub Pages) and agent-facing notes
workers/       Cloudflare Workers that front the public URLs
```

Contact maps reach the load menu through *datasources* — one adapter per catalog (the curated
map menu, ENCODE, 4DN), each turning an external catalog into rows of a searchable table.

## Environment

Copy `.env.example` to `.env`. Only `VITE_`-prefixed names reach the client bundle.

- `VITE_TINYURL_JUICEBOX_API_KEY` — TinyURL key for share-link shortening. Absent, sharing
  degrades to unshortened URLs rather than failing.
- `VITE_GA_MEASUREMENT_ID` — GA4 measurement ID. Left empty by design: the analytics tag is
  emitted only when it is set, so local and preview builds stay untagged. It is never applied
  to `embed.html`.

Hosted builds read these from the deploy environment, so a name added here must also be set on
the hosting project — on both hosts below — or the built site loses the feature.

## Deployment

Two hosts, with different jobs:

- **Cloudflare Pages — production.** The official deployment. It is what
  [aidenlab.org/juicebox](https://aidenlab.org/juicebox) serves, and the only one the Workers
  below sit in front of. `VITE_GA_MEASUREMENT_ID` is set on this host's *production*
  environment only.
- **Netlify — work in progress.** Preview builds for collaborators to review before anything
  reaches production. The badge above reports this host, so a red badge means a preview is
  broken, not that the live site is down.

Both hosts read `.nvmrc`, which pins Node 24. This is load-bearing: `juicebox.js` is a git
dependency whose `prepare` script builds it, so npm installs its devDependencies — including
its own `vite` and `vitest` — and deduping those against ours crashes npm 10.9.8 (the npm
bundled with Node 22) with `Cannot read properties of null (reading 'edgesOut')`. Node 24
ships npm 11, which resolves the tree correctly.

## Workers

`workers/` holds two Cloudflare Workers, deployed by hand with `npx wrangler deploy` from their
own directories. They are independent of the site build and only need redeploying when the
worker itself changes.

- `juicebox-path-proxy` — serves the app at `aidenlab.org/juicebox`, including the redirect to
  the trailing slash that relative asset URLs require.
- `jb-shortlink` — the `jb.3dg.io` short-link host, which also resolves a bare ENCODE accession
  or an embedded `.hic` URL into a loaded map.

## Tests

```bash
npm test
```

Vitest suites in `test/` cover the load menus, the control-map dropdown, the string loader, and
the URL shortener. `test/testURLs.md` collects URLs useful for manual checks.

## License

MIT

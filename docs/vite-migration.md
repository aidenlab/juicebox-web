# Vite Migration Plan

Migrate juicebox-web's build system from Rollup to Vite, modeled on the
spacewalk project's setup. Primary motivations:

- Native `.env` handling in dev (no `process is not defined` errors when
  testing unbundled).
- Eliminate the custom `scripts/generateJuiceboxConfig.js` placeholder-
  replacement step.
- Tooling parity with spacewalk.
- Built-in dev server with HMR.

Vite uses Rollup under the hood for production builds, so output
characteristics should be similar.

## Phase 0 — Survey & decisions

- **Locate the rollup config.** `package.json` says `npx rollup -c` but
  `rollup.config.js` was not found at the expected path. Confirm whether
  it's `rollup.config.mjs`, lives under `scripts/`, or is missing.
- **Inventory entry points.** Currently:
  - `index.html` → `dist/index.html`
  - `aidenLab.html` (built from `index.html` + `scripts/aiden_lab_navbar_additions.html`) → `dist/aidenLab.html`
  - `embed.html` + `js/embed.js` (verify)

  Vite needs all of these declared in `rollupOptions.input`.
- **Decide what `scripts/generateHtml.js` does that Vite must replicate:**
  1. Swap dev `<script type="module" src="js/app.js">` for built
     `js/hic-app.min.js` — Vite does this automatically when building an
     HTML entry.
  2. Rewrite `juicebox.css` link to `css/juicebox.css` — handled if CSS is
     imported from JS.
  3. `@VERSION` token replacement — needs a Vite `transformIndexHtml`
     plugin (~10 lines).
  4. `<!--AIDEN_LAB-->` conditional include — easiest path is to make
     `aidenLab.html` a real second HTML file with the navbar inlined,
     rather than templating from `index.html`.

## Phase 1 — Add Vite alongside Rollup (no removal yet)

- Install: `npm i -D vite` (drop `dotenv` from this step — Vite handles
  `.env` natively).
- Create `vite.config.mjs` modeled on spacewalk's:

  ```js
  import { defineConfig } from 'vite'
  export default defineConfig({
    define: {
      'process.env.TINYURL_JUICEBOX_API_KEY':
        JSON.stringify(process.env.TINYURL_JUICEBOX_API_KEY)
    },
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          aidenLab: 'aidenLab.html',
          embed: 'embed.html'
        }
      }
    }
  })
  ```

- Add scripts: `"dev": "vite"`, `"build:vite": "vite build"`. Keep the
  existing `build` working in parallel until cutover.

## Phase 2 — Convert `juiceboxConfig.js` to a module

- Rename to `js/juiceboxConfig.js` and `export const juiceboxConfig = { … }`.
- In `js/app.js`, replace implicit `window.juiceboxConfig` usage with
  `import { juiceboxConfig } from './juiceboxConfig.js'`.
- Remove `<script src="juiceboxConfig.js">` and the `process` shim from
  `index.html`.
- Delete `scripts/generateJuiceboxConfig.js` — Vite's `define` replaces
  `process.env.X` in dev *and* build.
- Source becomes the clean spacewalk shape:
  `apiKey: process.env.TINYURL_JUICEBOX_API_KEY || 'YOUR_…'`.

## Phase 3 — Materialize `aidenLab.html`

- Create a real `aidenLab.html` at the repo root: copy `index.html` and
  inline the contents of `scripts/aiden_lab_navbar_additions.html` at the
  `<!--AIDEN_LAB-->` slot.
- Delete the `<!--AIDEN_LAB-->` markers from `index.html`.
- Decide whether to keep `scripts/aiden_lab_navbar_additions.html` as a
  doc fragment, or delete it.

## Phase 4 — `@VERSION` and CSS

- Tiny Vite plugin in `vite.config.mjs`:

  ```js
  {
    name: 'version',
    transformIndexHtml: html => html.replace(/@VERSION/g, version)
  }
  ```

- For CSS: import `juicebox.css` from `js/app.js`
  (`import '../css/juicebox.css'`) instead of relying on a `<link>`
  rewrite. Drop the `<link>` from HTML.

## Phase 5 — Verify & cut over

- `npm run dev` — confirm:
  - app loads, no `process` errors
  - `.env` `TINYURL_JUICEBOX_API_KEY` is picked up (DevTools Network on a
    share)
  - all three entry points work (`/`, `/aidenLab.html`, `/embed.html`)
  - jQuery/Bootstrap globals from CDN still resolve
- `npm run build:vite` — diff the output bundle size against the current
  Rollup `dist/js/hic-app.min.js`. Investigate if drastically different.
- Manual smoke test of `dist/`: load contact map, load track, share URL
  (real shortened URL), embed snippet, QR code.

## Phase 6 — Remove old build

- Delete: `rollup.config.*`, `scripts/generateHtml.js`,
  `scripts/generateJuiceboxConfig.js`,
  `scripts/aiden_lab_navbar_additions.html` (if Phase 3 inlined it).
- Remove from `devDependencies`: `rollup`, `@rollup/plugin-strip`,
  `@rollup/plugin-terser`, `rollup-plugin-copy`, `dotenv`.
- Rename `build:vite` → `build`.

## Risks / watch-outs

- **CDN-loaded jQuery/Bootstrap/Dropbox/Google.** These remain global
  `<script>` tags in HTML; Vite leaves them alone. Verify load order
  survives Vite's HTML rewriting.
- **`igv-widgets` and `juicebox.js` from `node_modules`.** Currently
  imported via explicit `../node_modules/...` paths in
  `initializationHelper.js`. Vite resolves bare specifiers
  (`'igv-widgets'`) — should work, but may surface dual-package or CJS
  quirks. Likely needs `optimizeDeps.include` for stubborn ones (mirrors
  spacewalk's handling of `hic-straw`).
- **Output paths.** `generateHtml.js` rewrites to `js/hic-app.min.js`.
  Vite's default emits hashed filenames under `assets/`. If anything
  external references `dist/js/hic-app.min.js` (README, an embed snippet,
  the AidenLab site), pin output filenames via
  `build.rollupOptions.output`.
- **`embed.html` + `js/embed.js`.** Separate entry; verify it still works
  after the bundle restructure.

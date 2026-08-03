import { defineConfig } from 'vite'
import { readFileSync, renameSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)

// Server half of the juicebox.js dev proxy — what lets ENCODE-hosted contact maps load from
// localhost. The client half is js/devUrlMapper.js. Rationale: aidenlab/juicebox-web#54.
//
// Loaded only when serving, and deliberately not as a top-level import. The plugin is
// `apply: 'serve'`, so a production build has no use for it — but a static import would still
// have to *resolve* it, which makes `vite build` hard-fail wherever the module isn't present.
// That is not hypothetical: it took Spacewalk's production build down when CI restored a
// node_modules cache predating the juicebox bump and `npm install` reported "up to date"
// without fetching. Nothing dev-only should be able to break a production build.
async function devOnlyPlugins(command) {

    if ('serve' !== command) {
        return []
    }

    // The specifier is assembled from parts rather than written as a literal, and that is
    // load-bearing rather than stylistic. Vite *bundles* this config before running it, and
    // that pass resolves static `import()` specifiers too — so a literal is resolved before
    // `command` is ever consulted, and fails the production build exactly as a top-level
    // import would. Assembled, it is invisible to that pass and resolves through Node at call
    // time, which only happens when serving.
    const specifier = [ 'juicebox.js', 'dev-proxy', 'plugin' ].join('/')

    try {
        const { devProxy } = await import(specifier)
        return [ devProxy() ]
    } catch (e) {
        // Dev-only convenience: never take the dev server down over it.
        console.warn(`Dev proxy unavailable (${e.message}). ENCODE-hosted contact maps will not load from localhost.`)
        return []
    }
}

export default defineConfig(async ({ command, mode }) => {
    const isAidenLab = mode === 'aidenlab'
    return {
        build: {
            outDir: isAidenLab ? 'dist-aidenlab' : 'dist',
            rollupOptions: {
                input: {
                    main: isAidenLab ? 'aidenLab.html' : 'index.html',
                    embed: 'embed.html',
                },
            },
        },
        plugins: [
            ...await devOnlyPlugins(command),
            {
                name: 'juicebox-version',
                transformIndexHtml: (html) => html.replace(/@VERSION/g, pkg.version),
            },
            isAidenLab && {
                name: 'aidenlab-as-index',
                apply: 'build',
                writeBundle(options) {
                    const dir = options.dir
                    const src = resolve(dir, 'aidenLab.html')
                    const dst = resolve(dir, 'index.html')
                    if (existsSync(src)) renameSync(src, dst)
                },
            },
        ],
    }
})

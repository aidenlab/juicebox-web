import { defineConfig } from 'vite'
import { devProxy } from 'juicebox.js/dev-proxy/plugin'
import { readFileSync, renameSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)

export default defineConfig(({ mode }) => {
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
            // Dev only (apply: 'serve'). Fetches WAF-challenged data hosts from Node, where the
            // Origin header can be set to an allowlisted one. See aidenlab/juicebox-web#54.
            devProxy(),
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

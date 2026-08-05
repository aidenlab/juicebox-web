import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { juiceboxConfig } from '../js/juiceboxConfig.js'
import { aidenLabContactMapDatasourceConfigurator } from '../js/aidenLabContactMapDatasourceConfig.js'

const projectRoot = resolve(import.meta.dirname, '..')

/**
 * The menu is curated by hand, so these are deliberate figures rather than incidental ones: change
 * them in the same commit that adds or removes a map, and never to make a red test go green.
 */
const EXPECTED = { maps: 571, withNvi: 534, withoutNvi: 37 }

/**
 * The menu as the modal table actually receives it: read from wherever juiceboxConfig points, then
 * put through the datasource's own parser.
 */
function menuRows() {
    const { items } = juiceboxConfig.mapMenu
    const { parser } = aidenLabContactMapDatasourceConfigurator(items)
    return parser.parse(readFileSync(resolve(projectRoot, 'public', items), 'utf-8'))
}

describe('contact map menu', () => {

    it('is served by the app rather than fetched cross-origin', () => {
        const { items } = juiceboxConfig.mapMenu

        expect(items).not.toMatch(/^https?:\/\//)
        expect(existsSync(resolve(projectRoot, 'public', items))).toBe(true)
    })

    it('offers one row per contact map', () => {
        expect(menuRows()).toHaveLength(EXPECTED.maps)
    })

    /**
     * The buckets these maps live in serve 403 to a browser — they admit only a User-Agent starting
     * with `IGV`, which no browser can send — so in development they are reached through the dev
     * proxy in juicebox.js. That proxy is keyed on host, and it deliberately declines path-style
     * addressing (`s3.amazonaws.com/<bucket>/…`) because that endpoint fronts every bucket on S3,
     * so claiming it would route strangers' data through the dev server. Virtual-host addressing
     * names the bucket and is safe to claim.
     */
    it('addresses S3 buckets by virtual host, which the dev proxy can reach', () => {
        const pathStyle = menuRows().filter(({ url }) => new URL(url).host === 's3.amazonaws.com')

        expect(pathStyle).toEqual([])
    })

    /**
     * The normalization vector index saves a lookup round trip on load. These maps used to get it
     * from a 1268-entry table inside juicebox.js (js/nvi.js), matched on the exact URL string — so
     * editing a URL here silently cost seconds of load time rather than failing. Carrying the value
     * in the menu removes that coupling.
     *
     * That table is not importable from the published package, which ships only dist/, so these
     * tests assert on the shape and internal consistency of the baked values rather than
     * re-deriving them. The values themselves were verified against the table once, at the point
     * they were baked in.
     */
    describe('normalization vector index', () => {

        it('reaches the row as a query parameter on the url', () => {
            for (const { NVI, url } of menuRows().filter(({ NVI }) => NVI)) {
                expect(url).toBe(`${url.split('?')[0]}?nvi=${NVI}`)
            }
        })

        it('travels with the maps that have one', () => {
            expect(menuRows().filter(({ NVI }) => NVI)).toHaveLength(EXPECTED.withNvi)
        })

        it('is well formed wherever it appears', () => {
            for (const { NVI } of menuRows().filter(({ NVI }) => NVI)) {
                expect(NVI).toMatch(/^\d+,\d+$/)
            }
        })

        it('is absent, not invented, for the maps that never had one', () => {
            const withoutNvi = menuRows().filter(({ NVI }) => !NVI)

            expect(withoutNvi).toHaveLength(EXPECTED.withoutNvi)
            for (const { url } of withoutNvi) {
                expect(url).not.toContain('?')
            }
        })

        /**
         * An index locates one map's normalization vectors, so sharing one between maps is very
         * nearly always corruption — a value copied down a run of entries. Four pairs genuinely
         * collide in the source table; a run longer than that is the tell. This is the guard that
         * catches a bad bulk edit, which counts and format checks sail straight past.
         */
        it('is not shared across a run of maps', () => {
            const occurrences = new Map()
            for (const { NVI } of menuRows().filter(({ NVI }) => NVI)) {
                occurrences.set(NVI, (occurrences.get(NVI) ?? 0) + 1)
            }

            const overShared = [...occurrences].filter(([, count]) => count > 2)
            expect(overShared).toEqual([])
        })
    })
})

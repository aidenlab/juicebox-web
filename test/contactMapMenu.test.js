import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { juiceboxConfig } from '../js/juiceboxConfig.js'
import { aidenLabContactMapDatasourceConfigurator } from '../js/aidenLabContactMapDatasourceConfig.js'

const projectRoot = resolve(import.meta.dirname, '..')

/**
 * The menu as the modal table actually receives it: read from wherever juiceboxConfig points, then
 * put through the datasource's own parser. Tests assert on these rows rather than on the JSON file,
 * so they survive a change of format or storage location.
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
        expect(menuRows()).toHaveLength(571)
    })
})

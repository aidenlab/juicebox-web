/**
 * Re-export loadString and loadJson functions from igv-utils
 * This maintains the same interface while using the original implementations
 */

import igvxhr from '../node_modules/igv-utils/src/igvxhr.js'

export const loadString = igvxhr.loadString.bind(igvxhr)
export const loadJson = igvxhr.loadJson.bind(igvxhr)

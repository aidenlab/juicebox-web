/**
 * Target for rollup to create babelized juicebox for embed.html
 */

import hic from "juicebox.js/dist/juicebox.esm.js"

async function init(container, config) {

    await hic.init(container, config)

}

export default {init}

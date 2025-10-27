/**
 * Target for rollup to create babelized juicebox for embed.html
 */

import hic from "juicebox.js/dist/juicebox.esm.js"
import * as GoogleAuth from "google-utils/src/googleAuth.js"

async function init(container, config) {

    const google = config.google
    config.googleEnabled = google && (window.location.protocol === "https:" || window.location.host === "localhost")
    if (config.googleEnabled) {
        try {
            await GoogleAuth.init({
                client_id: google.clientId,
                apiKey: google.apiKey,
                scope: 'https://www.googleapis.com/auth/userinfo.profile'
            })
        } catch (e) {
            console.error(e)
            alert(e.message)
        }
    }

    await hic.init(container, config)

}

export default {init}

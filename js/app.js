/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2019 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import hic from "juicebox.js/dist/juicebox.esm.js"
import {AlertSingleton} from 'igv-widgets/dist/igv-widgets.js'
import {initializationHelper} from "./initializationHelper.js"
import { juiceboxConfig } from "../juicebox-config.js"
import "../css/app.scss"

document.addEventListener("DOMContentLoaded", async (event) => {
    await init(document.getElementById('app-container'))
})

/**
 * Initialize the app in the given container (dom element).
 *
 * @param container
 * @returns {Promise<void>}
 */
async function init(container) {

    AlertSingleton.init(container)

    const config = juiceboxConfig || {}   // Imported config

    initializationHelper(container, config)

    await hic.init(container, config)

}

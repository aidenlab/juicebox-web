import hic from 'juicebox.js'
import {registerDevUrlMapper} from './devUrlMapper.js'
import 'juicebox.js/dist/css/juicebox.css'

document.addEventListener('DOMContentLoaded', async () => {
    // Ahead of hic.init, so the mapper is in place before any map or track read.
    await registerDevUrlMapper()
    hic.init(document.getElementById('app-container'), {})
})

import hic from 'juicebox.js'
import './devUrlMapper.js'
import 'juicebox.js/dist/css/juicebox.css'

document.addEventListener('DOMContentLoaded', () => {
    hic.init(document.getElementById('app-container'), {})
})

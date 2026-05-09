import { FileUtils, igvxhr } from 'igv-utils'
import FileLoad from './fileLoad.js'

class SessionFileLoad extends FileLoad {

    constructor({ localFileInput, initializeDropbox, dropboxButton, loadHandler }) {
        super({ localFileInput, initializeDropbox, dropboxButton })
        this.loadHandler = loadHandler
    }

    async loadPaths(paths) {

        const path = paths[0]

        if ('json' === FileUtils.getExtension(path)) {
            const json = await igvxhr.loadJson(path)
            this.loadHandler(json)
        } else if ('xml' === FileUtils.getExtension(path)) {
            const key = FileUtils.isFilePath(path) ? 'file' : 'url'
            const o = {}
            o[key] = path
            this.loadHandler(o)
        } else {
            throw new Error('Session file did not load - invalid format')
        }
    }
}

export default SessionFileLoad

import { FileUtils } from '../../node_modules/igv-utils/src/index.js'

class FileLoadManager {

    constructor() {
        this.dictionary = {}
    }

    inputHandler(path, isIndexFile) {
        this.ingestPath(path, isIndexFile)
    }

    ingestPath(path, isIndexFile) {
        const key = isIndexFile ? 'index' : 'data'
        this.dictionary[key] = path.trim()
    }

    indexName() { return itemName(this.dictionary.index) }
    dataName()  { return itemName(this.dictionary.data)  }

    reset() { this.dictionary = {} }
}

function itemName(item) {
    return FileUtils.isFilePath(item) ? item.name : item
}

export default FileLoadManager

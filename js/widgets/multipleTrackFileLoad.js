import { AlertSingleton } from '../alertSingleton.js'
import { FileUtils, URIUtils } from 'igv-utils'

/**
 * Track-loading equivalent of FileLoad, but with multi-file selection and
 * data-file/index-file pairing. Google Drive paths intentionally omitted.
 */
class MultipleTrackFileLoad {

    constructor({ localFileInput, initializeDropbox, dropboxButton, fileLoadHandler, multipleFileSelection }) {

        this.fileLoadHandler = fileLoadHandler

        localFileInput.addEventListener('change', async () => {
            if (MultipleTrackFileLoad.isValidLocalFileInput(localFileInput)) {
                const paths = Array.from(localFileInput.files)
                localFileInput.value = ''
                await this.loadPaths(paths)
            }
        })

        if (dropboxButton) {
            dropboxButton.addEventListener('click', async () => {
                const result = await initializeDropbox()
                if (true !== result) {
                    AlertSingleton.present('Cannot connect to Dropbox')
                    return
                }
                Dropbox.choose({
                    success: dbFiles => this.loadPaths(dbFiles.map(({ link }) => link)),
                    cancel: () => {},
                    linkType: 'preview',
                    multiselect: multipleFileSelection,
                    folderselect: false
                })
            })
        }
    }

    async loadPaths(paths) {
        await ingestPaths({ paths, fileLoadHandler: this.fileLoadHandler })
    }

    static isValidLocalFileInput(input) {
        return input.files && input.files.length > 0
    }

    static getFilename(path) {
        if (path instanceof File) return path.name
        return URIUtils.parseUri(path).file
    }
}

async function ingestPaths({ paths, fileLoadHandler }) {

    try {
        const indexLUT = new Map()
        const dataPaths = []

        for (const path of paths) {
            const name = MultipleTrackFileLoad.getFilename(path)
            const extension = FileUtils.getExtension(name)

            if (indexExtensions.has(extension)) {
                indexLUT.set(createIndexLUTKey(name, extension), { indexURL: path })
            } else {
                dataPaths.push(path)
            }
        }

        const configurations = []
        for (const dataPath of dataPaths) {
            const filename = MultipleTrackFileLoad.getFilename(dataPath)

            if (indexLUT.has(filename)) {
                const { indexURL } = indexLUT.get(filename)
                configurations.push({ url: dataPath, filename, indexURL, name: filename, _derivedName: true })
            } else if (requireIndex.has(FileUtils.getExtension(filename))) {
                throw new Error(`Unable to load track file ${filename} - you must select both ${filename} and its corresponding index file`)
            } else {
                configurations.push({ url: dataPath, filename, name: filename, _derivedName: true })
            }
        }

        if (configurations.length > 0) fileLoadHandler(configurations)

    } catch (e) {
        console.error(e)
        AlertSingleton.present(e.message)
    }
}

const indexExtensions = new Set(['bai', 'csi', 'tbi', 'idx', 'crai', 'fai'])
const requireIndex   = new Set(['bam', 'cram', 'fa', 'fasta'])

function createIndexLUTKey(name, extension) {
    const key = name.substring(0, name.length - (extension.length + 1))
    if ('bai'  === extension && !key.endsWith('bam'))  return `${key}.bam`
    if ('crai' === extension && !key.endsWith('cram')) return `${key}.cram`
    return key
}

export default MultipleTrackFileLoad

import { AlertSingleton } from '../alertSingleton.js'

/**
 * Base class for handling local file input and Dropbox button click. Google Drive paths
 * are intentionally omitted — juicebox-web does not enable Google integration.
 */
class FileLoad {

    constructor({ localFileInput, initializeDropbox, dropboxButton }) {

        localFileInput.addEventListener('change', async () => {
            if (FileLoad.isValidLocalFileInput(localFileInput)) {
                try {
                    await this.loadPaths(Array.from(localFileInput.files))
                } catch (e) {
                    console.error(e)
                    AlertSingleton.present(e)
                }
                localFileInput.value = ''
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
                    success: async dbFiles => {
                        try {
                            await this.loadPaths(dbFiles.map(f => f.link))
                        } catch (e) {
                            console.error(e)
                            AlertSingleton.present(e)
                        }
                    },
                    cancel: () => {},
                    linkType: 'preview',
                    multiselect: true,
                    folderselect: false
                })
            })
        }
    }

    async loadPaths(paths) {
        // override in subclass
    }

    static isValidLocalFileInput(input) {
        return input.files && input.files.length > 0
    }
}

export default FileLoad

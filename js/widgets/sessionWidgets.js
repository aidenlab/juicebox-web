import { FileUtils } from 'igv-utils'
import FileLoadManager from './fileLoadManager.js'
import FileLoadWidget from './fileLoadWidget.js'
import SessionFileLoad from './sessionFileLoad.js'
import { createURLModal } from './urlModal.js'
import { configureModal } from './utils.js'

/**
 * Vanilla-JS / Bootstrap-5 port of igv-widgets v1.5.4 createSessionWidgets.
 * Public API takes plain DOM elements / IDs (no jQuery objects).
 */
function createSessionWidgets(rootContainer,
                              prefix,
                              localFileInputId,
                              initializeDropbox,
                              dropboxButtonId,
                              urlModalId,
                              sessionSaveModalId,
                              loadHandler,
                              JSONProvider) {

    const urlModalElement = createURLModal(urlModalId, 'Session URL')
    rootContainer.appendChild(urlModalElement)

    const fileLoadWidget = new FileLoadWidget({
        widgetParent: urlModalElement.querySelector('.modal-body'),
        dataTitle: 'Session',
        indexTitle: undefined,
        mode: 'url',
        fileLoadManager: new FileLoadManager(),
        dataOnly: true,
        doURL: undefined
    })

    const sessionFileLoad = new SessionFileLoad({
        localFileInput: document.querySelector(`#${localFileInputId}`),
        initializeDropbox,
        dropboxButton: dropboxButtonId ? document.querySelector(`#${dropboxButtonId}`) : undefined,
        loadHandler
    })

    configureModal(fileLoadWidget, urlModalElement, async fileLoadWidget => {
        await sessionFileLoad.loadPaths(fileLoadWidget.retrievePaths())
        return true
    })

    configureSaveSessionModal(rootContainer, prefix, JSONProvider, sessionSaveModalId)
}

function configureSaveSessionModal(rootContainer, prefix, JSONProvider, sessionSaveModalId) {

    const html = `<div id="${sessionSaveModalId}" class="modal fade igv-app-file-save-modal" tabindex="-1">

        <div class="modal-dialog modal-lg">

            <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-title">
                        <div>Save Session File</div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body">
                    <input class="form-control" type="text" placeholder="igv-app-session.json">
                    <div>Enter session filename with .json suffix</div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-sm btn-secondary">OK</button>
                </div>

            </div>

        </div>

    </div>`

    const modalElement = document.createRange().createContextualFragment(html).firstChild
    rootContainer.appendChild(modalElement)

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
    const input = modalElement.querySelector('input')

    const okHandler = () => {
        const extensions = new Set(['json', 'xml'])
        let filename = input.value

        if (undefined === filename || '' === filename) {
            filename = input.getAttribute('placeholder')
        } else if (false === extensions.has(FileUtils.getExtension(filename))) {
            filename = filename + '.json'
        }

        const json = JSONProvider()
        if (json) {
            const jsonString = JSON.stringify(json, null, '\t')
            const data = URL.createObjectURL(new Blob([jsonString], { type: 'application/octet-stream' }))
            FileUtils.download(filename, data)
        }

        modal.hide()
    }

    const okButton = modalElement.querySelector('.modal-footer button:nth-child(2)')
    okButton.addEventListener('click', okHandler)

    modalElement.addEventListener('show.bs.modal', () => {
        input.value = `${prefix}-session.json`
    })

    input.addEventListener('keyup', e => {
        if ('Enter' === e.key) okHandler()
    })
}

export { createSessionWidgets }

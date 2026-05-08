import * as DOMUtils from './dom-utils.js'
import * as UIUtils from './ui-utils.js'

class FileLoadWidget {

    constructor({ widgetParent, dataTitle, indexTitle, mode, fileLoadManager, dataOnly, doURL }) {

        dataTitle = dataTitle || 'Data'
        indexTitle = indexTitle || 'Index'
        dataOnly = dataOnly || false
        doURL = doURL || false

        this.fileLoadManager = fileLoadManager

        this.container = DOMUtils.div({ class: 'igv-file-load-widget-container' })
        widgetParent.appendChild(this.container)

        const config = 'localFile' === mode
            ? { parent: this.container, doURL: false, dataTitle: dataTitle + ' file', indexTitle: indexTitle + ' file', dataOnly }
            : { parent: this.container, doURL: true,  dataTitle: dataTitle + ' URL',  indexTitle: indexTitle + ' URL',  dataOnly }

        this.createInputContainer(config)

        this.error_message = DOMUtils.div({ class: 'igv-flw-error-message-container' })
        this.container.appendChild(this.error_message)
        this.error_message.appendChild(DOMUtils.div({ class: 'igv-flw-error-message' }))

        UIUtils.attachDialogCloseHandlerWithParent(this.error_message, () => this.dismissErrorMessage())

        this.dismissErrorMessage()
    }

    retrievePaths() {

        this.fileLoadManager.ingestPath(this.inputData.value, false)
        if (this.inputIndex) this.fileLoadManager.ingestPath(this.inputIndex.value, true)

        const paths = []
        if (this.fileLoadManager.dictionary) {
            if (this.fileLoadManager.dictionary.data)  paths.push(this.fileLoadManager.dictionary.data)
            if (this.fileLoadManager.dictionary.index) paths.push(this.fileLoadManager.dictionary.index)
        }

        // clear input elements
        this.container.querySelectorAll('.igv-flw-input-row').forEach(row => {
            const input = row.querySelector('input')
            if (input) input.value = ''
        })

        return paths
    }

    presentErrorMessage(message) {
        this.error_message.querySelector('.igv-flw-error-message').textContent = message
        DOMUtils.show(this.error_message)
    }

    dismissErrorMessage() {
        DOMUtils.hide(this.error_message)
        this.error_message.querySelector('.igv-flw-error-message').textContent = ''
    }

    present() { DOMUtils.show(this.container) }

    dismiss() {
        this.dismissErrorMessage()
        this.container.querySelectorAll('.igv-flw-input-row').forEach(row => {
            const input = row.querySelector('input')
            if (input) input.value = ''
        })
        this.fileLoadManager.reset()
    }

    createInputContainer({ parent, doURL, dataTitle, indexTitle, dataOnly }) {

        const container = DOMUtils.div({ class: 'igv-flw-input-container' })
        parent.appendChild(container)

        const dataRow = DOMUtils.div({ class: 'igv-flw-input-row' })
        container.appendChild(dataRow)

        let label = DOMUtils.div({ class: 'igv-flw-input-label' })
        dataRow.appendChild(label)
        label.textContent = dataTitle

        if (doURL) this.createURLContainer(dataRow, 'igv-flw-data-url', false)
        else       this.createLocalFileContainer(dataRow, 'igv-flw-local-data-file', false)

        if (dataOnly) return

        const indexRow = DOMUtils.div({ class: 'igv-flw-input-row' })
        container.appendChild(indexRow)

        label = DOMUtils.div({ class: 'igv-flw-input-label' })
        indexRow.appendChild(label)
        label.textContent = indexTitle

        if (doURL) this.createURLContainer(indexRow, 'igv-flw-index-url', true)
        else       this.createLocalFileContainer(indexRow, 'igv-flw-local-index-file', true)
    }

    createURLContainer(parent, id, isIndexFile) {
        const input = DOMUtils.create('input')
        input.setAttribute('type', 'text')
        parent.appendChild(input)
        if (isIndexFile) this.inputIndex = input
        else             this.inputData = input
    }

    createLocalFileContainer(parent, id, isIndexFile) {

        const file_chooser = DOMUtils.div({ class: 'igv-flw-file-chooser-container' })
        parent.appendChild(file_chooser)

        const str = `${id}${DOMUtils.guid()}`

        const label = DOMUtils.create('label')
        label.setAttribute('for', str)
        file_chooser.appendChild(label)
        label.textContent = 'Choose file'

        const input = DOMUtils.create('input', { class: 'igv-flw-file-chooser-input' })
        input.setAttribute('id', str)
        input.setAttribute('name', str)
        input.setAttribute('type', 'file')
        file_chooser.appendChild(input)

        const file_name = DOMUtils.div({ class: 'igv-flw-local-file-name-container' })
        parent.appendChild(file_name)
        DOMUtils.hide(file_name)

        input.addEventListener('change', e => {
            this.dismissErrorMessage()
            const file = e.target.files[0]
            this.fileLoadManager.inputHandler(file, isIndexFile)
            file_name.textContent = file.name
            file_name.setAttribute('title', file.name)
            DOMUtils.show(file_name)
        })
    }
}

export default FileLoadWidget

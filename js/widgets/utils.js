/**
 * Wire up a Bootstrap-5 modal element so its OK button runs okHandler and dismiss
 * buttons clean up the file-load widget. The dismiss buttons already carry
 * data-bs-dismiss="modal", so Bootstrap auto-hides the modal — we just piggy-back
 * on `hidden.bs.modal` to run widget cleanup and on click to drive OK.
 */
function configureModal(fileLoadWidget, modalElement, okHandler) {

    const modal = bootstrap.Modal.getOrCreateInstance(modalElement)

    const doOK = async () => {
        const result = await okHandler(fileLoadWidget)
        if (true === result) {
            fileLoadWidget.dismiss()
            modal.hide()
        }
    }

    // ok button is the second .modal-footer button
    const ok = modalElement.querySelector('.modal-footer button:nth-child(2)')
    ok.addEventListener('click', doOK)

    // any dismissal (X, Cancel, ESC, backdrop click) → clean up widget state
    modalElement.addEventListener('hidden.bs.modal', () => fileLoadWidget.dismiss())

    modalElement.addEventListener('keypress', event => {
        if ('Enter' === event.key) doOK()
    })
}

export { configureModal }

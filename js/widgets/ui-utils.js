import { createIcon } from './icons.js'

function attachDialogCloseHandlerWithParent(parent, closeHandler) {
    const container = document.createElement('div')
    parent.appendChild(container)
    container.appendChild(createIcon('times'))
    container.addEventListener('click', e => {
        e.preventDefault()
        e.stopPropagation()
        closeHandler()
    })
}

export { attachDialogCloseHandlerWithParent }

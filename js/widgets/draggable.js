let dragData

function makeDraggable(target, handle, constraint) {

    handle.addEventListener('mousedown', dragStart.bind(target))

    function dragStart(event) {

        event.stopPropagation()
        event.preventDefault()

        const dragFunction = drag.bind(this)
        const dragEndFunction = dragEnd.bind(this)
        const computedStyle = getComputedStyle(this)

        dragData = {
            constraint,
            dragFunction,
            dragEndFunction,
            screenX: event.screenX,
            screenY: event.screenY,
            top: parseInt(computedStyle.top.replace('px', '')),
            left: parseInt(computedStyle.left.replace('px', ''))
        }

        document.addEventListener('mousemove', dragFunction)
        document.addEventListener('mouseup', dragEndFunction)
        document.addEventListener('mouseleave', dragEndFunction)
        document.addEventListener('mouseexit', dragEndFunction)
    }
}

function drag(event) {
    if (!dragData) return
    event.stopPropagation()
    event.preventDefault()
    const dx = event.screenX - dragData.screenX
    const dy = event.screenY - dragData.screenY
    const left = dragData.left + dx
    const top = dragData.constraint ? Math.max(dragData.constraint.minY, dragData.top + dy) : dragData.top + dy
    this.style.left = `${left}px`
    this.style.top = `${top}px`
}

function dragEnd(event) {
    if (!dragData) return
    event.stopPropagation()
    event.preventDefault()
    document.removeEventListener('mousemove', dragData.dragFunction)
    document.removeEventListener('mouseup', dragData.dragEndFunction)
    document.removeEventListener('mouseleave', dragData.dragEndFunction)
    document.removeEventListener('mouseexit', dragData.dragEndFunction)
    dragData = undefined
}

export default makeDraggable

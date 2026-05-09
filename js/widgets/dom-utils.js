function div(options) {
    return create('div', options)
}

function create(tag, options) {
    const elem = document.createElement(tag)
    if (options) {
        if (options.class) elem.classList.add(options.class)
        if (options.id) elem.id = options.id
        if (options.style) {
            for (const key of Object.keys(options.style)) elem.style[key] = options.style[key]
        }
    }
    return elem
}

function hide(elem) {
    const cssStyle = getComputedStyle(elem)
    if (cssStyle.display !== 'none') elem._initialDisplay = cssStyle.display
    elem.style.display = 'none'
}

function show(elem, displayOverride) {
    if (getComputedStyle(elem).display === 'none') {
        elem.style.display = displayOverride || elem._initialDisplay || 'block'
    }
}

function guid() {
    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4)
}

export { create, div, hide, show, guid }

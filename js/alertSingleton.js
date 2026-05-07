// Inlined from igv-widgets/dist/igv-widgets.js. Styles are still provided by
// igv-widgets' self-injected CSS (loaded as a side effect of the factory
// imports in initializationHelper.js).

const httpMessages = {
    "401": "Access unauthorized",
    "403": "Access forbidden",
    "404": "Not found"
};

function div(options) { return create("div", options) }

function create(tag, options) {
    const elem = document.createElement(tag);
    if (options) {
        if (options.class) elem.classList.add(options.class);
        if (options.id) elem.id = options.id;
        if (options.style) {
            for (const key of Object.keys(options.style)) elem.style[key] = options.style[key];
        }
    }
    return elem;
}

function hide(elem) {
    const cssStyle = getComputedStyle(elem);
    if (cssStyle.display !== "none") elem._initialDisplay = cssStyle.display;
    elem.style.display = "none";
}

function show(elem) {
    if (getComputedStyle(elem).display === "none") {
        elem.style.display = elem._initialDisplay || "block";
    }
}

let dragData;

function makeDraggable(target, handle) {

    handle.addEventListener('mousedown', dragStart.bind(target));

    function dragStart(event) {
        event.stopPropagation();
        event.preventDefault();

        const dragFunction = drag.bind(this);
        const dragEndFunction = dragEnd.bind(this);
        const computedStyle = getComputedStyle(this);

        dragData = {
            dragFunction,
            dragEndFunction,
            screenX: event.screenX,
            screenY: event.screenY,
            top: parseInt(computedStyle.top.replace("px", "")),
            left: parseInt(computedStyle.left.replace("px", ""))
        };

        document.addEventListener('mousemove', dragFunction);
        document.addEventListener('mouseup', dragEndFunction);
        document.addEventListener('mouseleave', dragEndFunction);
        document.addEventListener('mouseexit', dragEndFunction);
    }
}

function drag(event) {
    if (!dragData) { console.error("No drag data!"); return }
    event.stopPropagation();
    event.preventDefault();
    const dx = event.screenX - dragData.screenX;
    const dy = event.screenY - dragData.screenY;
    this.style.left = `${dragData.left + dx}px`;
    this.style.top = `${dragData.top + dy}px`;
}

function dragEnd(event) {
    if (!dragData) { console.error("No drag data!"); return }
    event.stopPropagation();
    event.preventDefault();
    document.removeEventListener('mousemove', dragData.dragFunction);
    document.removeEventListener('mouseup', dragData.dragEndFunction);
    document.removeEventListener('mouseleave', dragData.dragEndFunction);
    document.removeEventListener('mouseexit', dragData.dragEndFunction);
    dragData = undefined;
}

class AlertDialog {
    constructor(parent) {
        this.container = div({class: "igv-widgets-alert-dialog-container"});
        parent.appendChild(this.container);
        this.container.setAttribute('tabIndex', '-1');

        const header = div();
        this.container.appendChild(header);

        this.errorHeadline = div();
        header.appendChild(this.errorHeadline);
        this.errorHeadline.textContent = '';

        const bodyContainer = div({id: 'igv-widgets-alert-dialog-body'});
        this.container.appendChild(bodyContainer);

        this.body = div({id: 'igv-widgets-alert-dialog-body-copy'});
        bodyContainer.appendChild(this.body);

        const okContainer = div();
        this.container.appendChild(okContainer);

        this.ok = div();
        okContainer.appendChild(this.ok);
        this.ok.textContent = 'OK';

        const okHandler = () => {
            if (typeof this.callback === 'function') {
                this.callback("OK");
                this.callback = undefined;
            }
            this.body.innerHTML = '';
            hide(this.container);
        };

        this.ok.addEventListener('click', event => {
            event.stopPropagation();
            okHandler();
        });

        this.container.addEventListener('keypress', event => {
            event.stopPropagation();
            if ('Enter' === event.key) okHandler();
        });

        makeDraggable(this.container, header);
        hide(this.container);
    }

    present(alert, callback) {
        this.errorHeadline.textContent = alert.message ? 'ERROR' : '';
        let string = alert.message || alert;
        if (httpMessages.hasOwnProperty(string)) string = httpMessages[string];
        this.body.innerHTML = string;
        this.callback = callback;
        show(this.container);
        this.container.focus();
    }
}

class AlertSingletonClass {
    init(root) { this.alertDialog = new AlertDialog(root) }
    present(alert, callback) { this.alertDialog.present(alert, callback) }
}

const AlertSingleton = new AlertSingletonClass();

export { AlertSingleton };

import { describe, it, expect, vi, beforeEach } from 'vitest'

// The catalog modals are infinite-table's; capture each one's okHandler so a test can make a selection.
const okHandlers = {}
vi.mock('infinite-table', () => ({
    GenericDataSource: class {},
    createModalTable: ({ id, okHandler }) => {
        okHandlers[ id ] = okHandler
        return { setDatasource: () => {} }
    }
}))

import configureContactMapLoaders from '../js/contactMapLoad.js'

/** A Contact or Control dropdown, which tells the loaders which kind of map the user is picking. */
function fakeDropdown(toggleId) {
    const dropdown = new EventTarget()
    dropdown.querySelector = () => ({ id: toggleId })
    return dropdown
}

/** The root the Load URL modal is appended to, handing back the modal's text input. */
function fakeRoot(urlInput) {
    const modal = { querySelector: () => urlInput }
    return { insertAdjacentHTML: () => {}, querySelector: () => modal }
}

function setup() {
    const contactDropdown = fakeDropdown('hic-contact-map-dropdown')
    const controlDropdown = fakeDropdown('hic-control-map-dropdown')
    const fileInput = Object.assign(new EventTarget(), { files: [], value: '' })
    const urlInput = Object.assign(new EventTarget(), { value: '' })
    const dropboxButton = new EventTarget()
    const loadHandler = vi.fn()

    configureContactMapLoaders({
        rootContainer: fakeRoot(urlInput),
        dropdowns: [ contactDropdown, controlDropdown ],
        localFileInputs: [ fileInput ],
        urlLoadModalId: 'url-modal',
        dataModalId: 'menu-modal',
        encodeHostedModalId: 'encode-modal',
        fourdnModalId: 'fourdn-modal',
        dropboxButtons: [ dropboxButton ],
        mapMenu: { items: 'contactMaps.json' },
        loadHandler
    })

    const show = dropdown => dropdown.dispatchEvent(new Event('show.bs.dropdown'))

    return {
        loadHandler,
        pickContact: () => show(contactDropdown),
        pickControl: () => show(controlDropdown),
        enterURL: url => {
            urlInput.value = url
            urlInput.dispatchEvent(new Event('change'))
        },
        chooseFile: file => {
            fileInput.files = [ file ]
            fileInput.dispatchEvent(new Event('change'))
        },
        chooseFromDropbox: link => {
            dropboxButton.dispatchEvent(new Event('click'))
            return Dropbox.choose.mock.calls.at(-1)[0].success([ { link } ])
        }
    }
}

beforeEach(() => {
    vi.stubGlobal('bootstrap', { Modal: { getOrCreateInstance: () => ({ hide: () => {} }) } })
    vi.stubGlobal('Dropbox', { choose: vi.fn() })
})

/**
 * juicebox.js v4.6.0 names a map itself — decoded, from its URL — whenever the host passes no name
 * (aidenlab/juicebox.js#692, #695). A bare URL tells the host nothing more, so it must not name one.
 */
describe('contact maps picked by URL', () => {

    it('are loaded unnamed from Load URL, so juicebox.js names them', () => {
        const { loadHandler, pickContact, enterURL } = setup()

        pickContact()
        enterURL('https://example.org/maps/sample%5Fa.hic')

        expect(loadHandler).toHaveBeenCalledWith('https://example.org/maps/sample%5Fa.hic', undefined, 'contact-map')
    })

    it('are loaded unnamed from Dropbox', async () => {
        const { loadHandler, pickContact, chooseFromDropbox } = setup()

        pickContact()
        await chooseFromDropbox('https://www.dropbox.com/s/abc/sample.hic?dl=0')

        expect(loadHandler).toHaveBeenCalledWith('https://www.dropbox.com/s/abc/sample.hic?dl=0', undefined, 'contact-map')
    })

    it('are loaded unnamed as a control map too', async () => {
        const { loadHandler, pickControl, enterURL, chooseFromDropbox } = setup()

        pickControl()
        enterURL('https://example.org/control.hic')
        await chooseFromDropbox('https://www.dropbox.com/s/abc/control.hic?dl=0')

        expect(loadHandler.mock.calls).toEqual([
            [ 'https://example.org/control.hic', undefined, 'control-map' ],
            [ 'https://www.dropbox.com/s/abc/control.hic?dl=0', undefined, 'control-map' ]
        ])
    })
})

/** Where the host knows better than the URL — a File, or a catalog row — it still names the map. */
describe('contact maps picked from files and catalogs', () => {

    it('are named after a local File', () => {
        const { loadHandler, pickContact, chooseFile } = setup()
        const file = new File([ '' ], 'local.hic')

        pickContact()
        chooseFile(file)

        expect(loadHandler).toHaveBeenCalledWith(file, 'local.hic', 'contact-map')
    })

    it('are named after the contact-map menu row', async () => {
        const { loadHandler, pickContact } = setup()

        pickContact()
        await okHandlers[ 'menu-modal' ]([ { url: 'https://example.org/menu.hic', name: 'Menu map' } ])

        expect(loadHandler).toHaveBeenCalledWith('https://example.org/menu.hic', 'Menu map', 'contact-map')
    })

    it('are named after the ENCODE description', async () => {
        const { loadHandler, pickControl } = setup()

        pickControl()
        await okHandlers[ 'encode-modal' ]([ { HREF: '/files/ENCFF1/@@download/ENCFF1.hic', Description: 'ENCODE map' } ])

        expect(loadHandler).toHaveBeenCalledWith('https://www.encodeproject.org/files/ENCFF1/@@download/ENCFF1.hic', 'ENCODE map', 'control-map')
    })

    it('are named after the 4DN dataset', async () => {
        const { loadHandler, pickContact } = setup()

        pickContact()
        await okHandlers[ 'fourdn-modal' ]([ { url: 'https://example.org/4dn.hic', Dataset: '4DN map' } ])

        expect(loadHandler).toHaveBeenCalledWith('https://example.org/4dn.hic', '4DN map', 'contact-map')
    })
})

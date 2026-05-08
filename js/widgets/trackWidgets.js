import { GenericDataSource, createModalTable } from '../../node_modules/infinite-table/src/index.js'
import { encodeTrackDatasourceConfigurator, supportsGenome } from './encodeTrackDatasourceConfigurator.js'
import { AlertSingleton } from '../alertSingleton.js'
import { createGenericSelectModal } from './genericSelectModal.js'
import { createTrackURLModal } from './trackURLModal.js'
import FileLoadManager from './fileLoadManager.js'
import FileLoadWidget from './fileLoadWidget.js'
import MultipleTrackFileLoad from './multipleTrackFileLoad.js'
import { configureModal } from './utils.js'

let encodeModalTables = []
let customModalTable
let genericSelectModalElement = undefined

/**
 * Vanilla-JS / Bootstrap-5 / infinite-table port of igv-widgets v1.5.4
 * createTrackWidgetsWithTrackRegistry + updateTrackMenus. Public API takes
 * plain DOM elements / IDs (no jQuery objects).
 */
function createTrackWidgetsWithTrackRegistry(igvMain,
                                             localFileInput,
                                             initializeDropbox,
                                             dropboxButton,
                                             encodeTrackModalIds,
                                             urlModalId,
                                             selectModalIdOrUndefined,
                                             trackRegistryFile,
                                             trackLoadHandler) {

    const urlModalElement = createTrackURLModal(urlModalId)
    igvMain.appendChild(urlModalElement)

    const fileLoadWidget = new FileLoadWidget({
        widgetParent: urlModalElement.querySelector('.modal-body'),
        dataTitle: 'Track',
        indexTitle: 'Index',
        mode: 'url',
        fileLoadManager: new FileLoadManager(),
        dataOnly: false,
        doURL: true
    })

    configureModal(fileLoadWidget, urlModalElement, async fileLoadWidget => {
        await multipleTrackFileLoad.loadPaths(fileLoadWidget.retrievePaths())
        return true
    })

    const multipleTrackFileLoad = new MultipleTrackFileLoad({
        localFileInput,
        initializeDropbox,
        dropboxButton,
        fileLoadHandler: trackLoadHandler,
        multipleFileSelection: true
    })

    for (const modalID of encodeTrackModalIds) {
        encodeModalTables.push(createModalTable({
            id: modalID,
            title: 'ENCODE',
            selectionStyle: 'multi',
            okHandler: trackLoadHandler
        }))
    }

    customModalTable = createModalTable({
        id: 'igv-custom-modal',
        title: 'UNTITLED',
        selectionStyle: 'multi',
        okHandler: trackLoadHandler
    })

    if (selectModalIdOrUndefined) {
        const selectModalHTML = createGenericSelectModal(selectModalIdOrUndefined, `${selectModalIdOrUndefined}-select`)
        const fragment = document.createRange().createContextualFragment(selectModalHTML)
        genericSelectModalElement = fragment.firstChild
        igvMain.appendChild(genericSelectModalElement)

        const select = genericSelectModalElement.querySelector('select')
        const okButton = genericSelectModalElement.querySelector('.modal-footer button:nth-child(2)')

        const okHandler = () => {
            const configurations = []
            const selectedOptions = select.querySelectorAll('option:checked')
            for (const option of selectedOptions) {
                if (option._track) configurations.push(option._track)
                option.removeAttribute('selected')
            }
            if (configurations.length > 0) trackLoadHandler(configurations)
            bootstrap.Modal.getInstance(genericSelectModalElement).hide()
        }

        okButton.addEventListener('click', okHandler)

        genericSelectModalElement.addEventListener('keypress', event => {
            if ('Enter' === event.key) okHandler()
        })
    }
}

async function updateTrackMenus(genomeID, GtexUtilsOrUndefined, trackRegistryFile, dropdownMenu) {

    const id_prefix = 'genome_specific_'

    const divider = dropdownMenu.querySelector('.dropdown-divider')

    // Remove previously inserted genome-specific items
    dropdownMenu.querySelectorAll(`[id^=${id_prefix}]`).forEach(el => el.remove())

    const paths = await getPathsWithTrackRegistryFile(genomeID, trackRegistryFile)
    if (undefined === paths) {
        console.warn(`There are no tracks in the track registry for genome ${genomeID}`)
        return
    }

    let responses = []
    try {
        responses = await Promise.all(paths.map(path => fetch(path)))
    } catch (e) {
        AlertSingleton.present(e.message)
    }

    let jsons = []
    try {
        jsons = await Promise.all(responses.map(r => r.json()))
    } catch (e) {
        AlertSingleton.present(e.message)
    }

    const buttonConfigurations = []

    for (const json of jsons) {
        if (true === supportsGenome(genomeID) && 'ENCODE' === json.type) {
            encodeModalTables[0].setDatasource(new GenericDataSource(encodeTrackDatasourceConfigurator(genomeID, 'signals-chip')))
            encodeModalTables[1].setDatasource(new GenericDataSource(encodeTrackDatasourceConfigurator(genomeID, 'signals-other')))
            encodeModalTables[2].setDatasource(new GenericDataSource(encodeTrackDatasourceConfigurator(genomeID, 'other')))
        } else if (GtexUtilsOrUndefined && 'GTEX' === json.type) {
            let info
            try {
                info = await GtexUtilsOrUndefined.getTissueInfo(json.datasetId)
            } catch (e) {
                AlertSingleton.present(e.message)
            }
            if (info) {
                json.tracks = info.tissueInfo.map(tissue => GtexUtilsOrUndefined.trackConfiguration(tissue))
            }
        }
        buttonConfigurations.push(json)
    }

    for (const buttonConfiguration of buttonConfigurations.reverse()) {

        if (buttonConfiguration.type && 'custom-data-modal' === buttonConfiguration.type) {

            if (buttonConfiguration.description) customModalTable.setDescription(buttonConfiguration.description)

            createDropdownButton(divider, buttonConfiguration.label, id_prefix)
                .addEventListener('click', () => {
                    customModalTable.setDatasource(new GenericDataSource(buttonConfiguration))
                    customModalTable.setTitle(buttonConfiguration.label)
                    customModalTable.modal.show()
                })

        } else if (buttonConfiguration.type && 'ENCODE' === buttonConfiguration.type) {

            if (true === supportsGenome(genomeID)) {

                if (buttonConfiguration.description) {
                    encodeModalTables[0].setDescription(buttonConfiguration.description)
                    encodeModalTables[1].setDescription(buttonConfiguration.description)
                    encodeModalTables[2].setDescription(buttonConfiguration.description)
                }

                createDropdownButton(divider, 'ENCODE Other', id_prefix)
                    .addEventListener('click', () => encodeModalTables[2].modal.show())

                createDropdownButton(divider, 'ENCODE Signals - Other', id_prefix)
                    .addEventListener('click', () => encodeModalTables[1].modal.show())

                createDropdownButton(divider, 'ENCODE Signals - ChIP', id_prefix)
                    .addEventListener('click', () => encodeModalTables[0].modal.show())
            }

        } else if (genericSelectModalElement) {

            createDropdownButton(divider, buttonConfiguration.label, id_prefix)
                .addEventListener('click', () => {
                    configureSelectModal(genericSelectModalElement, buttonConfiguration)
                    bootstrap.Modal.getOrCreateInstance(genericSelectModalElement).show()
                })
        }
    }
}

function createDropdownButton(divider, buttonText, id_prefix) {
    const button = document.createElement('button')
    button.className = 'dropdown-item'
    button.type = 'button'
    button.textContent = `${buttonText} ...`
    button.id = `${id_prefix}${buttonText.toLowerCase().split(' ').join('_')}`
    divider.insertAdjacentElement('afterend', button)
    return button
}

function configureSelectModal(modalElement, buttonConfiguration) {

    modalElement.querySelector('.modal-title').textContent = buttonConfiguration.label

    const select = modalElement.querySelector('select')
    while (select.firstChild) select.removeChild(select.firstChild)

    for (const configuration of buttonConfiguration.tracks) {
        const option = document.createElement('option')
        option.value = configuration.name
        option.textContent = configuration.name
        option._track = configuration
        select.appendChild(option)
    }

    if (buttonConfiguration.description) {
        modalElement.querySelector('#igv-widgets-generic-select-modal-footnotes').innerHTML = buttonConfiguration.description
    }
}

async function getPathsWithTrackRegistryFile(genomeID, trackRegistryFile) {

    let response
    try {
        response = await fetch(trackRegistryFile)
    } catch (e) {
        console.error(e)
    }

    if (!response) {
        const e = new Error('Error retrieving registry via getPathsWithTrackRegistryFile()')
        AlertSingleton.present(e.message)
        throw e
    }

    const trackRegistry = await response.json()
    return trackRegistry[genomeID]
}

export { createTrackWidgetsWithTrackRegistry, updateTrackMenus }

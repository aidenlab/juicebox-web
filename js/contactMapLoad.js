import GenericDataSource from "../node_modules/data-modal/src/genericDataSource.js";
import ModalTable from "../node_modules/data-modal/src/modalTable.js";

import {aidenLabContactMapDatasourceConfigurator} from './aidenLabContactMapDatasourceConfig.js'
import {encodeContactMapDatasourceConfiguration} from './encodeContactMapDatasourceConfig.js'
import { fourdnContactMapDatasourceConfiguration } from './fourdnContactMapDatasourceConfig.js';

let mapType = undefined;
let contactMapModal;
let encodeHostedContactMapModal;
let fourdnContactMapModal;

function configureContactMapLoaders({
                                        rootContainer,
                                        dropdowns,
                                        localFileInputs,
                                        urlLoadModalId,
                                        dataModalId,
                                        encodeHostedModalId,
                                        fourdnModalId,
                                        dropboxButtons,
                                        mapMenu,
                                        loadHandler
                                    }) {

    // Bootstrap 4 dispatches `*.bs.*` events through jQuery only — native
    // addEventListener will not catch them. Documented seam.
    dropdowns.forEach(dropdown => {
        $(dropdown).on('show.bs.dropdown', function () {
            // Contact or Control dropdown button
            const child = this.querySelector('.dropdown-toggle');
            const id = child.id;

            // transient — set every time this callback fires
            mapType = 'hic-contact-map-dropdown' === id ? 'contact-map' : 'control-map';
        });
    });

    localFileInputs.forEach(input => {
        input.addEventListener('change', async function (e) {
            const target = e.currentTarget;
            const file = target.files[0];
            target.value = "";

            const {name} = file;
            await loadHandler(file, name, mapType);
        });
    });

    dropboxButtons.forEach(button => {
        button.addEventListener('click', function () {
            const config =
                {
                    success: async dbFiles => {
                        const paths = dbFiles.map(dbFile => dbFile.link);
                        const path = paths[0];
                        const name = getFilename(path);
                        await loadHandler(path, name, mapType);
                    },
                    cancel: () => {
                    },
                    linkType: 'preview',
                    multiselect: false,
                    folderselect: false,
                };

            Dropbox.choose(config);
        });
    });

    appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, path => {
        const name = getFilename(path);
        loadHandler(path, name, mapType);
    });

    if (mapMenu) {

        const modalTableConfig =
            {
                id: dataModalId,
                title: 'Contact Map',
                selectionStyle: 'single',
                pageLength: 10,
                okHandler: async ([selection]) => {
                    const {url, name} = selection
                    await loadHandler(url, name, mapType)
                }
            }
        contactMapModal = new ModalTable(modalTableConfig)

        const path =  mapMenu.items
        const config = aidenLabContactMapDatasourceConfigurator(path)
        const datasource = new GenericDataSource(config)
        contactMapModal.setDatasource(datasource)
    }

    const encodeModalTableConfig =
        {
            id: encodeHostedModalId,
            title: 'ENCODE Hosted Contact Map',
            selectionStyle: 'single',
            pageLength: 10,
            okHandler: async ([{ HREF, Description }]) => {
                const urlPrefix = 'https://www.encodeproject.org'
                const path = `${urlPrefix}${HREF}`
                await loadHandler(path, Description, mapType)
            }
        }

    encodeHostedContactMapModal = new ModalTable(encodeModalTableConfig)
    encodeHostedContactMapModal.setDatasource( new GenericDataSource(encodeContactMapDatasourceConfiguration) )


    const fourdnModalTableConfig =
        {
            id: fourdnModalId,
            title: '4DN Hosted Contact Map',
            selectionStyle: 'single',
            pageLength: 10,
            okHandler: async ([ item ]) => {
                const { url, Dataset } = item
                await loadHandler(url, Dataset, mapType)
            }
        }

    fourdnContactMapModal = new ModalTable(fourdnModalTableConfig)
    fourdnContactMapModal.setDatasource( new GenericDataSource(fourdnContactMapDatasourceConfiguration) )

}


function appendAndConfigureLoadURLModal(root, id, input_handler) {

    const html =
        `<div id="${id}" class="modal fade">
            <div class="modal-dialog  modal-lg">
                <div class="modal-content">

                <div class="modal-header">
                    <div class="modal-title">Load URL</div>

                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>

                </div>

                <div class="modal-body">

                    <div class="form-group">
                        <input type="text" class="form-control" placeholder="Enter URL">
                    </div>

                </div>

                </div>
            </div>
        </div>`;

    root.insertAdjacentHTML('beforeend', html);

    const modal = root.querySelector(`#${id}`);
    const input = modal.querySelector('input');
    input.addEventListener('change', function (e) {
        const target = e.currentTarget;
        const path = target.value;
        target.value = "";

        // BS4 modal control is jQuery-only — documented seam
        $(`#${id}`).modal('hide');

        input_handler(path);
    });

    return html;
}

function getFilename(url) {
    let i = url.lastIndexOf('/')
    let name = i < 0 ? url : url.substring(i + 1)
    i = name.indexOf('?')
    return i > 0 ? name.substring(0, i) : name
}

export default configureContactMapLoaders

import GenericDataSource from "../node_modules/data-modal/src/genericDataSource.js";
import ModalTable from "../node_modules/data-modal/src/modalTable.js";

import * as FileUtils from '../node_modules/igv-utils/src/fileUtils.js'
import {aidenLabContactMapDatasourceConfigurator} from './aidenLabContactMapDatasourceConfig.js'
import {encodeContactMapDatasourceConfiguration} from './encodeContactMapDatasourceConfig.js'
import { fourdnContactMapDatasourceConfiguration } from './fourdnContactMapDatasourceConfig.js';

let mapType = undefined;
let contactMapModal;
let encodeHostedContactMapModal;
let fourdnContactMapModal;

function configureContactMapLoaders({
                                        rootContainer,
                                        $dropdowns,
                                        $localFileInputs,
                                        urlLoadModalId,
                                        dataModalId,
                                        encodeHostedModalId,
                                        fourdnModalId,
                                        $dropboxButtons,
                                        mapMenu,
                                        loadHandler
                                    }) {

    $dropdowns.on('show.bs.dropdown', function () {

        // Contact or Control dropdown button
        // NOTE:  this in the callback is a DOM element, jquery weirdness
        const $child = $(this).children('.dropdown-toggle');

        // button id
        const id = $child.attr('id');

        // Set map type based on dropdown selected, this is a transient variable, set every time this callback
        // is invoked.
        mapType = 'hic-contact-map-dropdown' === id ? 'contact-map' : 'control-map';

    });

    $localFileInputs.on('change', async function (e) {
        const file = ($(this).get(0).files)[0];

        // NOTE:  this in the callback is a DOM element, jquery weirdness
        $(this).val("");

        const {name} = file;
        await loadHandler(file, name, mapType);
    });

    $dropboxButtons.on('click', function () {

        const config =
            {
                success: async dbFiles => {
                    const paths = dbFiles.map(dbFile => dbFile.link);
                    const path = paths[0];
                    const name = FileUtils.getFilename(path);
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

    appendAndConfigureLoadURLModal(rootContainer, urlLoadModalId, path => {
        const name = FileUtils.getFilename(path);
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

    $(root).append(html);

    const $modal = $(root).find(`#${id}`);
    $modal.find('input').on('change', function () {

        const path = $(this).val();
        $(this).val("");

        $(`#${id}`).modal('hide');

        input_handler(path);


    });

    return html;
}

export default configureContactMapLoaders

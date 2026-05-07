import {loadString} from "./stringLoader.js"
import * as StringUtils from '../node_modules/igv-utils/src/stringUtils.js'


import {
    AlertSingleton,
    createSessionWidgets,
    createTrackWidgetsWithTrackRegistry,
    updateTrackMenus,
    dropboxButtonImageBase64,
    dropboxDropdownItem,
    googleDriveButtonImageBase64,
    googleDriveDropdownItem
} from '../node_modules/igv-widgets/dist/igv-widgets.js'

import hic from "../node_modules/juicebox.js/dist/juicebox.esm.js"
import QRCode from "./qrcode.js";
import configureContactMapLoaders from "./contactMapLoad.js";
import {tinyURLShortener} from "./urlShortener.js";

let currentGenomeId
let genomeDerivedTrackConfigurations
let shortenURL

function initializationHelper(container, config) {

    shortenURL = tinyURLShortener(config.urlShortener || {})

    configureSequenceAndRefSeqGeneTrackToggle()

    // TODO(jquery-purge): jQuery wrapper retained for igv-widgets seam below
    const $trackDropdownMenu = $('#hic-track-dropdown-menu')

    createAppCloneButton(container)

    updateControlMapDropdownForAllBrowser()

    configureSessionWidgets(container, config.googleEnabled)

    const str = 'track'
    let imgElement

    imgElement = document.querySelector(`img#igv-app-${str}-dropbox-button-image`)
    imgElement.src = `data:image/svg+xml;base64,${dropboxButtonImageBase64()}`

    imgElement = document.querySelector(`img#igv-app-${str}-google-drive-button-image`)
    imgElement.src = `data:image/svg+xml;base64,${googleDriveButtonImageBase64()}`

    const initializeDropbox = async () => Promise.resolve(true)

    // TODO(jquery-purge): igv-widgets factory requires jQuery objects as args
    createTrackWidgetsWithTrackRegistry($(container),
        $trackDropdownMenu,
        $('#hic-local-track-file-input'),
        initializeDropbox,
        $('#hic-track-dropdown-dropbox-button'),
        config.googleEnabled,
        $('#hic-track-dropdown-google-drive-button'),
        ['hic-app-encode-signals-chip-modal', 'hic-app-encode-signals-other-modal', 'hic-app-encode-others-modal'],
        'track-load-url-modal',
        undefined,
        undefined,
        config.trackRegistryFile,
        configurations => loadTracks(configurations))

    createAnnotationDatalistModals(container);

    const dropdowns = Array.from(document.querySelectorAll('a[id$=-map-dropdown]')).map(a => a.parentElement)
    const queryAllWithin = (elements, selector) => elements.flatMap(el => Array.from(el.querySelectorAll(selector)))

    const contactMapLoadConfig =
        {
            rootContainer: document.querySelector('#hic-main'),
            dropdowns,
            localFileInputs: queryAllWithin(dropdowns, 'input'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            fourdnModalId: 'hic-4dn-contact-map-modal',
            dropboxButtons: queryAllWithin(dropdowns, 'div[id$="-map-dropdown-dropbox-button"]'),
            googleDriveButtons: queryAllWithin(dropdowns, 'div[id$="-map-dropdown-google-drive-button"]'),
            googleEnabled: config.googleEnabled,
            mapMenu: config.mapMenu,
            loadHandler: (path, name, mapType) => loadHicFile(path, name, mapType)
        };

    configureContactMapLoaders(contactMapLoadConfig);
    document.querySelector('#hic-encode-hosted-contact-map-presentation-button').classList.remove('disabled')

    configureShareModal(container, config)

    // BS4 `*.bs.*` events are jQuery-only — documented seam
    $trackDropdownMenu.parent().on('shown.bs.dropdown', function () {
        const browser = hic.getCurrentBrowser();
        if (undefined === browser || undefined === browser.dataset) {
            AlertSingleton.present('Contact map must be loaded and selected before loading tracks');
        }
    });

    // BS4 event seam
    $('#hic-control-map-dropdown-menu').parent().on('shown.bs.dropdown', function () {
        const browser = hic.getCurrentBrowser();
        if (undefined === browser || undefined === browser.dataset) {
            AlertSingleton.present('Contact map must be loaded and selected before loading "B" map"');
        }
    });

    const genomeChangeListener = async ({ data }) => {

        if (currentGenomeId !== data) {

            currentGenomeId = data

            if (config.genome) {
                const response = await fetch(config.genome)
                const list = await response.json()
                genomeDerivedTrackConfigurations = createGenomeDerivedTrackConfigurations(currentGenomeId, list)
            }

            if (config.trackMenu) {
                let tracksURL = config.trackMenu.items.replace("$GENOME_ID", data);
                await loadAnnotationDatalist(document.getElementById(config.trackMenu.id), tracksURL, "1D");
            }

            if (config.trackMenu2D) {
                let annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", data);
                await loadAnnotationDatalist(document.getElementById(config.trackMenu2D.id), annotations2dURL, "2D");
            }

            const response = await fetch(config.trackRegistryFile)
            const hash = await response.json()

            // TODO(jquery-purge): igv-widgets `updateTrackMenus` requires jQuery object
            const $dropdownMenu = $('#hic-track-dropdown-menu')

            if (hash[ data ]) {
                updateTrackMenus(data, undefined, config.trackRegistryFile, $dropdownMenu)
            }


        }
    }

    hic.EventBus.globalBus.subscribe("GenomeChange", genomeChangeListener)

    hic.EventBus.globalBus.subscribe("BrowserSelect", event => updateControlMapDropdown(event.data))
}

function createGenomeDerivedTrackConfigurations(currentGenomeId, list) {

    const genomeSpecific = list.filter(({ id }) => currentGenomeId === id)

    const [ result ] =  genomeSpecific.map(({ fastaURL, indexURL, tracks }) => {

        return {
                sequence:
                    {
                        url:fastaURL,
                        indexURL
                    },
                annotations: tracks

            }

    })

    return result
}

let sequenceTrackXYPair
let refSeqGenesTrackXYPair
function configureSequenceAndRefSeqGeneTrackToggle() {

    const sequenceTrackCheckbox = document.querySelector('#hic-sequence-track-checkbox')

    sequenceTrackCheckbox.addEventListener('change', async e => {

        const browser = hic.getCurrentBrowser()

        if(e.target.checked){
            const { sequence } = genomeDerivedTrackConfigurations
            const config = Object.assign({ removable: false }, sequence)
            await browser.loadTracks([ config ])

        } else {
            browser.layoutController.removeTrackXYPair(sequenceTrackXYPair)
        }

    })

    const refSeqGenesTrackCheckbox = document.querySelector('#hic-ref-seq-genes-track-checkbox')

    refSeqGenesTrackCheckbox.addEventListener('change', async e => {

        const browser = hic.getCurrentBrowser()

        if(e.target.checked){

            const { annotations } = genomeDerivedTrackConfigurations

            if (annotations && annotations.length > 0) {
                const config = Object.assign({ removable: false }, annotations[ 0 ])
                await browser.loadTracks([ config ])
            }
        } else {
            browser.layoutController.removeTrackXYPair(refSeqGenesTrackXYPair)
        }

    })

    const trackXYPairLoadListener = ({ data }) => {

        console.log(`did load trackXYPair with track(${ data.track.name })`)

        if ('refgene' === data.track.config.format) {
            refSeqGenesTrackCheckbox.disabled = ''
            refSeqGenesTrackCheckbox.checked = true
            refSeqGenesTrackXYPair = data
        } else if ('sequence' === data.track.config.format) {
            sequenceTrackCheckbox.disabled = ''
            sequenceTrackCheckbox.checked = true
            sequenceTrackXYPair = data
        }

    }

    hic.EventBus.globalBus.subscribe("TrackXYPairLoad", trackXYPairLoadListener)

    const trackXYPairRemovalListener = ({ data }) => {

        console.log(`did remove trackXYPair with track(${ data.track.name })`)

        if ('refgene' === data.track.config.format) {
            refSeqGenesTrackCheckbox.disabled = ''
            refSeqGenesTrackCheckbox.checked = false
            refSeqGenesTrackXYPair = undefined
        } else if ('sequence' === data.track.config.format) {
            sequenceTrackCheckbox.disabled = ''
            sequenceTrackCheckbox.checked = false
            sequenceTrackXYPair = undefined
        }

    }

    hic.EventBus.globalBus.subscribe("TrackXYPairRemoval", trackXYPairRemovalListener)

    const genomeChangeListener = ({ data }) => {

        sequenceTrackCheckbox.disabled = ''
        refSeqGenesTrackCheckbox.disabled = ''

        sequenceTrackCheckbox.checked = false
        refSeqGenesTrackCheckbox.checked = false

    }

    hic.EventBus.globalBus.subscribe("GenomeChange", genomeChangeListener)

}

function createAnnotationDatalistModals(root) {

    let modal;

    // Annotation Datalist Modal
    root.insertAdjacentHTML('beforeend', createGenericDataListModal('hic-annotation-datalist-modal', 'annotation-input', 'annotation-datalist', 'Enter annotation file name'));

    modal = root.querySelector('#hic-annotation-datalist-modal');
    modal.querySelector('.modal-title').textContent = 'Annotations';

    const annotation_input = document.querySelector('#annotation-input');
    annotation_input.addEventListener('change', function () {

        if (undefined === hic.getCurrentBrowser()) {
            AlertSingleton.present('ERROR: you must select a map panel.');
        } else {

            const name = annotation_input.value;
            const option = Array.from(document.querySelectorAll('#annotation-datalist option'))
                .find(o => o.textContent.trim() === name);
            const path = option ? option.dataset.url : undefined;

            let config = {url: path, name};

            if (path && path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
                config.indexed = false
            }
            loadTracks([config]);
        }

        // BS4 modal API seam
        $('#hic-annotation-datalist-modal').modal('hide');
        annotation_input.value = '';

    });

    // 2D Annotation Datalist Modal
    root.insertAdjacentHTML('beforeend', createGenericDataListModal('hic-annotation-2D-datalist-modal', 'annotation-2D-input', 'annotation-2D-datalist', 'Enter 2D annotation file name'));

    modal = root.querySelector('#hic-annotation-2D-datalist-modal');
    modal.querySelector('.modal-title').textContent = '2D Annotations';

    const annotation_2D_input = document.querySelector('#annotation-2D-input');
    annotation_2D_input.addEventListener('change', function () {

        if (undefined === hic.getCurrentBrowser()) {
            AlertSingleton.present('ERROR: you must select a map panel.');
        } else {
            const name = annotation_2D_input.value;
            const option = Array.from(document.querySelectorAll('#annotation-2D-datalist option'))
                .find(o => o.textContent.trim() === name);
            const path = option ? option.dataset.url : undefined;
            loadTracks([{url: path, name}]);
        }

        // BS4 modal API seam
        $('#hic-annotation-2D-datalist-modal').modal('hide');
        annotation_2D_input.value = '';
    });

}

function createGenericDataListModal(id, input_id, datalist_id, placeholder) {

    const generic_select_modal_string =
        `<div id="${id}" class="modal">

            <div class="modal-dialog modal-lg">

                <div class="modal-content">

                    <div class="modal-header">
                        <div class="modal-title"></div>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <input type="text" id="${input_id}" list="${datalist_id}" placeholder="${placeholder}" class="form-control">
                            <datalist id="${datalist_id}"></datalist>
                        </div>
                    </div>

                </div>

            </div>

        </div>`;

    return generic_select_modal_string;
}

function loadTracks(tracks) {
    // Set some juicebox specific defaults
    for (let t of tracks) {
        t.autoscale = true;
        t.displayMode = "COLLAPSED"
    }
    hic.getCurrentBrowser().loadTracks(tracks);
}

async function loadHicFile(url, name, mapType) {

    try {
        const isControl = ('control-map' === mapType)
        const config =
            {
                url,
                name,
                isControl
            };

        const browser = hic.getCurrentBrowser()
        if (isControl) {
            await browser.loadHicControlFile(config)
        } else {
            browser.reset();
            await browser.loadHicFile(config);
            document.querySelector('#hic-control-map-dropdown').classList.remove('disabled');
        }
    } catch (e) {
        AlertSingleton.present(`Error loading ${url}: ${e}`);
    }
}

async function loadAnnotationDatalist(datalist, url, type) {

    datalist.replaceChildren();

    let data = undefined;

    try {
        data = await loadString(url);
    } catch (e) {
        if (404 === e) {
            //  This is an expected condition, not all assemblies have track menus
            console.warn(`No track menu found ${url}`)
            return
        } else {
            console.log(`Error loading track menu: ${url} ${e}`);
            AlertSingleton.present(`Error loading track menu: ${url} ${e}`);
        }
    }

    let lines = data ? StringUtils.splitLines(data) : []
    if (lines.length > 0) {

        for (let line of lines) {

            if ('' !== line) {
                const tokens = line.split('\t');

                if (tokens.length > 1) {
                    const [label, value] = tokens;
                    datalist.insertAdjacentHTML('beforeend', `<option data-url="${value}">${label}</option>`);

                }
            }

        }
    }

}

function createAppCloneButton(container) {

    document.querySelector('#juicebox-app-clone-button').addEventListener('click', async () => {

        let browser
        try {
            const { width, height } = hic.getCurrentBrowser().config
            browser = await hic.createBrowser(container, { width, height });
        } catch (e) {
            console.error(e);
        }

        if (browser) {
            hic.setCurrentBrowser(browser)
        }
    })

}

function configureSessionWidgets(container, googleEnabled) {

    document.querySelector('div#igv-session-dropdown-menu > :nth-child(1)')
        .insertAdjacentHTML('afterend', dropboxDropdownItem('igv-app-dropdown-dropbox-session-file-button'))
    document.querySelector('div#igv-session-dropdown-menu > :nth-child(2)')
        .insertAdjacentHTML('afterend', googleDriveDropdownItem('igv-app-dropdown-google-drive-session-file-button'))

    // TODO(jquery-purge): igv-widgets factory requires jQuery container
    createSessionWidgets($(container),
        'juicebox-webapp',
        'igv-app-dropdown-local-session-file-input',
        () => Promise.resolve(true),
        'igv-app-dropdown-dropbox-session-file-button',
        'igv-app-dropdown-google-drive-session-file-button',
        'igv-app-session-url-modal',
        'igv-app-session-save-modal',
        /*googleEnabled*/false,
        async config => await hic.restoreSession(container, config),
        () => hic.toJSON()
    )

}

let qrcode = undefined;


function configureShareModal(container, config) {

    const shareUrlModal = document.querySelector('#hic-share-url-modal');

    // BS4 `*.bs.*` events are jQuery-only — documented seam
    $(shareUrlModal).on('show.bs.modal', async function () {

        let href = String(window.location.href);

        // We assume we have only juicebox parameters.
        // Strip href of current parameters, if any
        let idx = href.indexOf("?");
        if (idx > 0) href = href.substring(0, idx);

        const jbUrl = await shortJuiceboxURL(href);

        const embedSnippet = await getEmbeddableSnippet(container, config);
        const embedInput = document.querySelector('#hic-embed');
        embedInput.value = embedSnippet;
        embedInput.select();

        let shareUrl = jbUrl;

        // Shorten second time
        // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

        const shareUrlInput = document.querySelector('#hic-share-url');
        shareUrlInput.value = shareUrl;
        shareUrlInput.select();

        document.querySelector('#emailButton').setAttribute('href', 'mailto:?body=' + shareUrl);

        if (qrcode) {
            qrcode.clear();
            document.querySelector('#hic-qr-code-image').replaceChildren();
        } else {
            qrcode = new QRCode(document.getElementById("hic-qr-code-image"), {
                width: 128,
                height: 128,
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        qrcode.makeCode(shareUrl);

    });

    // BS4 event seam
    $(shareUrlModal).on('hidden.bs.modal', function () {
        document.querySelector('#hic-embed-container').style.display = 'none';
        document.querySelector('#hic-qr-code-image').style.display = 'none';
    });

    document.querySelector('#hic-qr-code-button').addEventListener('click', function () {
        document.querySelector('#hic-embed-container').style.display = 'none';
        toggle(document.querySelector('#hic-qr-code-image'));
    });

    document.querySelector('#hic-embed-button').addEventListener('click', function () {
        document.querySelector('#hic-qr-code-image').style.display = 'none';
        toggle(document.querySelector('#hic-embed-container'));
    });

    document.querySelector('#hic-copy-link').addEventListener('click', function () {
        document.querySelector('#hic-share-url').select();
        const success = document.execCommand('copy');
        if (success) {
            // BS4 modal API seam
            $('#hic-share-url-modal').modal('hide');
        } else {
            alert("Copy not successful");
        }
    });

    document.querySelector('#hic-embed-copy-link').addEventListener('click', function () {
        document.querySelector('#hic-embed').select();
        const success = document.execCommand('copy');
        if (success) {
            // BS4 modal API seam
            $('#hic-share-url-modal').modal('hide');
        } else {
            alert("Copy not successful");
        }
    });
}

// Matches jQuery's .toggle() semantics: reads computed display, then sets
// inline style to '' (revert to CSS) or 'none'.
function toggle(el) {
    const hidden = window.getComputedStyle(el).display === 'none';
    el.style.display = hidden ? '' : 'none';
}

async function getEmbeddableSnippet(container, config) {
    const base = (config.embedTarget || getEmbedTarget())
    const embedUrl = await shortJuiceboxURL(base);
    const height = container.getBoundingClientRect().height;
    return '<iframe src="' + embedUrl + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>';
}

/**
 * Get the default embed html target.  Assumes an "embed.html" file in same directory as this page
 */
function getEmbedTarget() {

    var href, idx;
    href = new String(window.location.href);

    idx = href.indexOf("?");
    if (idx > 0) href = href.substring(0, idx);

    idx = href.lastIndexOf("/");
    return href.substring(0, idx) + "/embed.html"

}

function updateControlMapDropdownForAllBrowser() {
    const browsers = hic.getAllBrowsers();
    for (let browser of browsers) {
        browser.eventBus.subscribe("MapLoad", checkControlMapDropdown);
        updateControlMapDropdown(browser);
    }

}

function checkControlMapDropdown() {
    updateControlMapDropdown(hic.getCurrentBrowser());
}

function updateControlMapDropdown(browser) {
    if (browser && browser.dataset) {
        document.querySelector('#hic-control-map-dropdown').classList.remove('disabled')
    }
}

/**
 * Shorten the juicebox URL
 *
 * @param base The base URL
 * @returns {Promise<string>}
 */
async function shortJuiceboxURL(base) {
    const url = `${base}?${hic.compressedSession()}`;
    return shortenURL(url);
}

export { initializationHelper }

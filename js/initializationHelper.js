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
} from 'igv-widgets/dist/igv-widgets.js'

import hic from "juicebox.js/dist/juicebox.esm.js"
import QRCode from "./qrcode.js";
import configureContactMapLoaders from "./contactMapLoad.js";

let currentGenomeId
let genomeDerivedTrackConfigurations

function initializationHelper(container, config) {

    configureSequenceAndRefSeqGeneTrackToggle()

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

    const $dropdowns = $('a[id$=-map-dropdown]').parent()

    const contactMapLoadConfig =
        {
            rootContainer: document.querySelector('#hic-main'),
            $dropdowns,
            $localFileInputs: $dropdowns.find('input'),
            urlLoadModalId: 'hic-load-url-modal',
            dataModalId: 'hic-contact-map-modal',
            encodeHostedModalId: 'hic-encode-hosted-contact-map-modal',
            fourdnModalId: 'hic-4dn-contact-map-modal',
            $dropboxButtons: $dropdowns.find('div[id$="-map-dropdown-dropbox-button"]'),
            $googleDriveButtons: $dropdowns.find('div[id$="-map-dropdown-google-drive-button"]'),
            googleEnabled: config.googleEnabled,
            mapMenu: config.mapMenu,
            loadHandler: (path, name, mapType) => loadHicFile(path, name, mapType)
        };

    configureContactMapLoaders(contactMapLoadConfig);
    $('#hic-encode-hosted-contact-map-presentation-button').removeClass('disabled')

    configureShareModal(container, config)

    $trackDropdownMenu.parent().on('shown.bs.dropdown', function () {
        const browser = hic.getCurrentBrowser();
        if (undefined === browser || undefined === browser.dataset) {
            AlertSingleton.present('Contact map must be loaded and selected before loading tracks');
        }
    });

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
                await loadAnnotationDatalist($(`#${config.trackMenu.id}`), tracksURL, "1D");
            }

            if (config.trackMenu2D) {
                let annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", data);
                await loadAnnotationDatalist($(`#${config.trackMenu2D.id}`), annotations2dURL, "2D");
            }

            const response = await fetch(config.trackRegistryFile)
            const hash = await response.json()

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
    $(root).append(createGenericDataListModal('hic-annotation-datalist-modal', 'annotation-input', 'annotation-datalist', 'Enter annotation file name'));

    modal = root.querySelector('#hic-annotation-datalist-modal');
    modal.querySelector('.modal-title').textContent = 'Annotations';

    const $annotation_input = $('#annotation-input');
    $annotation_input.on('change', function (e) {

        if (undefined === hic.getCurrentBrowser()) {
            AlertSingleton.present('ERROR: you must select a map panel.');
        } else {

            const name = $annotation_input.val();
            const $option = $('#annotation-datalist option').filter(function () {
                const str = $(this).text().trim();
                return /*str.includes(name)*/str === name;
            });
            const path = $option.data('url');

            let config = {url: path, name};

            if (path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
                config.indexed = false
            }
            loadTracks([config]);
        }

        $('#hic-annotation-datalist-modal').modal('hide');
        $annotation_input.val('');

    });

    // 2D Annotation Datalist Modal
    $(root).append(createGenericDataListModal('hic-annotation-2D-datalist-modal', 'annotation-2D-input', 'annotation-2D-datalist', 'Enter 2D annotation file name'));

    modal = root.querySelector('#hic-annotation-2D-datalist-modal');
    modal.querySelector('.modal-title').textContent = '2D Annotations';

    const $annotation_2D_input = $('#annotation-2D-input');
    $annotation_2D_input.on('change', function (e) {

        if (undefined === hic.getCurrentBrowser()) {
            AlertSingleton.present('ERROR: you must select a map panel.');
        } else {
            const name = $annotation_2D_input.val();
            const $option = $('#annotation-2D-datalist option').filter(function () {
                const str = $(this).text().trim();
                return /*str.includes(name)*/str === name;
            });
            const path = $option.data('url');
            loadTracks([{url: path, name}]);
        }

        $('#hic-annotation-2D-datalist-modal').modal('hide');
        $annotation_2D_input.val('');
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
            $('#hic-control-map-dropdown').removeClass('disabled');
        }
    } catch (e) {
        AlertSingleton.present(`Error loading ${url}: ${e}`);
    }
}

async function loadAnnotationDatalist($datalist, url, type) {

    $datalist.empty();

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
                    $datalist.append($(`<option data-url="${value}">${label}</option>`));

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

    $('div#igv-session-dropdown-menu > :nth-child(1)').after(dropboxDropdownItem('igv-app-dropdown-dropbox-session-file-button'))
    $('div#igv-session-dropdown-menu > :nth-child(2)').after(googleDriveDropdownItem('igv-app-dropdown-google-drive-session-file-button'))

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

    const $hic_share_url_modal = $('#hic-share-url-modal');

    $hic_share_url_modal.on('show.bs.modal', async function (e) {

        let href = String(window.location.href);

        // We assume we have only juicebox parameters.
        // Strip href of current parameters, if any
        let idx = href.indexOf("?");
        if (idx > 0) href = href.substring(0, idx);

        const jbUrl = await shortJuiceboxURL(href);

        const embedSnippet = await getEmbeddableSnippet($(container), config);
        const $hic_embed_url = $('#hic-embed');
        $hic_embed_url.val(embedSnippet);
        $hic_embed_url.get(0).select();

        let shareUrl = jbUrl;

        // Shorten second time
        // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

        const $hic_share_url = $('#hic-share-url');
        $hic_share_url.val(shareUrl);
        $hic_share_url.get(0).select();

        const tweetContainer = $('#tweetButtonContainer');
        tweetContainer.empty();

        $('#emailButton').attr('href', 'mailto:?body=' + shareUrl);

        if (shareUrl.length < 100) {

            await window.twttr.widgets.createShareButton(shareUrl, tweetContainer.get(0), {text: 'Contact map: '});
            console.log("Tweet button updated");

            // QR code generation
            if (qrcode) {
                qrcode.clear();
                $('hic-qr-code-image').empty();
            } else {
                qrcode = new QRCode(document.getElementById("hic-qr-code-image"), {
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });
            }

            qrcode.makeCode(shareUrl);
        }

    });

    $hic_share_url_modal.on('hidden.bs.modal', function (e) {
        $('#hic-embed-container').hide();
        $('#hic-qr-code-image').hide();
    });

    $('#hic-qr-code-button').on('click', function (e) {
        $('#hic-embed-container').hide();
        $('#hic-qr-code-image').toggle();
    });

    $('#hic-embed-button').on('click', function (e) {
        $('#hic-qr-code-image').hide();
        $('#hic-embed-container').toggle();
    });

    $('#hic-copy-link').on('click', function (e) {
        var success;
        $('#hic-share-url')[0].select();
        success = document.execCommand('copy');
        if (success) {
            $('#hic-share-url-modal').modal('hide');
        } else {
            alert("Copy not successful");
        }
    });

    $('#hic-embed-copy-link').on('click', function (e) {
        var success;
        $('#hic-embed')[0].select();
        success = document.execCommand('copy');
        if (success) {
            $('#hic-share-url-modal').modal('hide');
        } else {
            alert("Copy not successful");
        }
    });
}

async function getEmbeddableSnippet($container, config) {
    const base = (config.embedTarget || getEmbedTarget())
    const embedUrl = await shortJuiceboxURL(base);
    const height = $container.height();
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
        $('#hic-control-map-dropdown').removeClass('disabled')
    }
}

/**
 * Shorten the url
 *
 * TODO -- this should be configurable
 * * *
 * @param url
 * @returns {Promise<string>}
 */
async function shortenURL (url) {
    const enc = encodeURIComponent(url)
    const response = await fetch(`https://2et6uxfezb.execute-api.us-east-1.amazonaws.com/dev/tinyurl/${enc}`)
    if (response.ok) {
        return response.text()
    } else {
        throw new Error(response.statusText)
    }
}

async function shortJuiceboxURL(base) {
    const url = `${base}?${hic.compressedSession()}`;
    return shortenURL(url);
}

export { initializationHelper }

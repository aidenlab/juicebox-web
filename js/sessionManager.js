/**
 * Session Management Module
 * Handles loading and saving of Juicebox session files without jQuery dependencies
 */
import hic from "juicebox.js"
import {AlertSingleton} from '../node_modules/igv-widgets/dist/igv-widgets.js'
import {loadString} from "./stringLoader.js"

/**
 * Load session from a local File object
 * @param {File} file - File object from file input
 * @returns {Promise<Object>} Parsed JSON session data
 */
export async function loadSessionFromFile(file) {
    try {
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Failed to load session file: ${error.message}`);
    }
}

/**
 * Load session from a URL
 * Uses igvxhr which handles Dropbox URL conversion automatically
 * @param {string} url - URL to session JSON file
 * @returns {Promise<Object>} Parsed JSON session data
 */
export async function loadSessionFromURL(url, hicInstance = null) {
    try {
        // Prefer hic.igvxhr.loadString if available (better Dropbox support)
        let response;
        if (hicInstance && hicInstance.igvxhr && typeof hicInstance.igvxhr.loadString === 'function') {
            response = await hicInstance.igvxhr.loadString(url);
        } else {
            response = await loadString(url);
        }
        return JSON.parse(response);
    } catch (error) {
        throw new Error(`Failed to load session from URL: ${error.message}`);
    }
}

/**
 * Load session from Dropbox using Dropbox Chooser API
 * @param {Object} hicInstance - Optional hic/juicebox instance for better URL handling
 * @returns {Promise<Object>} Parsed JSON session data
 */
export async function loadSessionFromDropbox(hicInstance = null) {
    return new Promise((resolve, reject) => {
        if (typeof Dropbox === 'undefined') {
            reject(new Error('Dropbox API not available'));
            return;
        }

        const config = {
            success: async (files) => {
                try {
                    if (files.length === 0) {
                        reject(new Error('No file selected'));
                        return;
                    }
                    // Dropbox returns preview URLs, which igvxhr will convert to direct download URLs
                    const url = files[0].link;
                    const sessionData = await loadSessionFromURL(url, hicInstance);
                    resolve(sessionData);
                } catch (error) {
                    reject(error);
                }
            },
            cancel: () => {
                reject(new Error('Dropbox file selection cancelled'));
            },
            linkType: 'preview',
            multiselect: false,
            folderselect: false,
            extensions: ['.json']
        };

        Dropbox.choose(config);
    });
}

/**
 * Save session to a file download
 * @param {Object} sessionData - Session data object (from hic.toJSON())
 */
export function saveSession(sessionData) {
    try {
        const jsonString = JSON.stringify(sessionData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `juicebox-session-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up the object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        throw new Error(`Failed to save session: ${error.message}`);
    }
}

/**
 * Show a Bootstrap 4 modal without jQuery dependency
 * @param {HTMLElement} modalElement - The modal DOM element
 */
export function showModal(modalElement) {
    if (!modalElement) return;

    // Set tabindex for focus management
    if (!modalElement.hasAttribute('tabindex')) {
        modalElement.setAttribute('tabindex', '-1');
    }

    // Add backdrop if it doesn't exist
    let backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade';
        document.body.appendChild(backdrop);
        // Trigger reflow to enable transition
        void backdrop.offsetWidth;
        backdrop.classList.add('show');
    }

    // Show modal
    modalElement.classList.add('show');
    modalElement.style.display = 'block';
    document.body.classList.add('modal-open');

    // Focus the modal
    modalElement.focus();

    // Trigger shown event
    const shownEvent = new Event('shown.bs.modal', { bubbles: true });
    modalElement.dispatchEvent(shownEvent);
}

/**
 * Hide a Bootstrap 4 modal without jQuery dependency
 * @param {HTMLElement} modalElement - The modal DOM element
 */
export function hideModal(modalElement) {
    if (!modalElement) return;

    // Hide modal
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');

    // Remove backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.classList.remove('show');
        setTimeout(() => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
        }, 150); // Match Bootstrap's transition duration
    }

    // Trigger hidden event
    const hiddenEvent = new Event('hidden.bs.modal', { bubbles: true });
    modalElement.dispatchEvent(hiddenEvent);
}

/**
 * Create Bootstrap 4 styled session modals and append to container
 * @param {HTMLElement} container - Container element to append modals to
 * @returns {Object} Object with modal elements and helper functions
 */
export function createSessionModals(container) {
    // Session Load URL Modal
    const loadUrlModalHTML = `
        <div id="igv-app-session-url-modal" class="modal fade" tabindex="-1" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Load Session from URL</div>
                        <button type="button" class="close" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="session-url-input">Session File URL</label>
                            <input type="text" id="session-url-input" class="form-control" placeholder="Enter session file URL">
                            <small class="form-text text-muted">Dropbox URLs are automatically converted to direct download links.</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="session-url-load-btn">Load Session</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modals to container (only load URL modal needed)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = loadUrlModalHTML;
    while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
    }

    const loadUrlModal = document.getElementById('igv-app-session-url-modal');

    // Setup close buttons
    if (loadUrlModal) {
        const closeButtons = loadUrlModal.querySelectorAll('.close, [data-dismiss="modal"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => hideModal(loadUrlModal));
        });

        // Close on backdrop click
        loadUrlModal.addEventListener('click', (e) => {
            if (e.target === loadUrlModal) {
                hideModal(loadUrlModal);
            }
        });

        // Close on Escape key
        loadUrlModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && loadUrlModal.classList.contains('show')) {
                hideModal(loadUrlModal);
            }
        });
    }

    return {
        loadUrlModal,
        showModal,
        hideModal
    };
}

/**
 * Configure all session widgets (file input, Dropbox, URL modal, save button)
 * @param {HTMLElement} container - Container element
 */
export function configureSessionWidgets(container) {

    // Create session modals
    const { loadUrlModal } = createSessionModals(container);

    // Add Dropbox button to dropdown menu (after local file option)
    const dropdownMenu = document.getElementById('igv-session-dropdown-menu');
    if (dropdownMenu) {
        const dropboxButton = document.createElement('div');
        dropboxButton.className = 'dropdown-item';
        dropboxButton.id = 'igv-app-dropdown-dropbox-session-file-button';
        dropboxButton.innerHTML = `
            <div class="igv-app-dropdown-item-cloud-storage">
                <div>Dropbox File</div>
                <div>
                    <img src="./img/dropbox-dropdown-menu-item.png" width="18" height="18">
                </div>
            </div>
        `;

        // Insert after local file input (first child)
        const localFileLabel = dropdownMenu.querySelector('label.dropdown-item');
        if (localFileLabel && localFileLabel.nextSibling) {
            dropdownMenu.insertBefore(dropboxButton, localFileLabel.nextSibling);
        } else {
            dropdownMenu.appendChild(dropboxButton);
        }
    }

    // Wire up local file input handler
    const localFileInput = document.getElementById('igv-app-dropdown-local-session-file-input');
    if (localFileInput) {
        localFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Reset input value to allow reloading same file
            e.target.value = '';

            try {
                const sessionData = await loadSessionFromFile(file);
                await hic.restoreSession(container, sessionData);
                console.log("Session loaded successfully from local file");
            } catch (error) {
                console.error("Error loading session from file:", error);
                AlertSingleton.present(`Error loading session: ${error.message}`);
            }
        });
    }

    // Wire up Dropbox button handler
    const dropboxButton = document.getElementById('igv-app-dropdown-dropbox-session-file-button');
    if (dropboxButton) {
        dropboxButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const sessionData = await loadSessionFromDropbox(hic);
                await hic.restoreSession(container, sessionData);
                console.log("Session loaded successfully from Dropbox");
            } catch (error) {
                if (error.message !== 'Dropbox file selection cancelled') {
                    console.error("Error loading session from Dropbox:", error);
                    AlertSingleton.present(`Error loading session: ${error.message}`);
                }
            }
        });
    }

    // Wire up URL modal button (replace data-toggle with event listener)
    const urlModalButton = dropdownMenu?.querySelector('button[data-target="#igv-app-session-url-modal"]');
    if (urlModalButton && loadUrlModal) {
        // Remove data-toggle attribute to prevent jQuery Bootstrap from handling it
        urlModalButton.removeAttribute('data-toggle');
        urlModalButton.removeAttribute('data-target');

        urlModalButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Close dropdown (Bootstrap 4 way)
            const dropdown = urlModalButton.closest('.dropdown');
            if (dropdown) {
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
                dropdown.classList.remove('show');
            }
            showModal(loadUrlModal);
            // Focus on input
            const input = loadUrlModal.querySelector('#session-url-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        });
    }

    // Wire up URL load button in modal
    const urlLoadBtn = document.getElementById('session-url-load-btn');
    if (urlLoadBtn && loadUrlModal) {
        urlLoadBtn.addEventListener('click', async () => {
            const input = loadUrlModal.querySelector('#session-url-input');
            if (!input) return;

            const url = input.value.trim();
            if (!url) {
                AlertSingleton.present('Please enter a session file URL');
                return;
            }

            try {
                const sessionData = await loadSessionFromURL(url, hic);
                await hic.restoreSession(container, sessionData);
                console.log("Session loaded successfully from URL");

                // Clear input and hide modal
                input.value = '';
                hideModal(loadUrlModal);
            } catch (error) {
                console.error("Error loading session from URL:", error);
                AlertSingleton.present(`Error loading session: ${error.message}`);
            }
        });

        // Also handle Enter key in input
        const urlInput = loadUrlModal.querySelector('#session-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    urlLoadBtn.click();
                }
            });
        }
    }

    // Wire up save button - save directly without modal
    const saveButton = document.getElementById('igv-app-save-session-button');
    if (saveButton) {
        // Remove data-toggle attribute to prevent jQuery Bootstrap from handling it
        saveButton.removeAttribute('data-toggle');
        saveButton.removeAttribute('data-target');

        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Close dropdown (Bootstrap 4 way)
            const dropdown = saveButton.closest('.dropdown');
            if (dropdown) {
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('show');
                }
                dropdown.classList.remove('show');
            }

            // Save session directly
            try {
                const sessionData = hic.toJSON();
                saveSession(sessionData);
                AlertSingleton.present('Session saved successfully');
            } catch (error) {
                console.error("Error saving session:", error);
                AlertSingleton.present(`Error saving session: ${error.message}`);
            }
        });
    }

}


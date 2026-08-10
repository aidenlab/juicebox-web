/**
 * Object mimics two methods from the igvxhr interface, purpose is to break dependency on igvxhr.
 * Widgets do not need the services provided by that object *
 */

async function loadJson (url) {
    const result = await loadString(url)
    if (result) {
        return JSON.parse(result)
    } else {
        return result
    }
}

async function loadString (path) {
    if (path instanceof File) {
        return loadStringFromFile(path)
    } else {
        return loadStringFromUrl(path)
    }
}

async function loadStringFromFile(localfile) {

    const blob = localfile
    const arrayBuffer = await blob.arrayBuffer()
    return arrayBufferToString(arrayBuffer)
}


/**
 * A failed request is an error, not content. Without this check a 404 resolved with S3's
 * `NoSuchKey` XML, which every caller downstream then treated as the file it asked for — an empty
 * 2D annotation menu with no warning was the visible symptom. See aidenlab/juicebox-web#63.
 *
 * The status travels as a number on the error so callers can branch on it — a 404 means "this
 * genome has no curated menu" where a 403 means "the request failed" — without parsing the message.
 */
async function loadStringFromUrl(url) {
    const response = await fetch(url)
    if (!response.ok) {
        const error = new Error(`Error loading ${ url }: ${ response.status } ${ response.statusText }`)
        error.status = response.status
        throw error
    }
    const data = await response.arrayBuffer()
    return arrayBufferToString(data)
}

function arrayBufferToString(arraybuffer) {
    let plain= new Uint8Array(arraybuffer)
    return new TextDecoder().decode(plain)
}


export {loadString, loadJson}

export const juiceboxConfig = {

    genome: 'https://igv.org/genomes/genomes3.json',

    mapMenu: {
        items: 'res/hicfiles.json',
    },
    trackMenu: {
        id: 'annotation-datalist',
        items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_$GENOME_ID.txt',
    },
    trackMenu2D: {
        id: 'annotation-2D-datalist',
        items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D.$GENOME_ID.txt',
    },

    trackRegistryFile: 'res/tracks/encodeRegistry.json',

    urlShortener: {
        provider: 'tinyURL',
        // Left undefined when the env var is absent, which is what the shortener's own guard
        // tests for: it warns and hands back the unshortened URL. A placeholder here would be
        // truthy, defeat the guard, and send `Bearer YOUR_...` to TinyURL — see aidenlab/juicebox-web#65.
        apiKey: import.meta.env.VITE_TINYURL_JUICEBOX_API_KEY,
        domain: 't.3dg.io',
        endpoint: 'https://api.tinyurl.com/create',
        tags: ['juicebox'],
    },
}

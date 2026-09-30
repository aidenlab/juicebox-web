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
        // The jb-shortlink worker (workers/jb-shortlink) shortens on t.3dg.io with the account's
        // key. The page sends no key: TinyURL's API no longer answers browser origins, and the key
        // used to ship in the bundle (aidenlab/juicebox-web#65). Every hostname the app is served
        // on is on the worker's Origin allow-list.
        endpoint: 'https://juicebox.aidenlab.org/shorten',
    },
}

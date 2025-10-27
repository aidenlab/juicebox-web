/*
 * @author Jim Robinson Nov-2019
 */

var juiceboxConfig = {

    genome:'https://igv.org/genomes/genomes.json',

    mapMenu: {
        id: 'contact-map-datalist',
        items: 'https://aidenlab.org/juicebox/res/hicfiles.json'
    },
    trackMenu: {
        id: 'annotation-datalist',
        items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_$GENOME_ID.txt'
    },
    trackMenu2D: {
        id: 'annotation-2D-datalist',
        items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D.$GENOME_ID.txt'
    },

    trackRegistryFile: "res/tracks/encodeRegistry.json",

    // Supply a Google client id to enable loading of private Google files.  Supply an API key to
    // enable loading of public Google files without login.
    // google: {
    //     clientId: "GOOGLE CLIENT ID",
    //     apiKey: "GOOGLE API KEY"
    // }
}

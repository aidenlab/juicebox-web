/**
 * Factory function to create a configuration object for the EncodeTrackDatasource given a genomicId and type.
 * Verbatim port from igv-widgets v1.5.4.
 */
function encodeTrackDatasourceConfigurator(genomeId, type) {

    const root = 'https://s3.amazonaws.com/igv.org.app/encode/'
    let url

    switch (type) {
        case 'signals-chip':
            url = `${root}${canonicalId(genomeId)}.signals.chip.txt`
            break
        case 'signals-other':
            url = `${root}${canonicalId(genomeId)}.signals.other.txt`
            break
        case 'other':
            url = `${root}${canonicalId(genomeId)}.other.txt`
            break
    }

    return {
        isJSON: false,
        url,
        sort: encodeSort,
        columns: [
            'Biosample',
            'AssayType',
            'Target',
            'BioRep',
            'TechRep',
            'OutputType',
            'Format',
            'Lab',
            'Accession',
            'Experiment'
        ],
        columnDefs: {
            AssayType: { title: 'Assay Type' },
            OutputType: { title: 'Output Type' },
            BioRep: { title: 'Bio Rep' },
            TechRep: { title: 'Tech Rep' }
        },
        rowHandler: row => {
            const name = constructName(row)
            const url = `https://www.encodeproject.org${row['HREF']}`
            const color = colorForTarget(row['Target'])
            return { name, url, color }
        }
    }
}

function supportsGenome(genomeId) {
    const knownGenomes = new Set(['ce10', 'ce11', 'dm3', 'dm6', 'GRCh38', 'hg19', 'mm9', 'mm10'])
    return knownGenomes.has(canonicalId(genomeId))
}

function canonicalId(genomeId) {
    switch (genomeId) {
        case 'hg38':     return 'GRCh38'
        case 'CRCh37':   return 'hg19'
        case 'GRCm38':   return 'mm10'
        case 'NCBI37':   return 'mm9'
        case 'WBcel235': return 'ce11'
        case 'WS220':    return 'ce10'
        default:         return genomeId
    }
}

function constructName(record) {
    let name = record['Biosample'] || ''
    if (record['Target']) name += ' ' + record['Target']
    if (record['AssayType'].toLowerCase() !== 'chip-seq') name += ' ' + record['AssayType']
    return name
}

function encodeSort(a, b) {
    const aa1 = a['Assay Type'], aa2 = b['Assay Type']
    const cc1 = a['Biosample'],  cc2 = b['Biosample']
    const tt1 = a['Target'],     tt2 = b['Target']

    if (aa1 === aa2) {
        if (cc1 === cc2) {
            if (tt1 === tt2) return 0
            return tt1 < tt2 ? -1 : 1
        }
        return cc1 < cc2 ? -1 : 1
    }
    return aa1 < aa2 ? -1 : 1
}

function colorForTarget(target) {
    const t = target.toLowerCase()
    if (t.startsWith('h3k4'))  return 'rgb(0,150,0)'
    if (t.startsWith('h3k27')) return 'rgb(200,0,0)'
    if (t.startsWith('h3k36')) return 'rgb(0,0,150)'
    if (t.startsWith('h3k9'))  return 'rgb(100,0,0)'
    if (t === 'ctcf')          return 'black'
    return undefined
}

export { encodeTrackDatasourceConfigurator, supportsGenome }

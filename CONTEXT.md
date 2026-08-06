# Juicebox Web

The web application that wraps [juicebox.js](https://github.com/aidenlab/juicebox.js) — a viewer for Hi-C contact maps. The viewer itself is the library's concern; this repo owns everything around it: the catalogs a user picks data from, the load and share surfaces, and the shipped distributions.

## Language

### The application

**Viewer**:
The juicebox.js library instance that draws contact maps and tracks. Everything it renders is the library's responsibility, not this repo's.
_Avoid_: juicebox, the app, hic

**Browser**:
A single viewer panel with its own loaded map, tracks, and locus. Several can be open at once; exactly one is current, and menu actions apply to it.
_Avoid_: panel, instance, window

**Shell**:
The parts of the page this repo owns — menus, modals, widgets, and the catalogs behind them. Distinct from the viewer it surrounds.
_Avoid_: chrome, wrapper, frontend

**Widget**:
A shell-owned interface element for getting data into the viewer — a load menu, a file input, a modal, a share dialog. Not the viewer's own controls.
_Avoid_: component, control

**Distribution**:
A build of the shell for a particular deployment — the default one and the AidenLab one, which differ in branding and entry page. Selected by build mode, not at runtime.
_Avoid_: flavor, variant, target, environment

**Embed**:
A page that hosts a bare viewer with no shell — no menus, no catalogs — for placing a map inside someone else's page.
_Avoid_: iframe, widget mode

### Contact maps

**Contact map**:
A Hi-C dataset (a `.hic` file) giving contact frequency between every pair of genomic loci in a genome. The primary thing a user loads.
_Avoid_: heatmap, matrix, hic file, dataset

**Control map**:
A second contact map loaded alongside the first for comparison. The interface calls the pair "A" and "B"; the control map is B.
_Avoid_: B map, comparison map, secondary map

**Map menu**:
The curated, searchable catalog of published contact maps offered in the load menu, each entry carrying its publication, organism, cell type, and protocol.
_Avoid_: map list, file list, hicfiles

**Datasource**:
An adapter that turns one external catalog — the curated map menu, ENCODE-hosted maps, 4DN maps — into rows of a searchable table. One per catalog; they differ in columns and in how they are queried.
_Avoid_: provider, backend, source, repository

**Resolution**:
The bin size at which a contact map is displayed. Changing it changes counts per bin, so the color scale must change with it.
_Avoid_: zoom level, granularity

### Genomic annotation

**Genome**:
The reference assembly a contact map is aligned to, named by its identifier (`hg19`, `mm10`). It is the key to nearly every catalog in the shell: switching genomes re-derives the track menus.
_Avoid_: assembly, reference, build

**Track**:
A one-dimensional annotation displayed along a map axis, positioned by a single genomic interval.
_Avoid_: 1D track, signal, feature track

**2D annotation**:
An annotation positioned by a *pair* of intervals, so it draws on the face of the map rather than along an axis. Loops and domains are 2D annotations.
_Avoid_: 2D track, feature pair, overlay

**Track menu**:
The genome-keyed catalog of curated tracks and 2D annotations offered for the currently loaded genome.
_Avoid_: annotation datalist, track list

**Track registry**:
The mapping from genome to the ENCODE track catalogs available for it. Determines which ENCODE load options a genome offers at all.
_Avoid_: track index, catalog

**Genome-derived track**:
A track that comes from the genome definition rather than a catalog — the reference sequence and its gene annotation. Toggled on and off rather than loaded and removed.
_Avoid_: built-in track, default track

### Session and sharing

**Session**:
The complete restorable state of the shell and its viewers — maps loaded, tracks loaded, loci, color scales. Saved to and loaded from a JSON file.
_Avoid_: state, workspace, config

**Share URL**:
A session compressed into a link, shortened for distribution and also offered as a QR code. Opening one restores the session it encodes.
_Avoid_: permalink, session link, short URL

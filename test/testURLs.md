# Manual test URLs

Hand-checked URLs for exercising the shell's parameter surface. Every data URL below is 4DN open
data or UCSC, both of which answer a ranged GET from a browser with `Access-Control-Allow-Origin: *`.

The previous set of URLs pointed at `hicfiles.s3.amazonaws.com/external/...`,
`s3.amazonaws.com/igv.broadinstitute.org/...` and `dnazoo.s3.amazonaws.com`, all of which now answer
**403** to a browser. Anything that returns 403 belongs nowhere in this file — replace it with 4DN.
The 4DN catalog the app itself loads is the place to shop:
`https://raw.githubusercontent.com/igvteam/igv-data/main/data/4dn/4dn_hic.txt`.

Note that not all of `hicfiles.s3.amazonaws.com` is dead — `internal/tracksMenu_$GENOME_ID.txt`, which
`js/juiceboxConfig.js` points the track menu at, still serves. It is the `external/` prefix that 403s.

## The data these URLs use

| Role | Dataset | Accession |
|---|---|---|
| "A" map | HFFc6 (Tier 1), DpnII, merged replicates, GRCh38 | `4DNFIMROE6N4` |
| "B" map | H1-hESC (Tier 1), DpnII, merged replicates, GRCh38 | `4DNFIIMZB6Y9` |
| 2D annotation | Loop calls on HFFc6 (Tier 1), DpnII | `4DNFI8NCHTIR` |
| Mouse map | Cerebellar granule neuron, MboI, GRCm38 | `4DNFI916JQ1Y` |
| 1D track | hg38 RefSeq genes, UCSC | — |

## Hosts

* dev server — `http://localhost:5173`
* deployed — `https://igv.org/web/jb/test`

Every path below is written against the dev server; swap the host for the deployed one.

# One contact map

* http://localhost:5173/index.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/8f064770-6008-4f74-bfca-268d4a22d745/4DNFIMROE6N4.hic&name=HFFc6%20DpnII

# Contact map at a locus, with a color scale and a 1D track

* http://localhost:5173/index.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/8f064770-6008-4f74-bfca-268d4a22d745/4DNFIMROE6N4.hic&name=HFFc6%20DpnII&state=1,1,4,0,0,1,NONE&colorScale=100,255,0,0&tracks=https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/refGene.txt.gz%7CRefSeq%20genes%7C%7Crgb(22,%20129,%20198)

# "A" and "B" maps — the control map dropdown

`controlUrl` loads the second map at startup. To exercise the dropdown itself, open the single-map
URL above and load the "B" map from the menu: the dropdown starts disabled and must enable once a
map is loaded. See aidenlab/juicebox-web#61.

* http://localhost:5173/index.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/8f064770-6008-4f74-bfca-268d4a22d745/4DNFIMROE6N4.hic&name=HFFc6%20DpnII&controlUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/a0859349-5f06-4ad3-b56f-b1166b34a9eb/4DNFIIMZB6Y9.hic&controlName=H1-hESC%20DpnII

# 2D annotation

* http://localhost:5173/index.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/8f064770-6008-4f74-bfca-268d4a22d745/4DNFIMROE6N4.hic&name=HFFc6%20DpnII&tracks=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/4e837f90-1626-4439-8559-1dd9b2334352/4DNFI8NCHTIR.bedpe.gz%7CHFFc6%20loops%7C%7Crgb(0,%2036,%20255)

# Two browsers

The `juicebox` parameter takes one brace-delimited block per browser.

* http://localhost:5173/index.html?juicebox=%7BhicUrl%3Dhttps%3A%2F%2F4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2F8f064770-6008-4f74-bfca-268d4a22d745%2F4DNFIMROE6N4.hic%26name%3DHFFc6%20DpnII%7D%2C%7BhicUrl%3Dhttps%3A%2F%2F4dn-open-data-public.s3.amazonaws.com%2Ffourfront-webprod%2Fwfoutput%2Fa0859349-5f06-4ad3-b56f-b1166b34a9eb%2F4DNFIIMZB6Y9.hic%26name%3DH1-hESC%20DpnII%7D

# Genome switching

Loading this after a GRCh38 map re-derives the track menus for mouse.

* http://localhost:5173/index.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/3be17688-cbce-4ef9-9b94-8571c20a858e/4DNFI916JQ1Y.hic&name=Mouse%20cerebellar%20granule%20neuron

# Embed

* http://localhost:5173/embed.html?hicUrl=https://4dn-open-data-public.s3.amazonaws.com/fourfront-webprod/wfoutput/8f064770-6008-4f74-bfca-268d4a22d745/4DNFIMROE6N4.hic&name=HFFc6%20DpnII

# Legacy bitly URLs

Removed. `http://bit.ly/2C1VSHy` and `http://bit.ly/2srvPJK` still redirect, but they expand to
`hicfiles.s3.amazonaws.com/hiseq/...` maps and loop calls, which 403. There is nothing to test.

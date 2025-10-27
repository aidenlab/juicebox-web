#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Always use the Vite-built index.html as the template
const templatePath = path.join(__dirname, '../dist/index.html');

const pj = require.resolve('../package.json');
const jsonText = fs.readFileSync(pj, 'utf-8');
const version = JSON.parse(jsonText).version;

const lines = fs.readFileSync(templatePath, 'utf-8').split(/\r?\n/);

const outputFileName = 4 === process.argv.length ? process.argv[ 3 ] : process.argv[ 2 ]

// node scripts/generateHtml.js (./aiden_lab_navbar_additions.html) index.html
// console.log(`argv length ${ process.argv.length }. output file ${ outputFileName }`)

const out = path.join(__dirname, '../dist', outputFileName);
const fd = fs.openSync(out, 'w');
let skipAidenLabAdditions = false;
for (let line of lines) {

    if(line.includes("<script") && line.includes("module") && line.includes("app.js")) {
        // Skip the original script tag, Vite will inject the built version
        continue;
    }

    else if(line.includes("juicebox.css")) {
        fs.writeSync(fd, '<link rel="stylesheet" href="assets/juicebox.css"/>\n', null, 'utf-8');
    }

    else if (line.includes("@VERSION")) {
        line = line.replace("@VERSION", version);
        fs.writeSync(fd, line + '\n', null, 'utf-8');
    }

    else if (4 === process.argv.length && line.includes("<!--AIDEN_LAB-->")) {
        const file = path.join(__dirname, '../scripts', process.argv[ 2 ]);
        const aidenLabAdditions = fs.readFileSync(file, 'utf-8');
        fs.writeSync(fd, aidenLabAdditions, null, 'utf-8');
        skipAidenLabAdditions = true;
    }

    else if(4 === process.argv.length && skipAidenLabAdditions) {
        if(line.includes("<!--AIDEN_LAB")) {
            skipAidenLabAdditions = false;
        }
    }

    else {
        fs.writeSync(fd, line + '\n', null, 'utf-8')
    }
}
fs.close(fd);

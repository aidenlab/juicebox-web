#!/usr/bin/env node
/**
 * Replaces __TINYURL_JUICEBOX_API_KEY__ in juiceboxConfig.js with the value from
 * TINYURL_JUICEBOX_API_KEY environment variable (loaded from .env). Writes the
 * result to dist/juiceboxConfig.js.
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config();

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'juiceboxConfig.js');
const destPath = path.join(projectRoot, 'dist', 'juiceboxConfig.js');

const apiKey = process.env.TINYURL_JUICEBOX_API_KEY || '';
const replacement = JSON.stringify(apiKey);

let content = fs.readFileSync(sourcePath, 'utf-8');
content = content.replace(/'__TINYURL_JUICEBOX_API_KEY__'/g, replacement);

fs.writeFileSync(destPath, content, 'utf-8');

#!/usr/bin/env node

'use strict';

const path = require('path');
const options = require('commander');

const config = require('../lib/config');
const builder = require('../lib/builder');

options
    .option('-d, --debug', 'Turn on debug logging')
    .option('-c, --config [file]', 'The location of your .yaml config file', './config.yml')
    .option('-o, --outputDir [folder]', 'Where you\'d like to ouput your site to', './_site')
    .parse(process.argv);

if (options.debug) {
    process.env.DEBUG = true;
}

const parsedConfig = config.parse(path.join(process.cwd(), options.config));

// TODO - Clean this up.
let outputDir = path.join(process.cwd(), options.outputDir);

builder.build(parsedConfig, outputDir, (err, array) => {
    console.log('Done.');
});

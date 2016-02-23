#!/usr/bin/env node

'use strict';

const path = require('path');
const options = require('commander');

const config = require('../lib/config');
const builder = require('../lib/builder');
const watcher = require('../lib/watcher');
const server = require('../lib/server');

options
    .option('-d, --debug', 'Turn on debug logging')
    .option('-c, --config [file]', 'The location of your .yaml config file', 'config.yml')
    .option('-o, --outputDir [folder]', 'Where you\'d like to ouput your site to', '_site')
    .option('-s, --serve', 'If you\d like enfield to serve you site.')
    .option('-p, --port [number]', 'The port you\'d like to serve your site on', (s) => parseInt(s, 10), '3000')
    .option('-w, --watch', 'If you want to watch for changes and rebuild')
    .parse(process.argv);

if (options.debug) {
    process.env.DEBUG = true;
}

const parsedConfig = config.parse(path.join(process.cwd(), options.config));
const outputDir = path.join(process.cwd(), options.outputDir);


function build(callback) {
    builder.build(parsedConfig, outputDir, callback);
}

/**
 * Returns an array of files to watch.
 */
function getFilesToWatch() {
    let filesToWatch = parsedConfig.pages.map((page) => page.markdown);
    filesToWatch.push(parsedConfig.theme);
    filesToWatch.push(options.config);
    return filesToWatch;
}


/*
Build the docs
 */
build(() => {

    if (options.watch) {
        watcher.watch(getFilesToWatch(), () => {
            build();
        });
    }

    if (options.serve) {
        server.serve(outputDir, options.port);
    }
});

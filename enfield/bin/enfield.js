#!/usr/bin/env node

'use strict';

const path = require('path');
const options = require('commander');
const ghpages = require('gh-pages');

const config = require('../lib/config');
const builder = require('../lib/builder');
const watcher = require('../lib/watcher');
const server = require('../lib/server');
const log = require('../lib/log');

options
    .version(require('../../package.json').version)
    .option('-d, --debug', 'Turn on debug logging')
    .option('-c, --config [file]', 'The location of your .yaml config file', 'config.yml')
    .option('-o, --outputDir [folder]', 'Where you\'d like to ouput your site to', '_site')
    .option('-s, --serve', 'If you\d like enfield to serve you site.')
    .option('-p, --port [number]', 'The port you\'d like to serve your site on', (s) => parseInt(s, 10), '3000')
    .option('--publish', 'Whether you\'d like to publish your site to github pages.')
    .option('-w, --watch', 'If you want to watch for changes and rebuild')
    .parse(process.argv);

if (options.debug) {
    process.env.DEBUG = true;
}

let outputDir = path.join(process.cwd(), options.outputDir);
let parsedConfig;

function parseConfig() {
    parsedConfig = config.parse(path.join(process.cwd(), options.config));
}

function build(callback) {
    builder.build(parsedConfig, outputDir, options.publish, () => {
        onBuild();
        if (callback) {
            callback();
        }
    });
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

/**
 * Called after every build.
 */
function onBuild() {
    if (options.publish) {
        log.success('Publishing to github pages...');

        if (options.watch) {
            log.warn('Using watch & publish at the same time can be very slow. Not recommended.');
        }

        ghpages.publish(outputDir, (err) => {
            log.success('Published to github pages. It may take a few moments to see changes.');
        });
    }
}

/*
Build the docs
 */
parseConfig();
build(() => {

    if (options.watch) {
        watcher.watch(getFilesToWatch(), () => {
            parseConfig();
            build();
        });
    }

    if (options.serve) {
        server.serve(outputDir, options.port);
    }
});

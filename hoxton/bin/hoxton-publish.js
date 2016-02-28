'use strict';

const path = require('path');

const options = require('commander');
const ghpages = require('gh-pages');

const config = require('../lib/config');
const builder = require('../lib/builder');
const log = require('../lib/log');

options
    .version(require('../../package.json').version)
    .option('-d, --debug', 'Turn on debug logging')
    .option('-c, --config [file]', 'The location of your .yaml config file', 'config.yml')
    .option('-o, --outputDir [folder]', 'Where you\'d like to ouput your site to. After it\'s been built to this directory it will be published to github.', '_site')
    .parse(process.argv);

if (options.debug) {
    process.env.DEBUG = true;
}

process.env.PRODUCTION = true;

let parsedConfig = config.parse(path.join(process.cwd(), options.config));
let outputDir = path.join(process.cwd(), options.outputDir);

builder.build(parsedConfig, outputDir, () => {
    log.success('Publishing to Github pages...');

    ghpages.publish(outputDir, (err) => {
        log.success('Published! It may take a few minutes for you to see any changes.');
    });
});

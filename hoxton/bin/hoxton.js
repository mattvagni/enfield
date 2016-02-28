#!/usr/bin/env node

'use strict';

const options = require('commander');


/**
 * Dear future me,
 *
 * Commander does this thing where for each 'command' it will load a file
 * like so: hoxton-<command-name>.js
 */
options
    .version(require('../../package.json').version)
    .command('build [options]', 'Build your docs, watch for changes & serve.')
    .command('publish [options]', 'Publish your docs to github pages.')
    .parse(process.argv);

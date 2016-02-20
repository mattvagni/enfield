#!/usr/bin/env node

'use strict';

var options = require('commander');

/**
 * Future me: Commander does this thing where it looks at each
 * command that you specify and then calls the file in the same
 * directory called enfield-<command-name>.
 *
 * That means that to add a command you just have to make a new
 * file in bin that matches your command name.
 */
options
    .version('0.0.1')
    .command('build [options]', 'Build your docs.')
    .parse(process.argv);

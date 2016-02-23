'use strict';

const chalk = require('chalk');

/*
Loggers for various levels.
 */
module.exports = {
    success(message) {
        console.log(chalk.bold.green('+') + ` ${message}`);
    },
    error(message) {
        console.log(chalk.red(`\n${message}\n`));
    },
    debug(message) {
        if (process.env.DEBUG) {
            console.log(chalk.grey(`- ${message}`));
        }
    }
};

'use strict';

const chalk = require('chalk');

/*
Loggers for various levels.
 */
module.exports = {
    success(message) {
        console.log(chalk.bold.green('+') + ` ${message}`);
    },
    warn(message) {
        console.log(chalk.bold.yellow('-') + ` ${message}`);
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

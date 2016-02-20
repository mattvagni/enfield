'use strict';

const log = require('./log');

module.exports = function raiseError(message, error) {
    log.error(message);

    if (error) {
        throw Error(error);
    } else {
        process.exit();
    }
};

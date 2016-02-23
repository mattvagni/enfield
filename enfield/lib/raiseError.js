'use strict';

const log = require('./log');

/**
 * Raise an error - no going back grom this.
 *
 * @param {string} message The user helpful explanation of why it errored.
 * @param {object} error The error message (optional);
 */
module.exports = function raiseError(message, error) {
    log.error(message);

    if (error) {
        throw Error(error);
    } else {
        process.exit();
    }
};

'use strict';

const path = require('path');
const url = require('url');

module.exports = {
    /**
     * Prefixes an internal url with the base_url. If the url is not internal
     * (i.e has a host) then do nothing and return url unaltered.
     *
     * Only prefixes in 'production' mode.
     *
     * @param {string} path The path to prefix
     * @param {object} config
     */
    prefixUrlWithBaseUrl(urlString, config) {
        let parsedUrl = url.parse(urlString, false, true);

        // Never prefix urls that are 'external' or if we are not
        // creating a build that is to be published.
        if (parsedUrl.host || !process.env.PRODUCTION) {
            return urlString;
        }

        parsedUrl.pathname = path.join(config.base_url, parsedUrl.pathname);
        return parsedUrl.format(parsedUrl);
    }
};

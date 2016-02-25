'use strict';

const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');
const _ = require('lodash');

const log = require('./log');
const raiseError = require('./raiseError');
const templateFileName = require('./builder').templateFileName;


/**
 * The location of the docs, used for logging.
 */
let configLocation;

/**
 * Checks that a title is valid.
 *
 * @param {object} config
 */
function getTitle(config) {

    if (!config.title || !_.isString(config.title) || !config.title.length) {
        raiseError(
            'In your config, you must define your "title" as a string of at least 1 character in length.',
            `Expected 'title' to be a String in ${configLocation}`
        );
    }

    return config.title;
}

/**
 * Checks that a theme is valid
 * It has to:
 * - Be defined as a string
 * - Be a folder
 * - Contain a file called `template.mustache`
 *
 * @param {object} config
 */
function getTheme(config) {

    if (!config.theme || !_.isString(config.theme) || !config.theme.length) {
        raiseError(
            'In your config, you must define a "theme" for your docs. This should be the name of the folder that contains your theme file(s).',
            `'theme' undefined in ${configLocation}`
        );
    }

    try {
        fs.readFileSync(path.join(config.theme, templateFileName), 'utf8');
        return config.theme;
    }
    catch (readError) {
        raiseError(
            'Your theme doesn\'t include a template so it isn\'t invalid. Please refer to the enfield docs on how to make themes.',
            readError
        );
    }
}

/**
 * Get's the site url for when it is 'published'.
 */
function getBaseUrl(config) {
    if (config.base_url === undefined) {
        return '/';
    }

    if (!_.isString(config.base_url)) {
        raiseError(
            'You have incorrectly defined the \'base_url\' in your config.',
            `Expected 'base_url' to be a string in ${configLocation}`
        );
    }
    // Remove trailing slashes.
    if (config.base_url[config.base_url.length - 1] === '/') {
        return config.base_url.slice(0, -1);
    }
    return config.base_url;
}

/**
 * Checks an individual page is correct.
 * Page is an object where the key is the pageName and the value is, depending
 * on depth, either an array of other pages or a string pointing to a markdown file.
 *
 * @param {object} page A single page from the config Pages
 * @param {number} depth The depth of the page (if it's in a section or not)
 */
function validatePage(page, depth) {
    let pageName = Object.keys(page)[0];
    let pageValue = page[pageName];

    if (!_.isString(pageName)) {
        raiseError(
            'The name of each page has to be a string. Please check the enfield docs on how to define pages.',
            `Expected ${pageName} to be a String in ${configLocation}`
        );
    }

    if (depth === 1 && !_.isString(pageValue) && !_.isArray(pageValue)) {
        raiseError(
            `You have defined the page ${pageName} incorrectly. Each page in your config should be the name of a markdown file (a string) or a list of 'sub-pages' (a list). Please check the enfield docs on how to define pages.`,
            `Expected ${pageName} to be an Array or String in ${configLocation}`
        );
    }
    else if (depth === 2 && !_.isString(pageValue)) {
        raiseError(
            `You have defined the subpage ${pageName} incorrectly. Each subpage in your config should be the name of markdown file (a string).  Please check the enfield docs on how to define pages.`,
            `Expected subpage ${pageName} to be a String in ${configLocation}`
        );
    }

    if (_.isString(pageValue)) {
        try {
            fs.readFileSync(path.join(pageValue), 'utf8');
        }
        catch (readError) {
            raiseError(
                `Couldn't read the markdown file at: "${pageValue}" for the page titled "${pageName}"`,
                readError
            );
        }
    }
}

/**
 * Checks that pages are valid.
 * It has to be:
 * - Be defined
 * - Has to be a list
 * - Each page must be a string that points to a markdown file.
 * - You can only go two levels deep in the nesting of pages.
 *
 * @param {object} config
 */
function getPages(config) {

    let pages = [];
    let pageTitleMap = new Map();

    // Checks pages was specified.
    if (!config.pages) {
        raiseError(
            'You must specify a list of pages that defines your docs content & structure. Please check the enfield docs on how to define pages.',
            `'pages' not specified in ${configLocation}`
        );
    }

    if (!_.isArray(config.pages)) {
        raiseError(
            'Pages defined in your config have to be a list. Please check the enfield docs on how to define pages.',
            `Expected 'pages' to be an Array in ${configLocation}`
        );
    }

    config.pages.forEach((page) => {
        // For each page you have a key and value. The key is always the page name
        // The 'value' can either be a string which points to a markdown file
        // or an other array which points to sub-pages.
        let pageTitle = Object.keys(page)[0];
        let pageValue = page[pageTitle];
        let subPageTitleMap = new Map();

        validatePage(page, 1);

        if (pageTitleMap.has(pageTitle.toLowerCase())) {
            raiseError(
                `It looks like you have two top-level pages both called "${pageTitle}". Page names at each level must be unique.`
            );
        } else {
            pageTitleMap.set(pageTitle.toLowerCase());
        }

        if (_.isString(pageValue)) {
            pages.push({
                title: pageTitle,
                markdown: pageValue,
                section: '',
            });
            return;
        }

        // If we get to here it must be an array.
        pageValue.forEach((subPage) => {
            let subpageTitle = Object.keys(subPage)[0];
            let markdown = subPage[subpageTitle];

            validatePage(subPage, 2);

            if (subPageTitleMap.has(subpageTitle.toLowerCase())) {
                raiseError(
                    `It looks like you have two subpages of "${pageTitle}" both called "${subpageTitle}". Page names at each level must be unique.`
                );
            } else {
                subPageTitleMap.set(subpageTitle.toLowerCase());
            }

            pages.push({
                title: subpageTitle,
                markdown: markdown,
                // The title of the parent 'page' is essentially the section:
                section: pageTitle
            });

        });

    });

    // It's valid!
    return pages;
}


/**
 * Get any other settings that the user has in the config.
 *
 * @param {object} config
 */
function getSiteConfig(rawConfig) {
    return _.omit(rawConfig, ['pages', 'theme', 'title', 'base_url']);
}

module.exports = {

    /**
     * Gets the config and validates that it's valid.
     * If it finds a mistake it throws an error.
     *
     * @param {string} configFile The location of the configFile
     */
    parse(configFile) {
        let rawConfig = {};
        let config;

        configLocation = configFile;

        // Get the yaml config file.
        try {
            rawConfig = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'), {
                json: true,
            }) || {};
        } catch (yamlParseError) {
            raiseError(`Error parsing the config in ${configFile}`, yamlParseError);
        }

        config = {
            title: getTitle(rawConfig),
            theme: getTheme(rawConfig),
            pages: getPages(rawConfig),
            site: getSiteConfig(rawConfig),
            base_url: getBaseUrl(rawConfig)
        };

        log.debug('Config:' +  JSON.stringify(config, null, 4));
        return config;
    }
};

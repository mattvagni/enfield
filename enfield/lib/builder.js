'use strict';

const path = require('path');
const fs = require('fs-extra');

const async = require('async');
const mustache = require('mustache');
const _ = require('lodash');

const log = require('./log');
const markdown = require('./markdown');
const raiseError = require('./raiseError');

const TEMPLATE_FILE_NAME = 'template.mustache';


/**
 * Takes a page name & converts it to a slug that is url safe.
 *
 * @param {string} s The string to convert to a slug.
 */
function slugify(s) {
    return s.toString()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
}


/**
 * Given a page from the config, returns the page's url.
 *
 * @param {object} configPage
 * @param {string} section The section the page is in.
 */
function getPageUrl(configPage) {
    const sectionSlug = slugify(configPage.section);
    const titleSlug = slugify(configPage.title);
    return path.join('/', sectionSlug, titleSlug, '/');
}


/**
 * Create global context. This is provided to every template.
 *
 * @param {object} config
 * @param {object} currentPageContext The context of the current page.
 */
function createMenuContext(pageContextsList, currentPageContext) {

    let menuItems = [];
    let lastSection = '';

    pageContextsList.forEach((page, index, pages) => {

        if (page.section !== lastSection) {
            menuItems.push({
                isSectionTitle: true,
                title: page.section
            });

            lastSection = page.section;
        }

        let isActive = page.url === currentPageContext.url;

        menuItems.push({
            isPage: true,
            isActive: isActive,
            section: page.section,
            title: page.title,
            url: page.url,
            headings: (isActive) ? currentPageContext.headings : []
        });

    });

    return menuItems;
}

/**
 * Returns the pagination context
 *
 * @param {array} pageContexts The list of the context per page
 * @param {object} pageContext The context of the current page.
 */
function createPaginationContext(pageContexts, pageContext) {

    let context = {};

    let currentIndex = _.findIndex(pageContexts, (p) => {
        return p.url === pageContext.url;
    });

    if (currentIndex > 0) {
        let prevPage = pageContexts[currentIndex - 1];
        context.previousPage = {
            title: prevPage.title,
            url: prevPage.url
        };
    }

    if (currentIndex < pageContexts.length - 1) {
        let nextPage = pageContexts[currentIndex + 1];
        context.nextPage = {
            title: nextPage.title,
            url: nextPage.url
        };
    }

    return context;
}


/**
 * Creates the context for a single page.
 *
 * @param {object} configPage
 * @param {string} section The name of the section (optional)
 * @param {function} callback
 */
function createPageContext(configPage, pageIndex, callback) {

    const isHomepage = pageIndex === 0;
    const page = {};

    page.title = configPage.title;
    page.section = configPage.section;
    page.url = (isHomepage) ? '/' : getPageUrl(configPage);

    markdown.parse(configPage.markdown, (err, markdownResults) => {
        page.content = markdownResults.html;
        page.headings = markdownResults.headings;
        callback(err, page);
    });
}


/**
 * Creates a list with the context for each page.
 *
 * @param {object} config The parsed config
 * @param {function} callback
 */
function getContextPerPage(config, callback) {

    let index = 0;

    // Loop through each page and do the creation of the page asynchrously.
    async.map(config.pages, (page, pageCreationCallback) => {
        createPageContext(page, index++, pageCreationCallback);
    }, (err, pageContexts) => {

        // Add the menu to the context of each page.
        // We do this after the fact because it's much easier
        // to create the menu context with the full list of page contexts.
        pageContexts = pageContexts.map((pageContext) => {

            return {
                menuItems: createMenuContext(pageContexts, pageContext),
                page: pageContext,
                title: config.title,
                pagination: createPaginationContext(pageContexts, pageContext)
            };
        });
        log.debug('Pages Contexts:' + JSON.stringify(pageContexts, null, 2));
        callback(err, pageContexts);
    });

}


/**
 * Loops through each page context and outputs the page.
 *
 * @param {object} config
 * @param {string} outputDir
 * @param {array} pageContextList An array of the template context per page
 * @param {function} callback Called once all pages have been outputted
 */
function outputPages(config, outputDir, pageContextList, callback) {

    // No need to try catch this as our config check's it's readable.
    const templateLocation = path.join(config.theme, TEMPLATE_FILE_NAME);
    let template = fs.readFileSync(templateLocation, 'utf8');

    pageContextList.forEach((pageContext) => {
        let html = mustache.render(template, pageContext);

        let outputPath = path.join(
            outputDir, pageContext.page.url, '/index.html'
        );

        try {
            fs.outputFileSync(outputPath, html);
            log.debug(`"${pageContext.page.title}" -> ${outputPath}`);
        }
        catch(writeError) {
            raiseError(
                `Error writing page to ${outputPath}`,
                writeError
            );
        }
    });

    callback(null);
}


/**
 * This copies all files from the root of the theme folder
 * besides the template file since that's useless.
 *
 * @param {object} config
 * @param {string} outputDir
 */
function copyThemeFiles(config, outputDir) {
    const files = fs.readdirSync(config.theme);
    const filesToCopy = _.without(files, TEMPLATE_FILE_NAME);

    filesToCopy.forEach((file) => {
        const src = path.join(config.theme, file);
        const dest = path.join(outputDir, file);
        fs.copy(src, dest);
        log.debug(`${src} -> ${dest}`);
    });
}


/**
 * Build :allthethings:
 *
 * @param {object} config
 * @param {string} outputDir
 * @param {function} callback Called once all pages are built.
 */
function build(config, outputDir, callback) {

    getContextPerPage(config, (err, pages) => {
        fs.removeSync(outputDir);
        log.debug(`Deleted: ${path.relative(process.cwd(), outputDir)}`);
        copyThemeFiles(config, outputDir);
        outputPages(config, outputDir, pages, () => {
            log.success(`Built ${pages.length} pages to ./${path.relative(process.cwd(), outputDir)}`);

            if (callback) {
                callback();
            }
        });
    });
}


module.exports = {
    build
};

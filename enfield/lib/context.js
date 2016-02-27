'use strict';

const path = require('path');

const _ = require('lodash');
const async = require('async');
const url = require('url');

const markdown = require('./markdown');

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
 * Create global context. This is provided to every template.
 *
 * @param {array} pageContextsList A list of the context per page.
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
            headings: page.headings
        });

    });

    return menuItems;
}

/**
 * Returns the pagination context
 *
 * @param {array} pageContextList A list of the context per page.
 * @param {object} currentPageContext The context of the current page.
 */
function createPaginationContext(pageContextList, currentPageContext) {

    let context = {};

    let currentIndex = _.findIndex(pageContextList, (p) => {
        return p.url === currentPageContext.url;
    });

    if (currentIndex > 0) {
        let prevPage = pageContextList[currentIndex - 1];
        context.previousPage = {
            title: prevPage.title,
            url: prevPage.url
        };
    }

    if (currentIndex < pageContextList.length - 1) {
        let nextPage = pageContextList[currentIndex + 1];
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
 * @param {object} configPage A page from the config
 * @param {number} pageIndex The index of the current page.
 * @param {function} callback
 */
function createPageContext(configPage, pageIndex, callback) {

    let page = {};

    page.title = configPage.title;
    page.section = configPage.section;
    page.url = path.join('/', slugify(page.section), slugify(page.title), '/');

    // The first page *is* the homepage.
    if (pageIndex === 0) {
        page.url = '/';
    }

    markdown.parse(configPage.markdown, (err, markdownResults) => {
        page.content = markdownResults.html;
        page.headings = markdownResults.headings.map((heading) => {
            let parsedUrl = url.parse(page.url);
            parsedUrl.hash = heading.anchor;
            heading.anchor = url.format(parsedUrl);
            return heading;
        });
        callback(err, page);
    });
}


/**
 * Creates a list with the context for each page.
 *
 * @param {object} config
 * @param {function} callback
 */
function getPageContextList(config, callback) {

    let index = 0;

    // Loop through each page and do the creation of the page asynchrously.
    async.map(config.pages, (page, pageCreationCallback) => {
        createPageContext(page, index++, pageCreationCallback);
    }, (err, pageContextList) => {

        // Add the menu to the context of each page.
        // We do this after the fact because it's much easier
        // to create the menu context with the full list of page contexts.
        pageContextList = pageContextList.map((pageContext) => {

            return {
                menuItems: createMenuContext(pageContextList, pageContext),
                page: pageContext,
                title: config.title,
                pagination: createPaginationContext(pageContextList, pageContext),
                site: config.site
            };

        });

        // console.log('Pages Contexts:' + JSON.stringify(pageContextList, null, 2));
        callback(err, pageContextList);
    });
}

module.exports = {
    getPageContextList: getPageContextList
};

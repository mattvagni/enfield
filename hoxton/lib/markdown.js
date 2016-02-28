'use strict';

const fs = require('fs');

const _ = require('lodash');
const marked = require('marked');
const pygmentize = require('pygmentize-bundled');
const striptags = require('striptags');

const utils = require('./utils');

// Set-up pygmentize highlighting.
marked.setOptions({
    highlight: function(code, lang, callback) {
        const options = { lang: lang, format: 'html' };
        pygmentize(options, code, function(err, result) {
            if (err) {
                utils.raiseError(
                    'There was an error highlighting some code in one of your markdown files.',
                    err
                );
            }

            callback(err, result.toString());
        });
    }
});

/**
 * Creates an instance of a marked renderer with a custom headings 'handling'.
 *
 * After rendering also gives access to the headings that were found.
 *
 * @param {object} config
 */
function createMarkedRender(config) {
    const renderer = new marked.Renderer();

    let headings = [];

    renderer.link = function(href, title, text) {
        href = utils.prefixUrlWithBaseUrl(href, config);
        return `<a href="${href}" title="${title}">${text}</a>`;
    };

    renderer.image = function(src, title, text) {
        src = utils.prefixUrlWithBaseUrl(src, config);
        return `<img src="${src}" title="${title}" alt="${text}">`;
    };

    renderer.heading = function(text, level) {
        const strippedText = striptags(text);
        const escapedText = strippedText.toLowerCase().replace(/[^\w]+/g, '-');

        let string = '';
        string += `<h${level} id="${escapedText}">${text}</h${level}>`;

        headings.push({
            level: level,
            anchor: escapedText,
            heading: _.unescape(strippedText)
        });

        return string;
    };

    return {
        renderer: renderer,
        headings: headings
    };
}

/**
 * Reads a markdown file from disc & parses it.
 *
 * The callback is called with an object:
 * - 'html': The html result of the markdown parsing.
 * - 'headings': An array of headings objects.
 *
 * @param {string} markdownFile The location to the markdownFile to parse.
 * @param {object} config The config
 * @param {function} callback Called with the result of the parsing
 */
function parse(markdownFile, config, callback) {
    let markdownString;
    const markedRenderer = createMarkedRender(config);

    try {
        markdownString = fs.readFileSync(markdownFile, 'utf8');
    }
    catch(e) {
        utils.raiseError(
            `Error trying to read the file ${markdownFile}`, e
        );
    }

    marked(markdownString, {renderer: markedRenderer.renderer}, (err, html) => {

        if (err) {
            utils.raiseError(
                `Error trying to parse the markdown in ${markdownFile}`,
                err
            );
        }

        callback(err, {
            html: html,
            headings: markedRenderer.headings
        });

    });
}

module.exports = {
    parse: parse
};

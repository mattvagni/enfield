'use strict';

const fs = require('fs');

const _ = require('lodash');
const marked = require('marked');
const pygmentize = require('pygmentize-bundled');
const striptags = require('striptags');

const raiseError = require('./raiseError');
const utils = require('./utils');

// Set-up pygmentize highlighting.
marked.setOptions({
    highlight: function(code, lang, callback) {
        const options = { lang: lang, format: 'html' };
        pygmentize(options, code, function(err, result) {
            if (err) {
                raiseError(
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
 * @param {boolean} isPublishBuild Use to deterine whether we need to change image url.
 */
function createMarkedRender(config, isPublishBuild) {
    const renderer = new marked.Renderer();

    let headings = [];

    renderer.link = function(href, title, text) {
        if (isPublishBuild) {
            href = utils.prefixUrlWithBaseUrl(href, config);
        }
        return `<a href="${href}" title="${title}">${text}</a>`;
    };

    renderer.image = function(src, title, text) {
        if (isPublishBuild) {
            src = utils.prefixUrlWithBaseUrl(src, config);
        }
        return `<img src="${src}" title="${title}" alt="${text}">`;
    };

    renderer.heading = function(text, level) {
        const strippedText = striptags(text);
        const escapedText = strippedText.toLowerCase().replace(/[^\w]+/g, '-');

        let string = '';
        string += `<h${level} id="${escapedText}">${text}</h${level}>`;

        if (level < 3) {
            headings.push({
                level: level,
                anchor: escapedText,
                heading: _.unescape(strippedText)
            });
        }

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
 * @param {boolean} isPublishBuild Whether this is a publish build.
 * @param {function} callback Called with the result of the parsing
 */
function parse(markdownFile, config, isPublishBuild, callback) {
    let markdownString;
    const markedRenderer = createMarkedRender(config, isPublishBuild);

    try {
        markdownString = fs.readFileSync(markdownFile, 'utf8');
    }
    catch(e) {
        raiseError(
            `Error trying to read the file ${markdownFile}`, e
        );
    }

    marked(markdownString, {renderer: markedRenderer.renderer}, (err, html) => {

        if (err) {
            raiseError(
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

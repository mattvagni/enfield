'use strict';

const fs = require('fs');

const marked = require('marked');
const pygmentize = require('pygmentize-bundled');
const _ = require('lodash');

const raiseError = require('./raiseError');

const renderer = new marked.Renderer();

let headings = [];

renderer.heading = function(text, level) {
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

    let string = '';
    string += `<h${level} id="${escapedText}">${text}</h${level}>`;

    if (level < 3) {
        headings.push({
            level: level,
            anchor: `#${escapedText}`,
            heading: text
        });
    }

    return string;
};

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
 * Reads a markdown file from disc & parses it.
 *
 * @param {string} markdownFile The location to the markdownFile to parse.
 * @param {function} callback Called with the result of the parsing.
 */
function parse(markdownFile, callback) {
    let markdownString;

    headings = [];

    try {
        markdownString = fs.readFileSync(markdownFile, 'utf8');
    }
    catch(e) {
        raiseError(
            `Error trying to read the file ${markdownFile}`, e
        );
    }

    marked(markdownString, {renderer: renderer}, (err, html) => {

        if (err) {
            raiseError(
                `Error trying to parse the markdown in ${markdownFile}`,
                err
            );
        }

        // This is async so we need to clone the headings & then
        // clear them for the next call to this. If we clear them after
        // the callback then the execution order won't be correct.
        // #javascript
        let copyOfHeadings = _.clone(headings);
        headings = [];

        callback(err, {
            html: html,
            headings: copyOfHeadings
        });

    });
}

module.exports = {
    parse: parse
};

'use strict';

const fs = require('fs');

const marked = require('marked');
const pygmentize = require('pygmentize-bundled');

const raiseError = require('./raiseError');

marked.setOptions({
    highlight: function(code, lang, callback) {
        const options = { lang: lang, format: 'html' };
        pygmentize(options, code, function(err, result) {
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
    let markdown;

    try {
        markdown = fs.readFileSync(markdownFile, 'utf8');
    }
    catch(e) {
        raiseError(
            `Error trying to read the file ${markdownFile}`, e
        );
    }

    marked(markdown, (err, string) => {

        if (err) {
            raiseError(
                `Error trying to parse the markdown in ${markdownFile}`,
                err
            );
        }

        callback(err, string);
    });
}

module.exports = {
    parse: parse
};

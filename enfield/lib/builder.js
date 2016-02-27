'use strict';

const path = require('path');
const fs = require('fs-extra');

const swig = require('swig');
const _ = require('lodash');

const log = require('./log');
const raiseError = require('./raiseError');
const context = require('./context');
const utils = require('./utils');

/**
 * The name of the template that is expected to be within
 * the theme.
 */
const templateFileName = 'template.html';

/**
 * Writes a single page to disc.
 *
 * @param {object} pageContext The context to a single page.
 * @param {string} template The template
 * @param {string} outputDir Where to output the page to.
 */
function writePage(pageContext, template, outputDir) {

    let outputPath = path.join(
        outputDir, pageContext.page.url, '/index.html'
    );
    let html;

    try {
        html = swig.render(template, { locals: pageContext});
    }
    catch(swigError) {
        raiseError(
            'Error rendering your theme\'s template.',
            swigError
        );
    }

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
}

/**
 * This copies all files from the root of the theme folder
 * besides the template file since that's useless.
 *
 * @param {object} config
 * @param {string} outputDir
 */
function copyThemeFiles(config, outputDir) {

    // No need to try catch this as our config guarantees this.
    const files = fs.readdirSync(config.theme);
    const filesToCopy = _.without(files, templateFileName);

    filesToCopy.forEach((file) => {
        const src = path.join(config.theme, file);
        const dest = path.join(outputDir, file);
        fs.copy(src, dest);
        log.debug(`${src} -> ${dest}`);
    });
}

/**
 * Copy any files over that the user specified to manually included.
 */
function copyManuallyIncludedFiles(config, outputDir) {

    if (!config.include.length) {
        return;
    }

    config.include.forEach((fileToInclude) => {

        try {
            const dest = path.join(outputDir, fileToInclude);
            fs.copySync(fileToInclude, dest, {
                clobber: true,
                preserveTimestamps: true
            });
            log.debug(`${fileToInclude} -> ${dest}`);
        }
        catch(copyError) {
            raiseError(
                `Error copying ${copyError} to ${dest}`,
                copyError
            );
        }
    });


}

/**
 * Deletes the output dir.
 */
function cleanBuildDirectory(outputDir) {

    let realWorkingDir = fs.realpathSync(process.cwd());
    let realOutputDir = fs.realpathSync(outputDir);

    if (realWorkingDir === realOutputDir || realWorkingDir.length > realOutputDir.length) {
        raiseError(
            'Your output directory must be subfolder. This is because enfield deletes ' +
            'it each time before rebuilding. We don\'t ever want to delete anything ' +
            'outside of the current working directory. Ever.'
        );
    }

    log.debug(`Deleting ${outputDir}`);
    fs.emptyDirSync(outputDir);
}

/**
 * Build :allthethings:
 *
 * @param {object} config
 * @param {string} outputDir
 * @param {boolean} isPublishBuild
 * @param {function} callback Called once all pages are built.
 */
function build(config, outputDir, isPublishBuild, callback) {

    const templateLocation = path.join(config.theme, templateFileName);

    // No need to try catch this as our config guarantees this.
    const template = fs.readFileSync(templateLocation, 'utf8');

    cleanBuildDirectory(outputDir);
    copyThemeFiles(config, outputDir);

    // Copy any files the user manually specified to include
    copyManuallyIncludedFiles(config, outputDir);

    // If this is a 'publish' build then respect the config's base_url
    swig.setFilter('url', function(input) {

        if (!input) {
            throw Error(
                `In your theme's template, you can only use the 'url' filter on strings of at least 1 character in length. ${Object.prototype.toString.call(input)} not a string`
            );
        }

        if (isPublishBuild) {
            return utils.prefixUrlWithBaseUrl(input, config);
        }
        return input;
    });

    context.getPageContextList(config, isPublishBuild, (err, pages) => {

        pages.forEach((pageContext) => {
            writePage(pageContext, template, outputDir);
        });

        log.success(`Built "${config.title}" pages to ${path.relative(process.cwd(), outputDir)}`);

        if (callback) {
            callback();
        }

    });
}

module.exports = {
    build: build,
    templateFileName: templateFileName
};

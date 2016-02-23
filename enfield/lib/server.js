'use strict';

const http = require('http');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

const log = require('./log');

module.exports = {
    serve(dir, port, callback) {
        const serve = serveStatic(dir);

        var server = http.createServer(function(req, res) {
            var done = finalhandler(req, res);
            serve(req, res, done);
        });

        server.listen(port, function() {
            log.success(`Server listening on: http://localhost:${port}`);
        });
    }
};

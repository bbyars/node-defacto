'use strict';

var Templatizer = require('./templatizer'),
    Contract = require('./contract'),
    interceptor = require('./httpInterceptor'),
    url = require('url'),
    fs = require('fs'),
    http = require('http');

function capture (options) {
    var host = url.parse(options.baseURL).host,
        basePath = url.parse(options.baseURL).pathname,
        templatizer = Templatizer.create(options.possiblePaths),
        contract = Contract.create(templatizer);

    function read () {
        return JSON.parse(fs.readFileSync(options.filename));
    }

    function write (spec) {
        fs.writeFileSync(options.filename, JSON.stringify(spec, null, 4));
    }

    function withSpec (handler) {
        var spec = read();
        handler(spec);
        write(spec);
    }

    function getPathFrom (requestOptions) {
        var parts = url.parse(requestOptions.path, true),
            path = parts.pathname.replace(basePath, '/');

        return templatizer.parse(path).template;
    }

    function shouldCapture (request) {
        var requestHost = request.hostname || 'localhost',
            path = getPathFrom(request);

        if (request.port && request.port !== 80) {
            requestHost += ':' + request.port;
        }
        return requestHost.toLowerCase() === host.toLowerCase() &&
            request.path.indexOf(basePath) === 0 &&
            options.possiblePaths.indexOf(path) >= 0;
    }

    function isJSON (str) {
        try {
            JSON.parse(str);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    interceptor.intercept(function (request, response) {
        if (!shouldCapture(request)) {
            return;
        }

        withSpec(function (spec) {
            contract.merge(spec, request, response);
        });

    });

    // Initialize with bare-bones spec
    write({
        swagger: '2.0',
        info: {
            title: options.title || 'test',
            version: options.version || '1'
        },
        host: host,
        basePath: basePath,
        paths: {}
    });
}

module.exports = {
    capture: capture
};

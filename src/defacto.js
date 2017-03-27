'use strict';

var Templatizer = require('./templatizer'),
    Contract = require('./contract'),
    interceptor = require('./httpInterceptor'),
    url = require('url'),
    fs = require('fs');

function capture (options) {
    var host = url.parse(options.baseURL).host,
        basePath = url.parse(options.baseURL).pathname,
        templatizer = Templatizer.create(options.paths),
        contract = Contract.create(templatizer);

    function read () {
        return JSON.parse(fs.readFileSync(options.filename));
    }

    function write (spec) {
        fs.writeFileSync(options.filename, JSON.stringify(spec, null, 4));
    }

    function getPathFrom (request) {
        var parts = url.parse(request.path, true),
            path = parts.pathname.replace(basePath, '/');

        return templatizer.parse(path).template;
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

    function shouldCapture (request, response) {
        var requestHost = request.hostname || 'localhost',
            path = getPathFrom(request);

        return requestHost.toLowerCase() === host.toLowerCase() &&
            request.path.indexOf(basePath) === 0 &&
            options.paths.indexOf(path) >= 0 &&
            isJSON(response.body);
    }

    interceptor.intercept(function (request, response) {
        if (!shouldCapture(request, response)) {
            return;
        }

        if (isJSON(request.body)) {
            request.body = JSON.parse(request.body);
        }
        if (isJSON(response.body)) {
            response.body = JSON.parse(response.body);
        }

        var spec = read();
        contract.merge(spec, request, response);
        write(spec);
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

'use strict';

var Templatizer = require('./templatizer'),
    Contract = require('./contract'),
    url = require('url'),
    fs = require('fs'),
    http = require('http');

function intercept (obj, fn, interceptor, resultProcessor) {
    var original = obj[fn];
    obj[fn] = function () {
        var args = Array.prototype.slice.call(arguments);

        // Allow returning new args array to change parameters to intercepted function
        var nextArgs = interceptor.apply(this, args) || args;
        var result = original.apply(this, nextArgs || args);

        if (typeof resultProcessor !== 'undefined') {
            resultProcessor(result);
        }
        return result;
    };
}

function capture (options) {
    var host = url.parse(options.baseURL).host,
        basePath = url.parse(options.baseURL).pathname;

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

    function shouldCapture (requestOptions) {
        var requestHost = requestOptions.hostname || requestOptions.host || 'localhost',
            path = getPathFrom(requestOptions);

        if (requestOptions.port) {
            requestHost += ':' + requestOptions.port;
        }
        return requestHost.toLowerCase() === host.toLowerCase() &&
            requestOptions.path.indexOf(basePath) === 0 &&
            options.paths.indexOf(path) >= 0;
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

    var currentRequest = {};

    intercept(http, 'request', function (requestOptions, callback) {
        if (typeof requestOptions === 'string') {
            requestOptions = url.parse(requestOptions);
        }

        if (!shouldCapture(requestOptions)) {
            return;
        }

        var callbackWithInterceptor = function (response) {
            var packets = [];

            response.on('data', function (chunk) {
                packets.push(chunk);
            });

            response.on('end', function () {
                withSpec(function (spec) {
                    // From request...
                    var path = getPathFrom(currentRequest.options),
                        query = getQueryFrom(currentRequest.options),
                        pathSpec = getPathSpec(path, spec),
                        operationSpec = getOperationSpec(currentRequest.options.method, pathSpec),
                        resourceType = getResourceTypeFrom(path),
                        bodyParam = {},
                        responseBody = Buffer.concat(packets).toString('utf8');

                    if (!isJSON(responseBody)) {
                        // Don't capture for non-JSON responses
                        return;
                    }

                    ensureParametersAdded(query, 'query', operationSpec.parameters);
                    if (isTemplated(path)) {
                        var params = {};
                        params[getPathParameterNameFrom(path)] = getTemplateIdFrom(
                            url.parse(currentRequest.options.path).pathname.replace(basePath, '/'));
                        ensureParametersAdded(params, 'path', operationSpec.parameters);
                    }

                    if (isJSON(currentRequest.body)) {
                        bodyParam[resourceType] = JSON.parse(currentRequest.body);
                        ensureParametersAdded(bodyParam, 'body', operationSpec.parameters);
                    }

                    ensureResponseAdded(response.statusCode, JSON.parse(responseBody), operationSpec.responses);
                });
            });

            if (defined(callback)) {
                callback(response);
            }
        };

        // Save for next call
        currentRequest = {
            method: '',
            path: ''
        };

        // Return changed callback
        return [requestOptions, callbackWithInterceptor];
    }, function (request) {
        intercept(request, 'write', function (body) {
            currentRequest.body = body;
        });
    });

    // Initialize with bare-bones spec
    write({ swagger: '2.0', paths: {} });
}

module.exports = {
    capture: capture
};

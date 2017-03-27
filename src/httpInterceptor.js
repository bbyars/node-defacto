'use strict';

var url = require('url'),
    http = require('http');

function intercept (interceptor) {
    var currentRequest = {},
        restores = [];

    function interceptFunction (obj, fn, interceptorFn, resultProcessor) {
        var original = obj[fn];
        obj[fn] = function () {
            var args = Array.prototype.slice.call(arguments);

            // Allow returning new args array to change parameters to intercepted function
            var nextArgs = interceptorFn.apply(this, args) || args;
            var result = original.apply(this, nextArgs || args);

            if (typeof resultProcessor !== 'undefined') {
                resultProcessor(result);
            }
            return result;
        };

        restores.push(function () { obj[fn] = original; });
    }

    interceptFunction(http, 'request', function (requestOptions, callback) {
        if (typeof requestOptions === 'string') {
            requestOptions = url.parse(requestOptions);
        }

        // Save for next call
        var hostname = requestOptions.hostname;
        if (requestOptions.port !== 80) {
            hostname += ':' + requestOptions.port;
        }
        currentRequest = {
            hostname: hostname,
            method: requestOptions.method,
            path: requestOptions.path,
            headers: requestOptions.headers || {}
        };

        var callbackWithInterceptor = function (response) {
            var packets = [];

            response.on('data', function (chunk) {
                packets.push(chunk);
            });

            response.on('end', function () {
                var currentResponse = {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: Buffer.concat(packets).toString('utf8')
                };

                interceptor(currentRequest, currentResponse);
                currentRequest = {};
            });

            if (typeof callback !== 'undefined') {
                callback(response);
            }
        };

        // Return changed callback to add our response callback
        return [requestOptions, callbackWithInterceptor];
    }, function (request) {
        interceptFunction(request, 'write', function (body) {
            currentRequest.body = body;
        });
    });

    return {
        cancel: function () { restores.forEach(function (restore) { restore(); }); }
    };
}

module.exports = {
    intercept: intercept
};


'use strict';

var Q = require('q'),
    http = require('http');

function responseFor (options) {
    options.hostname = options.hostname || 'localhost';

    var deferred = Q.defer(),
        request = http.request(options, function (response) {
            var packets = [];

            response.on('data', function (chunk) {
                packets.push(chunk);
            });

            response.on('end', function () {
                response.body = Buffer.concat(packets).toString('utf8');
                deferred.resolve(response);
            });
        });

    request.on('error', deferred.reject);

    if (options.body) {
        if (typeof options.body === 'object') {
            request.write(JSON.stringify(options.body));
        }
        else {
            request.write(options.body);
        }
    }
    request.end();
    return deferred.promise;
}

function get (path, port) {
    return responseFor({ method: 'GET', path: path, port: port });
}

function post (path, body, port) {
    return responseFor({ method: 'POST', path: path, port: port, body: body });
}

function del (path, port) {
    return responseFor({ method: 'DELETE', path: path, port: port });
}

function put (path, body, port) {
    return responseFor({ method: 'PUT', path: path, port: port, body: body });
}

module.exports = {
    get: get,
    post: post,
    del: del,
    put: put,
    responseFor: responseFor
};

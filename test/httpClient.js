'use strict';

var Q = require('q'),
    http = require('http');

function responseFor (options) {
    var deferred = Q.defer();

    var request = http.request(options, function (response) {
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
        request.write(JSON.stringify(options.body));
    }
    request.end();
    return deferred.promise;
}

function get (path) {
    return responseFor({ hostname: 'localhost', port: 2525, method: 'GET', path: path });
}

function post (path, body) {
    return responseFor({ hostname: 'localhost', port: 2525, method: 'POST', path: path, body: body });
}

function del (path) {
    return responseFor({ hostname: 'localhost', port: 2525, method: 'DELETE', path: path});
}

function put (path, body) {
    return responseFor({ hostname: 'localhost', port: 2525, method: 'PUT', path: path, body: body });
}

module.exports = {
    get: get,
    post: post,
    del: del,
    put: put,
    responseFor: responseFor
};

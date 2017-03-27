'use strict';

var http = require('http'),
    Q = require('q');

function create (port) {
    var deferred = Q.defer(),
        nextResponse = { statusCode: 200 },
        server = http.createServer(function (request, response) {
            response.writeHead(nextResponse.statusCode);
            response.end(nextResponse.body);
        }),
        setNextResponse = function (response) { nextResponse = response; },
        close = function () {
            var closeDeferred = Q.defer();
            server.close(function () { closeDeferred.resolve(); });
            return closeDeferred.promise;
        };

    server.listen(port, function () {
        deferred.resolve({
            setNextResponse: setNextResponse,
            close: close
        });
    });

    return deferred.promise;
}

module.exports = {
    create: create
};

'use strict';

var assert = require('assert'),
    promiseIt = require('./testHelpers').promiseIt,
    interceptor = require('../src/httpInterceptor'),
    httpClient = require('./httpClient'),
    httpServer = require('./httpServer');

describe.only('httpInterceptor', function () {
    describe('#_intercept', function () {
        promiseIt('should translate request and response into simpler structure', function () {
            var interceptedRequest, interceptedResponse, server, interception;

            interception = interceptor.intercept(function (request, response) {
                interceptedRequest = request;
                interceptedResponse = response;
            });

            return httpServer.create(3000).then(function (_server) {
                server = _server;
                server.setNextResponse({
                    statusCode: 400,
                    body: 'Body'
                });

                return httpClient.responseFor({
                    method: 'POST',
                    path: '/path?q=true',
                    port: 3000,
                    body: 'Body',
                    headers: { accept: 'application/json' }
                });
            }).then(function () {
                return server.close();
            }).finally(function () {
                interception.cancel();

                assert.deepEqual(interceptedRequest, {
                    hostname: 'localhost:3000',
                    path: '/path?q=true',
                    method: 'POST',
                    body: 'Body',
                    headers: { accept: 'application/json' }
                });
                delete interceptedResponse.headers;
                assert.deepEqual(interceptedResponse, {
                    statusCode: 400,
                    body: 'Body'
                });
            });
        });
    });
});

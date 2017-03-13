'use strict';

require('../src/app.js').capture('http://localhost:2525/', 'test-swagger.json');

var client = require('./httpClient');

// assumes mountebank running on port 2525 and nothing on port 8080

client.get('/imposters?replayable=true').then(function (response) {
    console.log(response.statusCode);

    return client.get('/imposters?replayable=true&removeProxies=true');
}).then(function (response) {
    console.log(response.statusCode);

    return client.post('/imposters', {
        protocol: 'http',
        port: 8080,
        stubs: [
            {
                responses: [
                    {
                        proxy: {
                            to: 'http://origin-server.com',
                            'mode': 'proxyAlways',
                            predicateGenerators: [
                                { matches: { path: true } }
                            ]
                        }
                    }
                ]
            },
            {
                predicates: [
                    { equals: { path: '/test' } }
                ],
                responses: [
                    { is: { body: 'first response' } }
                ]
            }
        ]
    });
}).then(function (response) {
    console.log(response.statusCode);
    return client.get('/imposters/8080');
}).then(function (response) {
    console.log(response.statusCode);
    return client.del('/imposters/8080');
}).then(function (response) {
    console.log(response.statusCode);
    return client.del('/imposters');
}).then(function (response) {
    console.log(response.statusCode);
}).done();

'use strict';

require('../src/app.js').capture('http://localhost:2525/', 'test-swagger.json');

var client = require('./httpClient');

client.get('/imposters?replayable=true').then(function (response) {
    console.log(response.statusCode);

    return client.get('/imposters?replayable=true&removeProxies=true');
}).then(function (response) {
    console.log(response.statusCode);

    return client.post('/imposters', {
        protocol: 'http',
        port: 3000,
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
}).done();

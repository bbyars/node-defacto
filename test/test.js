'use strict';

require('../src/app.js').capture('http://localhost:2525/', 'test-swagger.json');

var client = require('./httpClient');

client.get('/imposters?replayable=true').then(function (response) {
    console.log(response.statusCode);
    console.log(response.body);
}).done();

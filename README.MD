# node-litigate

`node-litigate` asserts your API contract, represented as an OpenAPI/Swagger
specification. As the API provider testing your own service, `litigate` allows
you to make two types of assertions:

* The contract specification is up-to-date and correct
* Everything in the contract specification has been tested

As the API consumer testing your application against a stub `litigate` allows
you to verify that the spec you're writing tests against is compatible with
the spec given by the API provider.

## How to use it

`node-litigate` needs to be initialized before any tests are run. In mocha, you can
use a [root-level before hook](https://mochajs.org/#root-level-hooks) to do the trick.
This might be the initialization function for [mountebank](https://github.com/bbyars/mountebank):

````
// Outside of any describe block
before(function () {
    require('node-litigate').capture({
        baseURL: 'http://localhost:2525/',
        paths: ['/', '/imposters', '/imposters/{port}', '/config', '/logs'],
        filename: 'test-swagger.json'
    });
});
````

Then execute your _service_ test suite against your API. `node-litigate` doesn't work
with your unit tests. It can only capture the test contract expectations for those
tests that use node's `http` module to call your API over the wire. In the example
above, all test traffic sent to <http://localhost:2525/> is analyzed, which represents
the `host` and `basePath` elements at the root of the OpenAPI specification.
The complete OpenAPI specification that the tests expect is captured in
`test-swagger.json`, which can be diffed to the actual spec for the assertions.

## How does it work

`node-litigate` wraps the `http` module, capturing all client requests and responses
that match the `host` and `basePath` given in the first parameter to the `capture`
function. Each time a new OpenAPI `path` and `operation` is detected, it is added
to the spec. Each time `litigate` detects a new input `parameter`, it adds it to the
spec. Each time a new `response` is detected, it is added to the spec. Every request
and response JSON body is captured, and all fields and types are added to the spec.

## Limitations

* `node-litigate` assumes JSON.
* It assumes you're testing against an HTTP API rather than an HTTPS one
* It assumes no tests are running in parallel
* It does nothing with headers, more or less assuming application/json
* It assumes you never use chunked encoding and always write the request body in one fell swoop
* It does not detect required fields. Future versions can assume required if ALL tests pass it in

## Contributing

`node-litigate` is not written in ES6 because it needs to support the oldest
supported version of node (4.0), which does not fully support ES6.

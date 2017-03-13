# node-litigate

`node-litigate` asserts your API contract, represented as an OpenAPI/Swagger
specification. `litigate` allows you to make two types of assertions:

* The contract specification is up-to-date and correct
* Everything in the contract specification has been tested

## How to use it

`node-litigate` needs to be initialized before any tests are run. In mocha, you can
use a [root-level before hook](https://mochajs.org/#root-level-hooks) to do the trick:

````
// Outside of any describe block
before(function () {
    require('node-litigate').capture('http://localhost:2525/', 'test-swagger.json');
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
to the spec. Each time a new input `parameter`, it is added to the spec. Each time
a new `response` is detected, it is added to the spec. Every request and response
JSON body is captured, and all fields and types are added to the spec.

## Limitations

* Path parameters are detected by assuming a RESTful URL scheme with no sub-resources,
so /customers/123 will capture 123 as the `id` parameter.
* `node-litigate` assumes JSON.
* It assumes you're testing against an HTTP API rather than an HTTPS one
* It assumes no tests are running in parallel
* It does nothing with headers, more or less assuming application/json
* It assumes you never use chunked encoding and always write the request body in one fell swoop

## Contributing

`node-litigate` is not written in ES6 because it needs to support the oldest
supported version of node (4.0), which does not fully support ES6.

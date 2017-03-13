'use strict';

var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    util = require('util'),
    templatePattern = /\/(\w+)\/(\w+)/;

function intercept (obj, fn, interceptor) {
    var original = obj[fn];
    obj[fn] = function () {
        var args = Array.prototype.slice.call(arguments);
        interceptor.apply(this, args);

        var result = original.apply(this, args);
        result.chain = function (fn, chained) {
            intercept(result, fn, chained);
            return result;
        };
        return result;
    }
}

function defined (obj) {
    return typeof obj !== 'undefined';
}

function capture (baseURL, filename) {
    var parts = url.parse(baseURL),
        host = parts.host,
        basePath = parts.path;

    function read () {
        return JSON.parse(fs.readFileSync(filename));
    }

    function write (spec) {
        fs.writeFileSync(filename, JSON.stringify(spec, null, 4));
    }

    function withSpec (handler) {
        var spec = read();
        handler(spec);
        write(spec);
    }

    function shouldCapture (options) {
        var requestHost = options.hostname || options.host || 'localhost';
        if (options.port) {
            requestHost += ':' + options.port;
        }
        return requestHost.toLowerCase() === host.toLowerCase()
            && options.path.indexOf(basePath) === 0;
    }

    function isTemplated (path) {
        return templatePattern.test(path);
    }

    function templatize (path) {
        return util.format('/%s/{id}', path.match(templatePattern)[1]);
    }

    function getTemplateIdFrom (path) {
        return path.match(templatePattern)[2];
    }

    function getPathFrom (requestOptions) {
        var parts = url.parse(requestOptions.path, true),
            path = parts.pathname.replace(basePath, '/');

        if (isTemplated(path)) {
            path = templatize(path);
        }
        console.log('PATH: ' + path);

        return path;
    }

    function getQueryFrom (requestOptions) {
        return url.parse(requestOptions.path, true).query;
    }

    function getPathSpec (path, spec) {
        if (!defined(spec.paths[path])) {
            spec.paths[path] = {};
        }

        return spec.paths[path];
    }

    function singularize(resourceType) {
        return resourceType.replace(/s$/, '');
    }

    function getResourceTypeFrom (path) {
        var resourceType = path.match(templatePattern)[1];
        return isTemplated(path) ? singularize(resourceType) : resourceType;
    }

    function getOperationSpec (method, pathSpec) {
        if (!defined(pathSpec[method.toLowerCase()])) {
            pathSpec[method.toLowerCase()] = {
                responses: {},
                parameters: []
            };
        }

        return pathSpec[method.toLowerCase()];
    }

    function ensureParametersAdded (params, type, paramsSpec) {
        Object.keys(params).forEach(function (name) {
            var spec = paramsSpec.find(function (param) {
                return param.name === name;
            });
            if (!defined(spec)) {
                paramsSpec.push({
                    name: name,
                    in: type,
                    type: typeof params[name]
                });
            }
            else {
                if (spec.in !== type) {
                    console.error('Spec parameter %s in both %s and %s', name, spec.in, type);
                }
                if (spec.type !== typeof params[name]) {
                    console.error('Spec parameter %s of type %s and %s', spec.type, typeof params[name]);
                }
            }
        });
    }

    function getResponse (response, responsesSpec) {
        if (!defined(responsesSpec[response.statusCode])) {
            responsesSpec[response.statusCode] = {
                description: '',
                schema: {},
                examples: { 'application/json': response.body } // Only grabs first example...
            };
        }

        return responsesSpec[response.statusCode];
    }

    var currentOptions;

    intercept(http, 'request', function (options) {
        if (typeof options === 'string') {
            options = url.parse(options);
        }

        if (!shouldCapture(options)) {
            return;
        }

        withSpec(function (spec) {
            var path = getPathFrom(options),
                query = getQueryFrom(options),
                pathSpec = getPathSpec(path, spec),
                operationSpec = getOperationSpec(options.method, pathSpec);

            ensureParametersAdded(query, 'query', operationSpec.parameters);
            if (isTemplated(path)) {
                ensureParametersAdded({ id: getTemplateIdFrom(path) }, 'path', operationSpec.parameters);
            }
        });

        // Save for next call
        currentOptions = options;
    });

    // Initialize with bare-bones spec
    write({ swagger: '2.0', paths: {} });
}

module.exports = {
    capture: capture
};

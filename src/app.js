'use strict';

var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    util = require('util'),
    templatePattern = /\/([^\/]+)\/([^\/]+)/;

function defined (obj) {
    return typeof obj !== 'undefined';
}

function type (obj) {
    if (util.isArray(obj)) {
        return 'array';
    }
    else {
        return typeof obj;
    }
}

function intercept (obj, fn, interceptor, resultProcessor) {
    var original = obj[fn];
    obj[fn] = function () {
        var args = Array.prototype.slice.call(arguments);

        // Allow returning new args array to change parameters to intercepted function
        var nextArgs = interceptor.apply(this, args) || args;
        var result = original.apply(this, nextArgs);

        if (defined(resultProcessor)) {
            resultProcessor(result);
        }
        return result;
    }
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
        if (isTemplated(path)) {
            return singularize(path.match(templatePattern)[1]);
        }
        else {
            return path.replace('/', '');
        }
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

    function ensureAllPropertiesAdded (obj, propertiesSpec) {
        Object.keys(obj).forEach(function (name) {
            if (!defined(propertiesSpec[name])) {
                propertiesSpec[name] = {};
            }

            if (type(obj[name]) === 'object' || type(obj[name]) === 'array') {
                ensureSchemaAdded(obj[name], propertiesSpec[name]);
            }
            else {
                if (!defined(propertiesSpec[name].type)) {
                    propertiesSpec[name].type = type(obj[name]);
                }
                if (propertiesSpec[name].type !== type(obj[name])) {
                    console.error(name + ' parameter of both type ' + propertiesSpec[name].type + ' and ' + type(obj[name]));
                }
            }
        });
    }

    function ensureSchemaAdded (obj, schemaSpec) {
        switch(type(obj)) {
            case 'array':
                if (!defined(schemaSpec.type)) {
                    schemaSpec.type = 'array';
                    schemaSpec.items = {};
                }

                if (schemaSpec.type !== 'array') {
                    console.error('Parameter is array in some contexts but not others');
                }
                obj.forEach(function (item) {
                    ensureSchemaAdded(item, schemaSpec.items);
                });
                break;

            case 'object':
                if (!defined(schemaSpec.properties)) {
                    schemaSpec.properties = {};
                }
                ensureAllPropertiesAdded(obj, schemaSpec.properties);
                break;

            default:
                console.log('ERROR: SCHEMA CALLED WITH ' + JSON.stringify(obj));
        }
    }

    function ensureParametersAdded (params, paramType, paramsSpec) {
        Object.keys(params).forEach(function (name) {
            var spec = paramsSpec.find(function (param) {
                return param.name === name;
            });
            if (!defined(spec)) {
                spec = { name: name, in: paramType };
                if (paramType === 'body') {
                    spec.schema = {};
                }
                else {
                    spec.type = type(params[name]);
                }
                paramsSpec.push(spec);
            }

            if (spec.in !== paramType) {
                console.error('Spec parameter %s in both %s and %s', name, spec.in, paramType);
            }
            if (paramType !== 'body' && spec.type !== type(params[name])) {
                console.error('Spec parameter %s of type %s and %s', spec.type, type(params[name]));
            }

            if (paramType === 'body') {
                ensureSchemaAdded(params[name], spec.schema);
            }
        });
    }

    function ensureResponseAdded (statusCode, body, responsesSpec) {
        if (!defined(responsesSpec[statusCode])) {
            responsesSpec[statusCode] = {
                schema: {},
                examples: { 'application/json': body } // Only grabs first example...
            };
        }

        ensureSchemaAdded(body, responsesSpec[statusCode].schema);
    }

    var currentOptions;

    intercept(http, 'request', function (options, callback) {
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

        var callbackWithInterceptor = function (response) {
            var packets = [];

            response.on('data', function (chunk) {
                packets.push(chunk);
            });

            response.on('end', function () {
                withSpec(function (spec) {
                    var body = JSON.parse(Buffer.concat(packets).toString('utf8')),
                        path = getPathFrom(currentOptions),
                        pathSpec = getPathSpec(path, spec),
                        operationSpec = getOperationSpec(currentOptions.method, pathSpec);

                    ensureResponseAdded(response.statusCode, body, operationSpec.responses);
                });
            });

            if (defined(callback)) {
                callback(response);
            }
        };

        // Save for next call
        currentOptions = options;

        // Return changed callback
        return [options, callbackWithInterceptor];
    }, function (request) {
        intercept(request, 'write', function (body) {
            withSpec(function (spec) {
                var path = getPathFrom(currentOptions),
                    pathSpec = getPathSpec(path, spec),
                    operationSpec = getOperationSpec(currentOptions.method, pathSpec),
                    resourceType = getResourceTypeFrom(path),
                    param = {};

                param[resourceType] = JSON.parse(body);
                ensureParametersAdded(param, 'body', operationSpec.parameters);
            });
        });
    });

    // Initialize with bare-bones spec
    write({ swagger: '2.0', paths: {} });
}

module.exports = {
    capture: capture
};

'use strict';

var url = require('url'),
    type = require('./type');

function defined (obj) {
    return typeof obj !== 'undefined';
}

function create (templatizer) {
    function getTemplateFor (request) {
        var path = url.parse(request.path, true).pathname;
        return templatizer.parse(path);
    }

    function getQueryFrom (request) {
        return url.parse(request.path, true).query;
    }

    function getPathSpec (path, spec) {
        if (!defined(spec.paths[path])) {
            spec.paths[path] = {};
        }

        return spec.paths[path];
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

    function ensureTypeAdded (obj, spec) {
        if (!defined(spec.type)) {
            spec.type = type.of(obj);
        }

        // I saw the array for type field here: https://developer.nytimes.com/most_popular_api_v2.json/swagger.json
        if (type.of(spec.type) === 'string' && spec.type !== type.of(obj)) {
            spec.type = [spec.type, type.of(obj)];
        }
        else if (type.of(spec.type) === 'array' && spec.type.indexOf(type.of(obj)) < 0) {
            spec.type.push(type.of(obj));
        }
    }

    function ensureAllPropertiesAdded (obj, propertiesSpec) {
        Object.keys(obj).forEach(function (name) {
            propertiesSpec[name] = propertiesSpec[name] || {};

            if (type.of(obj[name]) === 'object' || type.of(obj[name]) === 'array') {
                ensureSchemaAdded(obj[name], propertiesSpec[name]);
            }
            else {
                ensureTypeAdded(obj[name], propertiesSpec[name]);
            }
        });
    }

    function ensureSchemaAdded (obj, schemaSpec) {
        ensureTypeAdded(obj, schemaSpec);

        if (type.of(obj) === 'array') {
            schemaSpec.items = schemaSpec.items || {};
            obj.forEach(function (item) {
                ensureSchemaAdded(item, schemaSpec.items);
            });
        }
        else if (type.of(obj) === 'object') {
            schemaSpec.properties = schemaSpec.properties || {};
            ensureAllPropertiesAdded(obj, schemaSpec.properties);
        }
    }

    function ensureParametersAdded (params, paramType, paramsSpec) {
        Object.keys(params).forEach(function (name) {
            var spec = paramsSpec.find(function (param) { return param.name === name; });

            if (!defined(spec)) {
                spec = { name: name, in: paramType };
                if (paramType === 'body') {
                    spec.schema = {};
                }
                else {
                    spec.type = type.of(params[name]);
                }
                paramsSpec.push(spec);
            }

            if (paramType === 'body') {
                ensureSchemaAdded(params[name], spec.schema);
            }
            else {
                ensureTypeAdded(params[name], spec);
            }
        });
    }

    function ensureResponseAdded (response, responsesSpec) {
        if (!defined(responsesSpec[response.statusCode])) {
            responsesSpec[response.statusCode] = { schema: {}, description: '' };
        }

        if (defined(response.body)) {
            ensureSchemaAdded(response.body, responsesSpec[response.statusCode].schema);
        }
    }

    function merge (spec, request, response) {
        var template = getTemplateFor(request),
            path = template.template,
            query = getQueryFrom(request),
            pathSpec = getPathSpec(path, spec),
            operationSpec = getOperationSpec(request.method, pathSpec);

        ensureParametersAdded(query, 'query', operationSpec.parameters);
        ensureParametersAdded(template.parameters, 'path', operationSpec.parameters);

        if (defined(request.body)) {
            ensureParametersAdded({ body: request.body }, 'body', operationSpec.parameters);
        }

        ensureResponseAdded(response, operationSpec.responses);
        return spec;
    }

    return {
        merge: merge
    };
}

module.exports = {
    create: create
};

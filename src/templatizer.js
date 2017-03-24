'use strict';

function create (possiblePaths) {
    var patterns = {},
        templatePattern = /(\{[^}]+})/g;

    possiblePaths.forEach(function (path) {
        patterns[path] = {
            namePattern: new RegExp(path.replace(templatePattern, '(\\$1)')),
            valuePattern: new RegExp('^' + path.replace(templatePattern, '([^/]+)') + '$')
        }
    });

    function findTemplateFor (path) {
        return Object.keys(patterns).find(function (possiblePath) {
            return patterns[possiblePath].valuePattern.test(path);
        });
    }

    function parametersFor (path) {
        var template = findTemplateFor(path),
            names = patterns[template].namePattern.exec(template),
            values = patterns[template].valuePattern.exec(path),
            parameters = {};

        for (var i = 1; i < names.length; i++) {
            var name = names[i].replace('{', '').replace('}', '');
            parameters[name] = values[i];
        }
        return parameters;
    }

    function test (path) {
        return typeof findTemplateFor(path) !== 'undefined';
    }

    function parse (path) {
        return {
            template: findTemplateFor(path) || path,
            parameters: parametersFor(path)
        };
    }

    return {
        test: test,
        parse: parse
    };
}

module.exports = {
    create: create
};

'use strict';

var util = require('util');

function isInteger (value) {
    return (typeof value === 'number' && value.toString().indexOf('.') < 0) ||
           (typeof value === 'string' && /^\d+$/.test(value));
}

function isDouble (value) {
    return (typeof value === 'number' && value.toString().indexOf('.') >= 0) ||
           (typeof value === 'string' && /^\d*\.\d+$/.test(value));
}

function isBoolean (value) {
    var booleanWords = ['true', 'false'];
    return typeof value === 'string' && booleanWords.indexOf(value) >= 0;
}

function of (value) {
    if (util.isArray(value)) {
        return 'array';
    }
    else if (isInteger(value)) {
        return 'integer';
    }
    else if (isDouble(value)) {
        return 'number';
    }
    else if (isBoolean(value)) {
        return 'boolean';
    }
    else if (value === null) {
        return 'null';
    }
    else {
        return typeof value;
    }
}

module.exports = {
    of: of
};

'use strict';

var util = require('util');

function isInteger (obj) {
    return (typeof obj === 'number' && obj.toString().indexOf('.') < 0)
        || (typeof obj === 'string' && /^\d+$/.test(obj));
}

function of (obj) {
    if (util.isArray(obj)) {
        return 'array';
    }
    else if (isInteger(obj)) {
        return 'integer';
    }
    else if (obj === null) {
        return 'null';
    }
    else if (obj === 'true' || obj === 'false') {
        return 'boolean';
    }
    else {
        return typeof obj;
    }
}

module.exports = {
    of: of
};

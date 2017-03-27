'use strict';

var assert = require('assert'),
    type = require('../src/type');

describe('type', function () {
    describe('#of', function () {
        it('should be array if value is an array', function () {
            assert.strictEqual('array', type.of([]));
        });

        it('should be null if value is null', function () {
            assert.strictEqual('null', type.of(null));
        });

        it('should be a string if value is a non-numeric string', function () {
            assert.strictEqual('string', type.of('2a'));
        });

        it('should be a boolean if value is "true"', function () {
            assert.strictEqual('boolean', type.of('true'));
        });

        it('should be a boolean if value is "false"', function () {
            assert.strictEqual('boolean', type.of('false'));
        });

        it('should be an integer if value is an integer', function () {
            assert.strictEqual('integer', type.of(123));
        });

        it('should be an integer if value is a numeric string', function () {
            assert.strictEqual('integer', type.of('123'));
        });

        it('should be a number if value is a float', function () {
            assert.strictEqual('number', type.of(123.4));
        });

        it('should be a number if value is a numeric string with a decimal point', function () {
            assert.strictEqual('number', type.of('123.4'));
        });
    });
});

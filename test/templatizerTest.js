'use strict';

var assert = require('assert'),
    Templatizer = require('../src/templatizer');

describe('templatizer', function () {
    describe('#test', function () {
        it('should return false if no possiblePaths given', function () {
            var templatizer = Templatizer.create([]);
            assert.ok(!templatizer.test('/resource/123'));
        });

        it('should return true if matches resource template', function () {
            var templatizer = Templatizer.create(['/resource/{id}']);
            assert.ok(templatizer.test('/resource/123'));
        });

        it('should return false if does not match resource template', function () {
            var templatizer = Templatizer.create(['/resource/{id}']);
            assert.ok(!templatizer.test('/resource'));
        })
    });

    describe('#parse', function () {
        it('should return literal path if not templated', function () {
            var templatizer = Templatizer.create(['/resource']),
                template = templatizer.parse('/resource');
            assert.deepEqual(template, { template: '/resource', parameters: {} });
        });

        it('should return template with parameter for resource template', function () {
            var templatizer = Templatizer.create(['/resource/{id}']),
                template = templatizer.parse('/resource/123');
            assert.deepEqual(template, {
                template: '/resource/{id}',
                parameters: { id: '123' }
            });
        });

        it('should return template with multiple parameters', function () {
            var templatizer = Templatizer.create(['/resource/{id}', '/resource/{id}/subresource/{subId}']),
                template = templatizer.parse('/resource/123/subresource/abc');
            assert.deepEqual(template, {
                template: '/resource/{id}/subresource/{subId}',
                parameters: { id: '123', subId: 'abc' }
            });
        });
    });
});

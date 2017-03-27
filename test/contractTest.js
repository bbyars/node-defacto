'use strict';

var assert = require('assert'),
    Templatizer = require('../src/templatizer'),
    Contract = require('../src/contract');

describe('contract', function () {
    describe('#merge', function () {
        it('should add path if it does not already exist', function () {
            var templatizer = Templatizer.create(['/']),
                contract = { paths: {} },
                request = { path: '/', method: 'GET' },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/': {
                        get: {
                            parameters: [],
                            responses: {
                                200: { schema: {}, description: '' }
                            }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add operation if does not already exist but path does', function () {
            var templatizer = Templatizer.create(['/']),
                contract = { paths: { '/': { post: {} } } },
                request = { path: '/', method: 'GET' },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/': {
                        post: {},
                        get: {
                            parameters: [],
                            responses: {
                                200: { schema: {}, description: '' }
                            }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add query parameters', function () {
            var templatizer = Templatizer.create(['/']),
                contract = { paths: {} },
                request = { path: '/?first=1&second=abc', method: 'GET' },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/': {
                        get: {
                            parameters: [
                                {
                                    name: 'first',
                                    in: 'query',
                                    type: 'integer'
                                },
                                {
                                    name: 'second',
                                    in: 'query',
                                    type: 'string'
                                }
                            ],
                            responses: { 200: { schema: {}, description: '' } }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add path parameters', function () {
            var templatizer = Templatizer.create(['/animals/{type}/{name}']),
                contract = { paths: {} },
                request = { path: '/animals/cat/timbles', method: 'GET' },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/animals/{type}/{name}': {
                        get: {
                            parameters: [
                                {
                                    name: 'type',
                                    in: 'path',
                                    type: 'string'
                                },
                                {
                                    name: 'name',
                                    in: 'path',
                                    type: 'string'
                                }
                            ],
                            responses: { 200: { schema: {}, description: '' } }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add simple body parameters', function () {
            var templatizer = Templatizer.create(['/animals']),
                contract = { paths: {} },
                request = {
                    path: '/animals',
                    method: 'POST',
                    body: { type: 'cat', name: 'timbles' }
                },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/animals': {
                        post: {
                            parameters: [
                                {
                                    name: 'body',
                                    in: 'body',
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string' },
                                            name: { type: 'string' }
                                        }
                                    }
                                }
                            ],
                            responses: { 200: { schema: {}, description: '' } }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add nested body parameters', function () {
            var templatizer = Templatizer.create(['/animals']),
                contract = { paths: {} },
                request = {
                    path: '/animals',
                    method: 'POST',
                    body: {
                        type: 'cat',
                        identity: {
                            name: 'timbles',
                            gender: 'M'
                        }
                    }
                },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/animals': {
                        post: {
                            parameters: [
                                {
                                    name: 'body',
                                    in: 'body',
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string' },
                                            identity: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    gender: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            ],
                            responses: { 200: { schema: {}, description: '' } }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add array body parameters', function () {
            var templatizer = Templatizer.create(['/animals']),
                contract = { paths: {} },
                request = {
                    path: '/animals',
                    method: 'PUT',
                    body: {
                        animals: [
                            { type: 'cat', name: 'timbles' },
                            { type: 'dog', name: 'fido' }
                        ]
                    }
                },
                response = { statusCode: 200 },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/animals': {
                        put: {
                            parameters: [
                                {
                                    name: 'body',
                                    in: 'body',
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            animals: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        type: { type: 'string' },
                                                        name: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            ],
                            responses: { 200: { schema: {}, description: '' } }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });

        it('should add simple response body', function () {
            var templatizer = Templatizer.create(['/animals']),
                contract = { paths: {} },
                request = { path: '/animals', method: 'GET' },
                response = {
                    statusCode: 200,
                    body: { type: 'cat', name: 'timbles' }
                },
                spec = Contract.create(templatizer).merge(contract, request, response);

            assert.deepEqual(spec, {
                paths: {
                    '/animals': {
                        get: {
                            parameters: [],
                            responses: {
                                200: {
                                    description: '',
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string' },
                                            name: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }, JSON.stringify(spec, null, 4));
        });
    });
});

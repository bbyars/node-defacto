'use strict';

var fs = require('fs'),
    thisPackage = require('./package.json'),
    version = process.env.DEFACTO_GRUNT_VERSION || thisPackage.version;

module.exports = function (grunt) {

    require('time-grunt')(grunt);

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-eslint');

    grunt.initConfig({
        mochaTest: {
            unit: {
                options: { reporter: 'spec' },
                src: ['test/**/*.js']
            },
            functional: {
                options: { reporter: 'spec' },
                src: ['functionalTest/**/*.js']
            }
        },
        eslint: {
            target: [
                'Gruntfile.js',
                'src/**/*.js',
                'test/**/*.js',
                'functionalTest/**/*.js'
            ]
        }
    });

    grunt.registerTask('version', 'Set the version number', function () {
        var newPackage = require('./package.json');

        newPackage.version = version;
        console.log('Using version ' + version);
        fs.writeFileSync('./package.json', JSON.stringify(newPackage, null, 2) + '\n');
    });

    grunt.registerTask('test:unit', 'Run the unit tests', ['mochaTest:unit']);
    grunt.registerTask('test:functional', 'Run the functional tests', ['mochaTest:functional']);
    grunt.registerTask('test', 'Run all non-performance tests', ['test:unit', 'test:functional']);
    grunt.registerTask('default', ['eslint', 'version', 'test']);
};

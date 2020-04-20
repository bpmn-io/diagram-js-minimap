'use strict';

// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox', 'IE', 'PhantomJS' ]
var browsers = (process.env.TEST_BROWSERS || 'PhantomJS').split(',');

// use puppeteer provided Chrome for testing
process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(karma) {
  karma.set({

    frameworks: [
      'mocha',
      'sinon-chai'
    ],

    files: [
      'test/spec/*Spec.js'
    ],

    preprocessors: {
      'test/spec/*Spec.js': [ 'webpack' ]
    },

    reporters: [ 'spec' ],

    browsers,

    autoWatch: false,
    singleRun: true,

    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.css$/,
            use: 'raw-loader'
          }
        ]
      }
    }
  });
};

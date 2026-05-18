'use strict';

// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox' ]
var browsers = (process.env.TEST_BROWSERS || 'ChromeHeadless').split(',');

// use puppeteer provided Chrome for testing

module.exports = async function(karma) {
  process.env.CHROME_BIN = await require('puppeteer').executablePath();
  karma.set({

    frameworks: [
      'mocha',
      'webpack'
    ],

    files: [
      'test/spec/*Spec.js'
    ],

    preprocessors: {
      'test/spec/*Spec.js': [ 'webpack' ]
    },

    browsers,

    autoWatch: false,
    singleRun: true,

    webpack: {
      mode: 'development',
      module: {
        rules: [
          {
            test: /test\/globals\.js$/,
            sideEffects: true
          },
          {
            test: /\.css$/,
            type: 'asset/source'
          }
        ]
      }
    }
  });
};

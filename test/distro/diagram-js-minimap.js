const {
  expect
} = require('chai');

describe('diagram-js-minimap', function() {

  it('should expose CJS bundle', function() {

    const {
      DiagramJSMinimap
    } = require('../..');

    expect(DiagramJSMinimap).to.exist;
  });

  it('should expose UMD bundle', function() {
    const {
      DiagramJSMinimap
    } = require('../../dist/diagram-minimap.umd.js');

    expect(DiagramJSMinimap).to.exist;
  });

});

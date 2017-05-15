var svgAttr = require('tiny-svg/lib/attr'),
    svgClone = require('tiny-svg/lib/clone');

function GraphicsUtil(elementRegistry) {

  this.createElement = function(element) {
    var gfx = elementRegistry.getGraphics(element);

    if (gfx) {
      var djsVisual = getDjsVisual(gfx);

      if (djsVisual) {
        var elementGfx = svgClone(djsVisual);
        svgAttr(elementGfx, { id: element.id });

        return elementGfx;
      } else {
        console.log('djsVisual not found');
      }

    } else {
      console.log('gfx not found');
    }
  };

}

module.exports = GraphicsUtil;

function getDjsVisual(gfx) {
  return [].slice.call(gfx.childNodes).filter(function(childNode) {
    return childNode.getAttribute('class') === 'djs-visual';
  })[0];
}

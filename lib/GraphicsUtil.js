import {
  attr as svgAttr,
  clone as svgClone
} from 'tiny-svg';


export default class GraphicsUtil {
  constructor(elementRegistry) {
    this._elementRegistry = elementRegistry;
  }

  createElement(element) {
    const gfx = this._elementRegistry.getGraphics(element);

    if (gfx) {
      const djsVisual = getDjsVisual(gfx);

      if (djsVisual) {
        const elementGfx = svgClone(djsVisual);
        svgAttr(elementGfx, { id: element.id });

        return elementGfx;
      } else {
        console.log('djsVisual not found');
      }

    } else {
      console.log('gfx not found');
    }
  }

}

// helpers //////////

function getDjsVisual(gfx) {
  return [].slice.call(gfx.childNodes).filter(childNode => {
    return childNode.getAttribute('class') === 'djs-visual';
  })[0];
}

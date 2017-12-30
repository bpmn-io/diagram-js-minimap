'use strict';

var bootstrapDiagram = require('../TestHelper').bootstrapDiagram,
    inject = require('../TestHelper').inject;


var minimapModule = require('../../');

var modelingModule = require('diagram-js/lib/features/modeling'),
    moveCanvasModule = require('diagram-js/lib/navigation/movecanvas'),
    zoomScrollModule = require('diagram-js/lib/navigation/zoomscroll'),
    moveModule = require('diagram-js/lib/features/move');


describe('Minimap', function() {

  beforeEach(bootstrapDiagram({
    modules: [
      minimapModule,
      modelingModule,
      moveCanvasModule,
      zoomScrollModule,
      moveModule,
      {
        config: [ 'value', {
          minimap: {
            open: true
          }
        } ]
      }
    ]
  }));


  it('should show', inject(function(canvas, modeling, elementFactory) {

    var shapeA = elementFactory.createShape({
      id: 'A',
      width: 100,
      height: 300
    });

    modeling.createShape(shapeA, { x: 100, y: 300 }, canvas.getRootElement());


    var shapeB = elementFactory.createShape({
      id: 'B',
      width: 50,
      height: 50
    });

    modeling.createShape(shapeB, { x: 800, y: 1200 }, canvas.getRootElement());


    var shapeC = elementFactory.createShape({
      id: 'C',
      width: 300,
      height: 300
    });

    modeling.createShape(shapeC, { x: 800, y: 100 }, canvas.getRootElement());
  }));

});
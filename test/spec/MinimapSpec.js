/* global sinon */

import {
  attr as svgAttr,
  remove as domRemove,
  query as domQuery
} from 'min-dom';

import Diagram from 'diagram-js';

import {
  bootstrapDiagram,
  getDiagramJS,
  inject,
  insertCSS,
  withDiagramJs
} from '../TestHelper';

import minimapModule from '../../lib';

import modelingModule from 'diagram-js/lib/features/modeling';
import moveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import moveModule from 'diagram-js/lib/features/move';
import zoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';

import minimapCSS from '../../assets/diagram-js-minimap.css';

insertCSS('diagram-js-minimap.css', minimapCSS);

var viewerModules = [
  minimapModule,
  moveCanvasModule,
  zoomScrollModule
];

var modelerModules = viewerModules.concat([
  modelingModule,
  moveModule
]);


describe('minimap', function() {

  this.timeout(20000);


  describe('viewer', function() {

    beforeEach(bootstrapDiagram({
      modules: viewerModules,
      minimap: {
        open: true
      }
    }));


    it('should show', inject(function(canvas, elementFactory) {

      // when
      var shapeA = elementFactory.createShape({
        id: 'A',
        width: 100,
        height: 300,
        x: 50,
        y: 150
      });

      canvas.addShape(shapeA, canvas.getRootElement());


      var shapeB = elementFactory.createShape({
        id: 'B',
        width: 50,
        height: 50,
        x: 775,
        y: 1175
      });

      canvas.addShape(shapeB, canvas.getRootElement());


      var shapeC = elementFactory.createShape({
        id: 'C',
        width: 300,
        height: 300,
        x: 650,
        y: -50
      });

      canvas.addShape(shapeC, canvas.getRootElement());

      // then
      expectMinimapShapeToExist('A');
      expectMinimapShapeToExist('B');
      expectMinimapShapeToExist('C');
    }));


    it('should show single element', inject(function(canvas, elementFactory) {

      // when
      var shapeA = elementFactory.createShape({
        id: 'A',
        width: 100,
        height: 300,
        x: 50,
        y: 150
      });

      canvas.addShape(shapeA, canvas.getRootElement());

      // then
      expectMinimapShapeToExist('A');
    }));

  });


  describe('modeler', function() {

    beforeEach(bootstrapDiagram({
      modules: modelerModules,
      minimap: {
        open: true
      }
    }));


    it('should show', inject(function(canvas, modeling, elementFactory) {

      // when
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

      var shapes = generateShapes(200, {
        x: -200,
        y: -50,
        width: 3000,
        height: 1000
      });

      // then
      expectMinimapShapeToExist('A');
      expectMinimapShapeToExist('B');
      expectMinimapShapeToExist('C');

      expectMinimapShapesToExist(shapes);
    }));


    it('should update', inject(function(canvas, elementFactory, modeling) {

      // given
      var parent = elementFactory.createShape({
        id: 'parent',
        width: 100,
        height: 100,
        x: 100,
        y: 100
      });

      var child = elementFactory.createShape({
        id: 'child',
        parent: parent,
        width: 50,
        height: 50,
        x: 125,
        y: 125
      });

      var rootElement = canvas.getRootElement();

      modeling.createElements([ parent, child ], { x: 100, y: 100 }, rootElement);

      expectMinimapShapeToExist('parent');
      expectMinimapShapeToExist('child');

      // when
      modeling.resizeShape(parent, { x: 50, y: 50, width: 200, height: 100 });

      // then
      expectMinimapShapeToExist('parent');
      expectMinimapShapeToExist('child');
    }));

  });


  describe('canvas.resized', function() {

    beforeEach(bootstrapDiagram({
      modules: viewerModules,
      minimap: {
        open: true
      }
    }));


    it('should not update if not present in DOM', inject(
      function(canvas, eventBus, minimap) {

        // given
        var spy = sinon.spy(minimap, '_update');

        // when
        domRemove(canvas.getContainer());

        eventBus.fire('canvas.resized');

        // then
        expect(spy).to.not.have.been.called;
      }
    ));
  });


  describe('update', function() {

    it('should not error on viewbox changed', function() {
      var diagram = new Diagram({
        modules: modelerModules
      });

      var canvas = diagram.get('canvas');

      canvas.viewbox({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });
    });


    it('should not error on viewbox changed (malformed values)', function() {
      var diagram = new Diagram({
        modules: modelerModules
      });

      var canvas = diagram.get('canvas');

      canvas.viewbox({
        x: 0,
        y: 0,
        width: Infinity,
        height: Infinity
      });
    });

  });


  describe('mousemove', function() {

    beforeEach(bootstrapDiagram({
      modules: viewerModules,
      minimap: {
        open: true
      }
    }));

    it('should change viewbox on mousemove', inject(function(eventBus, minimap) {

      // given
      var svg = minimap._svg;

      var listener = sinon.spy();

      eventBus.on('canvas.viewbox.changing', listener);

      // when
      triggerMouseEvent('mousedown', svg);
      triggerMouseEvent('mousemove', svg);
      triggerMouseEvent('mousemove', svg);

      // then
      // 1 mousedown + 2 mousemove
      expect(listener).to.have.been.calledThrice;

    }));

  });


  describe('planes', function() {
    beforeEach(bootstrapDiagram({
      modules: viewerModules,
      minimap: {
        open: true
      }
    }));

    withDiagramJs('>=8')('should only show elements of active plane',
      inject(function(canvas, elementFactory) {

        // given
        var rootA = elementFactory.createRoot({
          id: 'rootA'
        });
        var shapeA = elementFactory.createShape({
          id: 'A',
          width: 100,
          height: 300,
          x: 50,
          y: 150
        });

        canvas.addRootElement(rootA);
        canvas.addShape(shapeA, rootA);

        var rootB = elementFactory.createRoot({
          id: 'rootB'
        });
        var shapeB = elementFactory.createShape({
          id: 'B',
          width: 100,
          height: 300,
          x: 50,
          y: 150
        });

        canvas.addRootElement(rootB);
        canvas.addShape(shapeB, rootB);
        canvas.setRootElement(rootA);

        // assume
        expectMinimapShapeToExist('A');
        expectMinimapShapeToNotExist('B');

        // when
        canvas.setRootElement(rootB);

        // then
        expectMinimapShapeToNotExist('A');
        expectMinimapShapeToExist('B');
      }));


    withDiagramJs('^7.4')('should only show elements of active plane',
      inject(function(canvas, elementFactory) {

        // given
        var rootA = elementFactory.createRoot({
          id: 'rootA'
        });
        var shapeA = elementFactory.createShape({
          id: 'A',
          width: 100,
          height: 300,
          x: 50,
          y: 150
        });

        canvas.createPlane('A', rootA);
        canvas.addShape(shapeA, rootA);

        var rootB = elementFactory.createRoot({
          id: 'rootB'
        });
        var shapeB = elementFactory.createShape({
          id: 'B',
          width: 100,
          height: 300,
          x: 50,
          y: 150
        });

        canvas.createPlane('B', rootB);
        canvas.addShape(shapeB, rootB);
        canvas.setActivePlane('A');

        // assume
        expectMinimapShapeToExist('A');
        expectMinimapShapeToNotExist('B');

        // when
        canvas.setActivePlane('B');

        // then
        expectMinimapShapeToNotExist('A');
        expectMinimapShapeToExist('B');
      }));

  });

});


// helpers /////////////////

function generateShapes(count, viewport) {

  return getDiagramJS().invoke(function(canvas, elementFactory, modeling) {
    var rootElement = canvas.getRootElement(),
        shape;

    var shapes = [];

    for (var i = 0; i < count; i++) {
      shape = elementFactory.createShape({
        id: 'shape' + i,
        width: random(10, 300),
        height: random(10, 200),
      });

      shapes.push(modeling.createShape(shape, {
        x: random(viewport.x, viewport.width),
        y: random(viewport.y, viewport.height)
      }, rootElement));
    }

    return shapes;
  });
}

function random(start, end) {
  return Math.round(Math.random() * (end - start) + start);
}

function triggerMouseEvent(type, gfx) {
  var event = document.createEvent('MouseEvent');

  event.initMouseEvent(type, true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);

  return gfx.dispatchEvent(event);
}

function expectMinimapShapeToExist(id) {
  getDiagramJS().invoke(function(elementRegistry, minimap) {
    var element = elementRegistry.get(id);

    expect(element).to.exist;

    var minimapShape = domQuery('g#' + id, minimap._parent);

    expect(minimapShape).to.exist;

    var transform = svgAttr(minimapShape, 'transform');

    var translate = transform.replace('translate(', '').replace(')', '').split(' ');

    var x = parseInt(translate[0], 10),
        y = parseInt(translate[1], 10);

    var parentX = element.parent.x || 0,
        parentY = element.parent.y || 0;

    expect(x).to.equal(element.x - parentX);
    expect(y).to.equal(element.y - parentY);
  });
}

function expectMinimapShapeToNotExist(id) {
  getDiagramJS().invoke(function(elementRegistry, minimap) {
    var element = elementRegistry.get(id);

    expect(element).to.exist;

    var minimapShape = domQuery('g#' + id, minimap._parent);

    expect(minimapShape).to.not.exist;
  });
}

function expectMinimapShapesToExist(shapes) {
  shapes.forEach(function(shape) {
    var id = shape.id;

    expectMinimapShapeToExist(id);
  });
}
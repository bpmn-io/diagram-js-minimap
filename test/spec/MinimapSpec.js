import '../globals';

import {
  attr as svgAttr,
  remove as domRemove,
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import Diagram from 'diagram-js';

import {
  bootstrapDiagram,
  getDiagramJS,
  inject,
  insertCSS,
  withDiagramJs
} from '../TestHelper';

import { expect } from 'chai';

import { assign } from 'min-dash';
import { spy } from 'sinon';

import minimapModule from '../../lib';
import customRendererModule from './marker-renderer';

import modelingModule from 'diagram-js/lib/features/modeling';
import moveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import moveModule from 'diagram-js/lib/features/move';
import zoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';

import minimapCSS from '../../assets/diagram-js-minimap.css';

insertCSS('diagram-js-minimap.css', minimapCSS);

var viewerModules = [
  minimapModule,
  moveCanvasModule,
  zoomScrollModule,
  customRendererModule
];

var modelerModules = viewerModules.concat([
  modelingModule,
  moveModule
]);


describe('minimap', function() {

  this.timeout(5000);


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


    it('should remove elements with ID', inject(function(canvas, elementFactory, minimap) {

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

      var connection = elementFactory.createConnection({
        id: 'connection',
        source: shapeA,
        target: shapeB,
        waypoints: [
          { x: 900, y: 900 },
          { x: 1000, y: 1000 },
          { x: 1100, y: 1100 }
        ],
        marker: {
          start: true,
          mid: true,
          end: true
        }
      });

      canvas.addConnection(connection, canvas.getRootElement());

      // then
      expectMinimapConnectionToExist('connection');

      const elementsWithId = domQueryAll('marker[id]', canvas._svg);
      expect(elementsWithId).to.have.length(3);

      const minimapElementsWithId = domQueryAll('marker[id]', minimap._parent);
      expect(minimapElementsWithId).to.have.length(0);
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


  describe('hidden elements', function() {

    beforeEach(bootstrapDiagram({
      modules: modelerModules,
      minimap: {
        open: true
      }
    }));


    it('should not show hidden element', inject(
      function(canvas, elementFactory) {

        // given
        var parent = elementFactory.createShape({
          id: 'parent', width: 300, height: 300, x: 0, y: 0
        });

        canvas.addShape(parent, canvas.getRootElement());

        // when adding a hidden child (e.g. child of a collapsed shape)
        var child = elementFactory.createShape({
          id: 'child', width: 50, height: 50, x: 20, y: 20, hidden: true
        });

        canvas.addShape(child, parent);

        // then
        expectMinimapShapeToExist('parent');
        expectMinimapShapeToNotExist('child');
      }
    ));


    it('should hide element when it becomes hidden (collapse)', inject(
      function(canvas, elementFactory, eventBus) {

        // given
        var parent = elementFactory.createShape({
          id: 'parent', width: 300, height: 300, x: 0, y: 0
        });

        canvas.addShape(parent, canvas.getRootElement());

        var child = elementFactory.createShape({
          id: 'child', width: 50, height: 50, x: 20, y: 20
        });

        canvas.addShape(child, parent);

        // assume
        expectMinimapShapeToExist('child');

        // when collapsing the parent hides its children
        child.hidden = true;

        eventBus.fire('elements.changed', { elements: [ parent, child ] });

        // then
        expectMinimapShapeToNotExist('child');
      }
    ));


    it('should show element again when it becomes visible (expand)', inject(
      function(canvas, elementFactory, eventBus) {

        // given
        var parent = elementFactory.createShape({
          id: 'parent', width: 300, height: 300, x: 0, y: 0
        });

        canvas.addShape(parent, canvas.getRootElement());

        var child = elementFactory.createShape({
          id: 'child', width: 50, height: 50, x: 20, y: 20, hidden: true
        });

        canvas.addShape(child, parent);

        // assume
        expectMinimapShapeToNotExist('child');

        // when expanding the parent shows its children again
        child.hidden = false;

        eventBus.fire('elements.changed', { elements: [ parent, child ] });

        // then
        expectMinimapShapeToExist('child');
      }
    ));

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
        var updateSpy = spy(minimap, '_update');

        // when
        domRemove(canvas.getContainer());

        eventBus.fire('canvas.resized');

        // then
        expect(updateSpy).to.not.have.been.called;
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


  describe('toggle', function() {

    describe('closed', function() {

      beforeEach(bootstrapDiagram({
        modules: viewerModules
      }));


      it('should be button', inject(function(minimap) {

        // when
        var toggle = minimap._toggle;

        // then
        expect(toggle.tagName).to.eql('BUTTON');
        expect(toggle.type).to.eql('button');
      }));


      it('should be focusable', inject(function(minimap) {

        // when
        minimap._toggle.focus();

        // then
        expect(document.activeElement).to.equal(minimap._toggle);
      }));


      it('should be collapsed initially', inject(function(minimap) {

        // then
        expect(minimap._toggle.getAttribute('aria-expanded')).to.eql('false');
      }));


      it('should keep <aria-expanded> in sync on click', inject(function(minimap) {

        // when
        minimap._toggle.click();

        // then
        expect(minimap._toggle.getAttribute('aria-expanded')).to.eql('true');

        // when
        minimap._toggle.click();

        // then
        expect(minimap._toggle.getAttribute('aria-expanded')).to.eql('false');
      }));

    });


    describe('open', function() {

      beforeEach(bootstrapDiagram({
        modules: viewerModules,
        minimap: {
          open: true
        }
      }));


      it('should be expanded initially', inject(function(minimap) {

        // then
        expect(minimap._toggle.getAttribute('aria-expanded')).to.eql('true');
      }));

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

      var listener = spy();

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


  describe('parent context', function() {

    var rootA, rootB, rootC, subA, subB;

    function levels(root) {
      if (root.id === 'rootB') {
        return [ { root: rootA, focus: subA, label: 'Level A' } ];
      }

      if (root.id === 'rootC') {
        return [
          { root: rootA, focus: subA, label: 'Level A' },
          { root: rootB, focus: subB, label: 'Level B' }
        ];
      }

      return null;
    }

    beforeEach(bootstrapDiagram({
      modules: viewerModules,
      minimap: {
        open: true,
        parentContext: function(root) {
          return levels(root);
        }
      }
    }));

    beforeEach(inject(function(canvas, elementFactory) {

      function addRoot(id, shapes) {
        var root = elementFactory.createRoot({ id: id });

        canvas.addRootElement(root);

        shapes.forEach(function(s) {
          canvas.addShape(elementFactory.createShape(s), root);
        });

        return root;
      }

      rootA = addRoot('rootA', [
        { id: 'subA', x: 50, y: 50, width: 100, height: 80 },
        { id: 'otherA', x: 300, y: 50, width: 100, height: 80 }
      ]);

      rootB = addRoot('rootB', [
        { id: 'subB', x: 50, y: 50, width: 100, height: 80 }
      ]);

      rootC = addRoot('rootC', [
        { id: 'innerC', x: 50, y: 50, width: 100, height: 80 }
      ]);

      subA = rootA.children[0];
      subB = rootB.children[0];
    }));


    function contextPanels(minimap) {
      return domQueryAll('.context-level', minimap._parent);
    }


    withDiagramJs('>=8')('should keep map on active root',
      inject(function(canvas) {

        // when
        canvas.setRootElement(rootB);

        // then
        expectMinimapShapeToExist('subB');
        expectMinimapShapeToNotExist('subA');
      }));


    withDiagramJs('>=8')('should render ancestor level',
      inject(function(canvas, minimap) {

        // when
        canvas.setRootElement(rootB);

        // then
        var panels = contextPanels(minimap);

        expect(panels).to.have.length(1);
        expect(panels[0].querySelectorAll('.djs-minimap-focus')).to.have.length(1);
        expect(panels[0].querySelector('.context-header').textContent).to.equal('Parent: Level A');
      }));


    withDiagramJs('>=8')('should render multiple levels, outermost first',
      inject(function(canvas, minimap) {

        // when
        canvas.setRootElement(rootC);

        // then
        var panels = contextPanels(minimap);

        expect(panels).to.have.length(2);
        expect(panels[0].querySelector('.context-header').textContent).to.equal('2 levels up: Level A');
        expect(panels[1].querySelector('.context-header').textContent).to.equal('Parent: Level B');
      }));


    withDiagramJs('>=8')('should render no levels without context',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootC);

        // when
        canvas.setRootElement(rootA);

        // then
        expect(contextPanels(minimap)).to.have.length(0);
        expect(minimap._parent.classList.contains('has-context')).to.be.false;
      }));


    function expand(panel) {
      panel.querySelector('.context-header').click();
    }

    function viewBoxOf(panel) {
      return panel.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
    }

    function wheel(panel, options) {
      var svg = panel.querySelector('svg'),
          rect = svg.getBoundingClientRect();

      svg.dispatchEvent(new WheelEvent('wheel', Object.assign({
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      }, options)));
    }


    withDiagramJs('>=8')('should zoom ancestor level on ctrl + wheel',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        var before = viewBoxOf(panel),
            canvasViewbox = canvas.viewbox();

        // when
        wheel(panel, { deltaY: -50, ctrlKey: true });

        // then
        expect(viewBoxOf(panel)[2]).to.be.below(before[2]);
        expect(canvas.viewbox().scale).to.equal(canvasViewbox.scale);
      }));


    withDiagramJs('>=8')('should not zoom ancestor level on plain wheel',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        var before = viewBoxOf(panel);

        // when
        wheel(panel, { deltaY: -50 });

        // then
        expect(viewBoxOf(panel)).to.eql(before);
      }));


    withDiagramJs('>=8')('should limit zoom of ancestor level',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        var initial = viewBoxOf(panel);

        // when
        for (var i = 0; i < 100; i++) {
          wheel(panel, { deltaY: -50, ctrlKey: true });
        }

        var zoomedIn = viewBoxOf(panel)[2];

        for (i = 0; i < 100; i++) {
          wheel(panel, { deltaY: 50, ctrlKey: true });
        }

        // then
        expect(initial[2] / zoomedIn).to.be.closeTo(8, 0.001);
        expect(viewBoxOf(panel)[2]).to.be.closeTo(initial[2], 0.001);
      }));


    withDiagramJs('>=8')('should reset ancestor level on double click',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        var initial = viewBoxOf(panel);

        wheel(panel, { deltaY: -50, ctrlKey: true });

        // when
        panel.querySelector('svg').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

        // then
        expect(viewBoxOf(panel)).to.eql(initial);
      }));


    withDiagramJs('>=8')('should zoom ancestor levels individually',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootC);

        var panels = contextPanels(minimap);

        expand(panels[0]);
        expand(panels[1]);

        var second = viewBoxOf(panels[1]);

        // when
        wheel(panels[0], { deltaY: -50, ctrlKey: true });

        // then
        expect(viewBoxOf(panels[1])).to.eql(second);
      }));


    withDiagramJs('>=8')('should collapse ancestor levels by default',
      inject(function(canvas, minimap) {

        // when
        canvas.setRootElement(rootC);

        // then
        contextPanels(minimap).forEach(function(panel) {
          expect(panel.classList.contains('expanded')).to.be.false;
          expect(panel.querySelector('.context-body').offsetHeight).to.equal(0);
        });
      }));


    withDiagramJs('>=8')('should expand ancestor level on header click',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        // when
        expand(panel);

        // then
        expect(panel.classList.contains('expanded')).to.be.true;
        expect(panel.querySelector('.context-header').getAttribute('aria-expanded')).to.equal('true');
        expect(panel.querySelector('.context-body').offsetHeight).to.be.above(0);
      }));


    withDiagramJs('>=8')('should keep viewport aligned with map when expanding',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0],
            viewport = minimap._viewportDom;

        var before = viewport.getBoundingClientRect().top;

        // when
        expand(panel);

        // then: map moved down by the body height, viewport follows
        var after = viewport.getBoundingClientRect().top,
            map = minimap._map.getBoundingClientRect(),
            mapTop = map.top;

        expect(after).to.be.above(before);
        expect(Math.abs(after - mapTop - (viewport.offsetTop - (mapTop - minimap._parent.getBoundingClientRect().top)))).to.be.below(1);
      }));


    withDiagramJs('>=8')('should not let viewport take clicks on ancestor level',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        // hit testing only works for points inside the window
        panel.scrollIntoView();

        // the viewport can extend over the levels
        var rect = panel.getBoundingClientRect();

        assign(minimap._viewportDom.style, {
          top: '-1000px',
          left: '-1000px',
          width: '4000px',
          height: '4000px'
        });

        // when
        var target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

        // then
        expect(panel.contains(target)).to.be.true;
      }));


    withDiagramJs('>=8')('should center hover zoom on focus element',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);

        var panel = contextPanels(minimap)[0];

        expand(panel);

        // when
        panel.querySelector('.context-body').dispatchEvent(new MouseEvent('mouseenter'));

        // then
        var origin = panel.querySelector('svg').style.getPropertyValue('--minimap-context-zoom-origin');

        expect(origin).to.match(/^-?[\d.]+px -?[\d.]+px$/);
      }));


    withDiagramJs('>=8')('should label levels by distance',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootC);

        // then
        var headers = Array.from(contextPanels(minimap)).map(function(panel) {
          return panel.querySelector('.context-header').textContent;
        });

        expect(headers).to.eql([ '2 levels up: Level A', 'Parent: Level B' ]);
      }));


    withDiagramJs('>=8')('should allow overriding the level prefix',
      inject(function(canvas, minimap) {

        // given
        minimap._config.parentContextPrefix = function(distance) {
          return distance === 1 ? '' : '^' + distance;
        };

        // when
        canvas.setRootElement(rootC);

        // then
        var headers = Array.from(contextPanels(minimap)).map(function(panel) {
          return panel.querySelector('.context-header').textContent;
        });

        expect(headers).to.eql([ '^2 Level A', 'Level B' ]);
      }));


    withDiagramJs('>=8')('should remember expanded ancestor level',
      inject(function(canvas, minimap) {

        // given
        canvas.setRootElement(rootB);
        expand(contextPanels(minimap)[0]);

        // when
        canvas.setRootElement(rootC);

        // then
        var panels = contextPanels(minimap);

        expect(panels[0].classList.contains('expanded')).to.be.true;
        expect(panels[1].classList.contains('expanded')).to.be.false;
      }));


    withDiagramJs('>=8')('should render levels when opened later',
      inject(function(canvas, minimap) {

        // given
        minimap.close();
        canvas.setRootElement(rootB);

        // when
        minimap.open();

        // then
        expect(contextPanels(minimap)).to.have.length(1);
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

    var minimapShape = domQuery(`g[id^="djs-minimap-${id}"]`, minimap._parent);

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

function expectMinimapConnectionToExist(id) {
  getDiagramJS().invoke(function(elementRegistry, minimap) {
    var element = elementRegistry.get(id);

    expect(element).to.exist;

    var minimapShape = domQuery(`g[id^="djs-minimap-${id}"]`, minimap._parent);

    expect(minimapShape).to.exist;
  });
}


function expectMinimapShapeToNotExist(id) {
  getDiagramJS().invoke(function(elementRegistry, minimap) {
    var element = elementRegistry.get(id);

    expect(element).to.exist;

    var minimapShape = domQuery(`g[id^="djs-minimap-${id}-"]`, minimap._parent);

    expect(minimapShape).to.not.exist;
  });
}

function expectMinimapShapesToExist(shapes) {
  shapes.forEach(function(shape) {
    var id = shape.id;

    expectMinimapShapeToExist(id);
  });
}
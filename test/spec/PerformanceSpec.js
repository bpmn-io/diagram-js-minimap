import '../globals';

import {
  query as domQuery,
  queryAll as domQueryAll
} from 'min-dom';

import {
  bootstrapDiagram,
  inject,
  insertCSS
} from '../TestHelper';

import { expect } from 'chai';
import { spy } from 'sinon';

import minimapModule from '../../lib';

import modelingModule from 'diagram-js/lib/features/modeling';

import minimapCSS from '../../assets/diagram-js-minimap.css';

insertCSS('diagram-js-minimap.css', minimapCSS);

var testModules = [
  minimapModule,
  modelingModule
];


describe('minimap - performance', function() {

  this.timeout(20000);


  describe('update batching', function() {

    beforeEach(bootstrapDiagram({
      modules: testModules,
      minimap: {
        open: true,
        debounceDelay: 30
      }
    }));


    it('should batch element additions into a single update', inject(
      async function(canvas, elementFactory, minimap) {

        // given
        var updateSpy = spy(minimap, '_update');

        var root = canvas.getRootElement();

        // when adding many elements in one go
        for (var i = 0; i < 100; i++) {
          var shape = elementFactory.createShape({
            id: 'shape' + i,
            width: 20,
            height: 20,
            x: i * 25,
            y: 0
          });

          canvas.addShape(shape, root);
        }

        // then
        // no expensive per-element viewbox update happens synchronously
        // (previously this was one _update per added element => 100)
        expect(updateSpy.callCount, 'synchronous updates').to.be.below(5);

        // but the element tree is kept up-to-date eagerly
        expect(domQueryAll('g[id^="djs-minimap-shape"]', minimap._parent))
          .to.have.length(100);

        // when waiting for the debounce to settle
        await wait(100);

        // then a single batched update has run
        expect(updateSpy.callCount, 'total updates').to.be.below(5);
      }
    ));


    it('should force a live update after the skip delay', inject(
      async function(canvas, elementFactory, minimap) {

        // given a very short skip delay
        minimap._config.debounceSkipDelay = 0;

        var updateSpy = spy(minimap, '_update');

        var root = canvas.getRootElement();

        var shapeA = elementFactory.createShape({
          id: 'a', width: 20, height: 20, x: 0, y: 0
        });

        canvas.addShape(shapeA, root);

        // when a second change arrives after the skip delay elapsed
        await wait(10);

        var shapeB = elementFactory.createShape({
          id: 'b', width: 20, height: 20, x: 40, y: 0
        });

        canvas.addShape(shapeB, root);

        // then an update was forced immediately (not debounced)
        expect(updateSpy).to.have.been.called;
      }
    ));

  });


  describe('closed minimap', function() {

    beforeEach(bootstrapDiagram({
      modules: testModules,
      minimap: {
        open: false
      }
    }));


    it('should not perform element work while closed', inject(
      function(canvas, elementFactory, minimap) {

        // given
        var addSpy = spy(minimap, '_addElement'),
            createSpy = spy(minimap, '_createElement');

        var root = canvas.getRootElement();

        // when adding elements while the minimap is closed
        for (var i = 0; i < 50; i++) {
          var shape = elementFactory.createShape({
            id: 'shape' + i,
            width: 20,
            height: 20,
            x: i * 25,
            y: 0
          });

          canvas.addShape(shape, root);
        }

        // then no (expensive) element cloning happened
        expect(addSpy).not.to.have.been.called;
        expect(createSpy).not.to.have.been.called;

        expect(domQueryAll('g[id^="djs-minimap-shape"]', minimap._parent))
          .to.have.length(0);
      }
    ));


    it('should rebuild from active root on open', inject(
      function(canvas, elementFactory, minimap) {

        // given
        var root = canvas.getRootElement();

        for (var i = 0; i < 50; i++) {
          var shape = elementFactory.createShape({
            id: 'shape' + i,
            width: 20,
            height: 20,
            x: i * 25,
            y: 0
          });

          canvas.addShape(shape, root);
        }

        // assume nothing rendered while closed
        expect(domQueryAll('g[id^="djs-minimap-shape"]', minimap._parent))
          .to.have.length(0);

        // when opening
        minimap.open();

        // then the minimap is rebuilt from the active root
        expect(domQueryAll('g[id^="djs-minimap-shape"]', minimap._parent))
          .to.have.length(50);
      }
    ));

  });


  describe('child ordering', function() {

    beforeEach(bootstrapDiagram({
      modules: testModules,
      minimap: {
        open: true
      }
    }));


    it('should render children in business-object order', inject(
      function(canvas, elementFactory, minimap) {

        // given
        var parent = elementFactory.createShape({
          id: 'parent', width: 400, height: 200, x: 0, y: 0
        });

        canvas.addShape(parent, canvas.getRootElement());

        // when adding children
        [ 'c0', 'c1', 'c2' ].forEach(function(id, index) {
          var child = elementFactory.createShape({
            id: id, width: 40, height: 40, x: index * 60, y: 10
          });

          canvas.addShape(child, parent);
        });

        // then minimap child order matches business object order
        expect(getMinimapChildOrder(minimap, 'parent'))
          .to.eql([ 'c0', 'c1', 'c2' ]);
      }
    ));


    it('should re-insert an updated child at its correct index', inject(
      function(canvas, elementFactory, elementRegistry, minimap) {

        // given
        var parent = elementFactory.createShape({
          id: 'parent', width: 400, height: 200, x: 0, y: 0
        });

        canvas.addShape(parent, canvas.getRootElement());

        [ 'c0', 'c1', 'c2' ].forEach(function(id, index) {
          var child = elementFactory.createShape({
            id: id, width: 40, height: 40, x: index * 60, y: 10
          });

          canvas.addShape(child, parent);
        });

        // when re-adding a middle child (remove + add via index lookup)
        minimap._updateElement(elementRegistry.get('c1'));

        // then it lands back at index 1, order is preserved
        expect(getMinimapChildOrder(minimap, 'parent'))
          .to.eql([ 'c0', 'c1', 'c2' ]);
      }
    ));

  });

});


// helpers /////////////////

function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function getMinimapChildOrder(minimap, parentId) {
  var parentGfx = domQuery(
    'g[id^="djs-minimap-' + parentId + '"]',
    minimap._parent
  );

  var childGfx = domQueryAll('g[id^="djs-minimap-c"]', parentGfx);

  var prefix = 'djs-minimap-',
      suffix = '-' + minimap._minimapId;

  return [].map.call(childGfx, function(gfx) {

    // djs-minimap-<id>-<minimapId> -> <id>
    return gfx.id.slice(prefix.length, gfx.id.length - suffix.length);
  });
}

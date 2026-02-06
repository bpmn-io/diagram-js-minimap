import {
  bootstrapDiagram,
  inject
} from '../TestHelper';

import minimapModule from '../../lib';
import modelingModule from 'diagram-js/lib/features/modeling';

var modelerModules = [
  minimapModule,
  modelingModule
];


describe('minimap performance', function() {

  this.timeout(30000);

  beforeEach(bootstrapDiagram({
    modules: modelerModules,
    minimap: {
      open: true
    }
  }));


  describe('debounced updates', function() {

    it('should batch multiple element additions', inject(
      function(canvas, elementFactory, modeling, minimap) {

        // given
        var updateSpy = sinon.spy(minimap, '_update');

        // when - add 100 elements rapidly
        for (var i = 0; i < 100; i++) {
          var shape = elementFactory.createShape({
            id: 'shape-' + i,
            width: 100,
            height: 100
          });

          modeling.createShape(shape, { x: 100 + i * 10, y: 100 }, canvas.getRootElement());
        }

        // Wait a bit for debounced update
        return new Promise(function(resolve) {
          setTimeout(function() {

            // then - should have significantly fewer updates than element additions
            // With debouncing, we expect ~1-2 updates for 100 additions
            // (one from the batch, possibly one more if timing is close to debounce delay)
            expect(updateSpy.callCount).to.be.below(10);
            expect(updateSpy.callCount).to.be.above(0);

            resolve();
          }, 200); // Wait longer than debounce delay
        });
      }
    ));


    it('should batch multiple element removals', inject(
      function(canvas, elementFactory, modeling, minimap) {

        // given - create elements first
        var shapes = [];
        for (var i = 0; i < 50; i++) {
          var shape = elementFactory.createShape({
            id: 'shape-' + i,
            width: 100,
            height: 100
          });

          shapes.push(modeling.createShape(
            shape,
            { x: 100 + i * 10, y: 100 },
            canvas.getRootElement()
          ));
        }

        return new Promise(function(resolve) {
          setTimeout(function() {

            // when - remove all elements
            var updateSpy = sinon.spy(minimap, '_update');

            shapes.forEach(function(shape) {
              modeling.removeShape(shape);
            });

            setTimeout(function() {

              // then - should have significantly fewer updates than removals
              expect(updateSpy.callCount).to.be.below(10);
              expect(updateSpy.callCount).to.be.above(0);

              resolve();
            }, 200);
          }, 200);
        });
      }
    ));


    it('should batch element changes', inject(
      function(canvas, elementFactory, modeling, minimap) {

        // given - create elements first
        var shapes = [];
        for (var i = 0; i < 20; i++) {
          var shape = elementFactory.createShape({
            id: 'shape-' + i,
            width: 100,
            height: 100
          });

          shapes.push(modeling.createShape(
            shape,
            { x: 100 + i * 10, y: 100 },
            canvas.getRootElement()
          ));
        }

        return new Promise(function(resolve) {
          setTimeout(function() {

            // when - move all elements
            var updateSpy = sinon.spy(minimap, '_update');

            shapes.forEach(function(shape) {
              modeling.moveShape(shape, { x: 20, y: 20 });
            });

            setTimeout(function() {

              // then - should batch the updates
              expect(updateSpy.callCount).to.be.below(10);
              expect(updateSpy.callCount).to.be.above(0);

              resolve();
            }, 200);
          }, 200);
        });
      }
    ));

  });


  describe('immediate updates', function() {

    it('should update immediately on viewport change', inject(
      function(canvas, minimap) {

        // given
        var updateImmediateSpy = sinon.spy(minimap, '_updateImmediate');

        // when
        canvas.viewbox({ x: 100, y: 100, width: 500, height: 500 });

        // then
        expect(updateImmediateSpy).to.have.been.called;
      }
    ));


    it('should update immediately on canvas resize', inject(
      function(eventBus, minimap) {

        // given
        var updateImmediateSpy = sinon.spy(minimap, '_updateImmediate');

        // when
        eventBus.fire('canvas.resized');

        // then
        expect(updateImmediateSpy).to.have.been.called;
      }
    ));


    it('should update immediately on minimap open', inject(
      function(minimap) {

        // given
        minimap.close();
        var updateImmediateSpy = sinon.spy(minimap, '_updateImmediate');

        // when
        minimap.open();

        // then
        expect(updateImmediateSpy).to.have.been.called;
      }
    ));

  });


  describe('configurable debounce delay', function() {

    beforeEach(bootstrapDiagram({
      modules: modelerModules,
      minimap: {
        open: true,
        debounceDelay: 50 // Custom delay
      }
    }));


    it('should use custom debounce delay', inject(
      function(canvas, elementFactory, modeling, minimap) {

        // then
        expect(minimap._debounceDelay).to.equal(50);
      }
    ));

  });


  describe('performance with large diagrams', function() {

    it('should handle 500+ elements efficiently', inject(
      function(canvas, elementFactory, modeling, minimap) {

        // given
        var updateSpy = sinon.spy(minimap, '_update');
        var startTime = Date.now();

        // when - add 500 elements
        for (var i = 0; i < 500; i++) {
          var shape = elementFactory.createShape({
            id: 'shape-' + i,
            width: 50,
            height: 50
          });

          modeling.createShape(shape, {
            x: 100 + (i % 50) * 60,
            y: 100 + Math.floor(i / 50) * 60
          }, canvas.getRootElement());
        }

        return new Promise(function(resolve) {
          setTimeout(function() {
            var elapsed = Date.now() - startTime;

            // then - should complete in reasonable time and with batched updates
            expect(elapsed).to.be.below(10000); // Should complete within 10 seconds
            expect(updateSpy.callCount).to.be.below(50); // Should have far fewer updates than elements

            resolve();
          }, 300);
        });
      }
    ));

  });

});

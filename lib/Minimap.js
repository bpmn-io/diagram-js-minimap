'use strict';

var domAttr = require('min-dom/lib/attr'),
    domClasses = require('min-dom/lib/classes'),
    domEvent = require('min-dom/lib/event'),
    domQuery = require('min-dom/lib/query');

var svgAppend = require('tiny-svg/lib/append'),
    svgAttr = require('tiny-svg/lib/attr'),
    svgClone = require('tiny-svg/lib/clone'),
    svgCreate = require('tiny-svg/lib/create'),
    svgRemove = require('tiny-svg/lib/remove');

var assign = require('lodash/object/assign');

var cssEscape = require('css.escape');

var GraphicsUtil = require('./GraphicsUtil');

var CROSSHAIR_CURSOR = 'crosshair';
var DEFAULT_CURSOR = 'inherit';
var MOVE_CURSOR = 'move';

var MINIMAP_VIEWBOX_PADDING = 50;

var ZOOM_SMOOTHING = 300;
var MIN_ZOOM = 4;
var MAX_ZOOM = 0.2;

/**
 * A minimap that reflects and lets you navigate the diagram.
 */
function Minimap(config, injector, eventBus, canvas, elementRegistry) {
  var self = this;

  this._canvas = canvas;
  this._elementRegistry = elementRegistry;
  this._eventBus = eventBus;
  this._injector = injector;

  this._graphicsUtil = new GraphicsUtil(elementRegistry);

  // state is necessary for viewport dragging
  this._state = {
    isOpen: undefined,
    isDragging: false,
    initialDragPosition: null,
    offsetViewport: null,
    cachedViewbox: null,
    dragger: null,
    svgClientRect: null
  };

  this._init();

  this.toggle((config && config.open) || false);

  // cursor
  domEvent.bind(this._viewport, 'mouseenter', function() {
    setCursor(self._parent, MOVE_CURSOR);
  }, this);

  domEvent.bind(this._viewport, 'mouseleave', function() {
    if (!self._state.isDragging) {
      setCursor(self._parent, CROSSHAIR_CURSOR);
    }
  }, this);

  domEvent.bind(this._map, 'mouseenter', function() {
    if (self._state.isDragging) {
      setCursor(self._parent, MOVE_CURSOR);
    } else {
      setCursor(self._parent, CROSSHAIR_CURSOR);
    }
  }, this);

  domEvent.bind(this._map, 'mouseleave', function() {
    if (!self._state.isDragging) {
      setCursor(self._parent, DEFAULT_CURSOR);
    }
  }, this);

  domEvent.bind(this._parent, 'mouseleave', function(event) {
    if (self._state.isDragging) {
      setCursor(self._parent.parentNode, MOVE_CURSOR);
    }
  }, this);


  // set viewbox on click
  domEvent.bind(this._svg, 'click', function(event) {

    // getBoundingClientRect might return zero-dimensional when called for the first time
    if (!self._svgClientRect || isZeroDimensional(self._svgClientRect)) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg, self._lastViewbox);

    setViewboxCenteredAroundPoint(diagramPoint, self._canvas);

    self._update();
  }, this);

  // scroll canvas on drag
  domEvent.bind(this._viewport, 'mousedown', function(event) {

    // add dragger
    var dragger = svgClone(self._viewport);
    svgAppend(self._svg, dragger);

    // getBoundingClientRect might return zero-dimensional when called for the first time
    if (!self._svgClientRect || isZeroDimensional(self._svgClientRect)) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg, self._lastViewbox);

    var viewbox = canvas.viewbox();

    var offsetViewport = getOffsetViewport(diagramPoint, viewbox);

    // init dragging
    assign(self._state, {
      isDragging: true,
      initialDragPosition: {
        x: event.clientX,
        y: event.clientY
      },
      offsetViewport: offsetViewport,
      cachedViewbox: viewbox,
      dragger: dragger
    });

    // hide viewport
    svgAttr(self._viewport, 'visibility', 'hidden');
  }, this);

  domEvent.bind(document, 'mousemove', function(event) {

    // set viewbox if dragging active
    if (self._state.isDragging) {

      // getBoundingClientRect might return zero-dimensional when called for the first time
      if (!self._svgClientRect || isZeroDimensional(self._svgClientRect)) {
        self._svgClientRect = self._svg.getBoundingClientRect();
      }

      var diagramPoint = mapMousePositionToDiagramPoint({
            x: event.clientX - self._svgClientRect.left,
            y: event.clientY - self._svgClientRect.top
          }, self._canvas, self._svg, self._lastViewbox),
          viewbox = self._state.cachedViewbox;

      setViewboxCenteredAroundPoint({
        x: diagramPoint.x - self._state.offsetViewport.x,
        y: diagramPoint.y - self._state.offsetViewport.y
      }, self._canvas);

      // update dragger
      svgAttr(self._state.dragger, {
        x: Math.round(diagramPoint.x - (viewbox.width / 2)) - self._state.offsetViewport.x,
        y: Math.round(diagramPoint.y - (viewbox.height / 2)) - self._state.offsetViewport.y
      });
    }
  }, this);

  domEvent.bind(document, 'mouseup', function(event) {

    if (self._state.isDragging) {

      // remove dragger
      svgRemove(self._state.dragger);

      // show viewport
      svgAttr(self._viewport, {
        visibility: 'visible'
      });

      self._update();

      // end dragging
      assign(self._state, {
        isDragging: false,
        initialDragPosition: null,
        offsetViewport: null,
        cachedViewbox: null,
        dragger: null
      });

      setCursor(self._parent.parentNode, DEFAULT_CURSOR);
    }
  }, this);

  domEvent.bind(this._svg, 'wheel', function(event) {

    // stop propagation and handle scroll differently
    event.stopPropagation();

    // getBoundingClientRect might return zero-dimensional when called for the first time
    if (!self._svgClientRect || isZeroDimensional(self._svgClientRect)) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg, self._lastViewbox);

    setViewboxCenteredAroundPoint(diagramPoint, self._canvas);

    var zoom = canvas.zoom();

    var delta = event.deltaY > 0 ? 100 : -100;

    canvas.zoom(Math.min(Math.max(zoom - (delta / ZOOM_SMOOTHING), MAX_ZOOM), MIN_ZOOM));

    self._update();
  });

  domEvent.bind(this._toggle, 'click', function() {
    self.toggle();
  });

  // add shape on shape/connection added
  eventBus.on([ 'shape.added', 'connection.added' ], function(ctx) {
    var element = ctx.element;

    self._addElement(element);

    self._update();
  });

  // remove shape on shape/connection removed
  eventBus.on([ 'shape.removed', 'connection.removed' ], function(ctx) {
    var element = ctx.element;

    self._removeElement(element);

    self._update();
  });

  // update on elements changed
  eventBus.on('elements.changed', function(ctx) {
    var elements = ctx.elements;

    elements.forEach(function(element) {
      self._updateElement(element);
    });

    self._update();
  });

  // update on element ID update
  eventBus.on('element.updateId', function(ctx) {
    var element = ctx.element,
        newId = ctx.newId;

    self._updateElementId(element, newId);
  });

  // update on viewbox changed
  eventBus.on('canvas.viewbox.changed', function() {
    if (!self._state.isDragging) {
      self._update();
    }
  });

  var viewerIsAttached = false;

  eventBus.on('attach', function() {
    viewerIsAttached = true;
  });

  eventBus.on('canvas.resized', function() {
    if (!viewerIsAttached) {
      return;
    }

    if (!self._state.isDragging) {
      self._update();
    }

    self._svgClientRect = self._svg.getBoundingClientRect();
  });
}

Minimap.$inject = [
  'config.minimap',
  'injector',
  'eventBus',
  'canvas',
  'elementRegistry'
];

module.exports = Minimap;


Minimap.prototype._init = function() {
  var canvas = this._canvas,
      container = canvas.getContainer();

  // create parent div
  var parent = this._parent = document.createElement('div');

  domClasses(parent).add('djs-minimap');

  container.appendChild(parent);

  // create toggle
  var toggle = this._toggle = document.createElement('div');

  domClasses(toggle).add('toggle');

  var translate = this._injector.get('translate', false) || function(s) { return s; };

  domAttr(toggle, 'title', translate('Toggle minimap'));

  parent.appendChild(toggle);

  // create map
  var map = this._map = document.createElement('div');

  domClasses(map).add('map');

  parent.appendChild(map);

  // create svg
  var svg = this._svg = svgCreate('svg');
  svgAttr(svg, { width: '100%', height: '100%' });
  svgAppend(map, svg);

  // add groups
  var elementsGroup = this._elementsGroup = svgCreate('g');
  svgAppend(svg, elementsGroup);

  var viewportGroup = this._viewportGroup = svgCreate('g');
  svgAppend(svg, viewportGroup);

  // add viewport
  var viewport = this._viewport = svgCreate('rect');

  domClasses(viewport).add('viewport');

  svgAppend(viewportGroup, viewport);

  // prevent drag propagation
  domEvent.bind(parent, 'mousedown', function(event) {
    event.stopPropagation();
  });
};

Minimap.prototype._update = function() {
  var viewbox = this._canvas.viewbox(),
      innerViewbox = viewbox.inner,
      outerViewbox = viewbox.outer;

  var x, y, width, height;

  var widthDifference = outerViewbox.width - innerViewbox.width,
      heightDifference = outerViewbox.height - innerViewbox.height;

  // update viewbox
  if (innerViewbox.width < outerViewbox.width
      && innerViewbox.height < outerViewbox.height) {

    x = innerViewbox.x - widthDifference / 2;
    y = innerViewbox.y - heightDifference / 2;
    width = outerViewbox.width;
    height = outerViewbox.height;
  } else {

    x = innerViewbox.x;
    y = innerViewbox.y;
    width = innerViewbox.width;
    height = innerViewbox.height;
  }

  // apply some padding
  x = x - MINIMAP_VIEWBOX_PADDING;
  y = y - MINIMAP_VIEWBOX_PADDING;
  width = width + MINIMAP_VIEWBOX_PADDING * 2;
  height = height + MINIMAP_VIEWBOX_PADDING * 2;

  this._lastViewbox = {
    x: x,
    y: y,
    width: width,
    height: height
  };

  svgAttr(this._svg, {
    viewBox: x + ', ' + y + ', ' + width + ', ' + height
  });

  // update viewport
  svgAttr(this._viewport, {
    x: viewbox.x,
    y: viewbox.y,
    width: viewbox.width,
    height: viewbox.height
  });
};

Minimap.prototype.open = function() {
  assign(this._state, { isOpen: true });

  domClasses(this._parent).add('open');

  this._eventBus.fire('minimap.toggle', { open: true });
};

Minimap.prototype.close = function() {
  assign(this._state, { isOpen: false });

  domClasses(this._parent).remove('open');

  this._eventBus.fire('minimap.toggle', { open: false });
};

Minimap.prototype.toggle = function(open) {

  var currentOpen = this.isOpen();

  if (typeof open === 'undefined') {
    open = !currentOpen;
  }

  if (open == currentOpen) {
    return;
  }

  if (open) {
    this.open();
  } else {
    this.close();
  }
};

Minimap.prototype.isOpen = function() {
  return this._state.isOpen;
};

Minimap.prototype._updateElement = function(element) {

  try {

    // if parent is null element has been removed, if parent is undefined parent is root
    if (element.parent !== undefined && element.parent !== null) {
      this._removeElement(element);
      this._addElement(element);
    }
  } catch (error) {
    console.warn('Minimap#_updateElement errored', error);
  }

};

Minimap.prototype._updateElementId = function(element, newId) {

  try {
    var elementGfx = domQuery('#' + cssEscape(element.id), this._elementsGroup);

    if (elementGfx) {
      elementGfx.id = newId;
    }
  } catch (error) {
    console.warn('Minimap#_updateElementId errored', error);
  }

};

/**
 * Adds an element and its children to the minimap.
 */
Minimap.prototype._addElement = function(element) {
  var self = this;

  this._removeElement(element);

  var parent,
      x, y;

  var newElementGfx = this._graphicsUtil.createElement(element);
  var newElementParentGfx = domQuery('#' + cssEscape(element.parent.id), this._elementsGroup);

  if (newElementGfx) {

    var elementGfx = this._elementRegistry.getGraphics(element);
    var parentGfx = this._elementRegistry.getGraphics(element.parent);

    var index = getIndexOfChildInParentChildren(elementGfx, parentGfx);

    // index can be 0
    if (index !== 'undefined') {
      if (newElementParentGfx) {

        // in cases of doubt add as last child
        if (newElementParentGfx.childNodes.length > index) {
          insertChildAtIndex(newElementGfx, newElementParentGfx, index);
        } else {
          insertChildAtIndex(newElementGfx, newElementParentGfx, newElementParentGfx.childNodes.length - 1);
        }

      } else {
        this._elementsGroup.appendChild(newElementGfx);
      }

    } else {

      // index undefined
      this._elementsGroup.appendChild(newElementGfx);
    }

    if (isConnection(element)) {
      parent = element.parent;
      x = 0;
      y = 0;

      if (typeof parent.x !== 'undefined' && typeof parent.y !== 'undefined') {
        x = -parent.x;
        y = -parent.y;
      }

      svgAttr(newElementGfx, { transform: 'translate(' + x + ' ' + y + ')' });
    } else {
      x = element.x;
      y = element.y;

      if (newElementParentGfx) {
        parent = element.parent;

        x -= parent.x;
        y -= parent.y;
      }

      svgAttr(newElementGfx, { transform: 'translate(' + x + ' ' + y + ')' });
    }

    if (element.children && element.children.length) {
      element.children.forEach(function(child) {
        self._addElement(child);
      });
    }

    return newElementGfx;
  }
};

Minimap.prototype._removeElement = function(element) {
  var elementGfx = this._svg.getElementById(element.id);

  if (elementGfx) {
    svgRemove(elementGfx);
  }
};

function setCursor(node, cursor) {
  node.style.cursor = cursor;
}

function isConnection(element) {
  return element.waypoints;
}

function getOffsetViewport(diagramPoint, viewbox) {
  var centerViewbox = {
    x: viewbox.x + (viewbox.width / 2),
    y: viewbox.y + (viewbox.height / 2)
  };

  return {
    x: diagramPoint.x - centerViewbox.x,
    y: diagramPoint.y - centerViewbox.y
  };
}

function mapMousePositionToDiagramPoint(position, canvas, svg, lastViewbox) {

  // firefox returns 0 for clientWidth and clientHeight
  var boundingClientRect = svg.getBoundingClientRect();

  // take different aspect ratios of default layers bounding box and minimap into account
  var bBox =
    // fitAspectRatio(canvas.getDefaultLayer().getBBox(), boundingClientRect.width / boundingClientRect.height);
    fitAspectRatio(lastViewbox, boundingClientRect.width / boundingClientRect.height);

  // map click position to diagram position
  var diagramX = map(position.x, 0, boundingClientRect.width, bBox.x, bBox.x + bBox.width),
      diagramY = map(position.y, 0, boundingClientRect.height, bBox.y, bBox.y + bBox.height);

  return {
    x: diagramX,
    y: diagramY
  };
}

function setViewboxCenteredAroundPoint(point, canvas) {

  // get cached viewbox to preserve zoom
  var cachedViewbox = canvas.viewbox(),
      cachedViewboxWidth = cachedViewbox.width,
      cachedViewboxHeight = cachedViewbox.height;

  canvas.viewbox({
    x: point.x - cachedViewboxWidth / 2,
    y: point.y - cachedViewboxHeight / 2,
    width: cachedViewboxWidth,
    height: cachedViewboxHeight
  });
}

function fitAspectRatio(bounds, targetAspectRatio) {
  var aspectRatio = bounds.width / bounds.height;

  // assigning to bounds throws exception in IE11
  var newBounds = assign({}, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  });

  if (aspectRatio > targetAspectRatio) {

    // height needs to be fitted
    var height = newBounds.width * (1 / targetAspectRatio),
        y = newBounds.y - ((height - newBounds.height) / 2);

    assign(newBounds, {
      y: y,
      height: height
    });
  } else if (aspectRatio < targetAspectRatio) {

    // width needs to be fitted
    var width = newBounds.height * targetAspectRatio,
        x = newBounds.x - ((width - newBounds.width) / 2);

    assign(newBounds, {
      x: x,
      width: width
    });
  }

  return newBounds;
}

function map(x, inMin, inMax, outMin, outMax) {
  var inRange = inMax - inMin,
      outRange = outMax - outMin;

  return (x - inMin) * outRange / inRange + outMin;
}

/**
 * Returns index of child in children of parent.
 *
 * g
 * '- g.djs-element // parentGfx
 * '- g.djs-children
 *    '- g
 *       '-g.djs-element // childGfx
 */
function getIndexOfChildInParentChildren(childGfx, parentGfx) {
  var childrenGroup = domQuery('.djs-children', parentGfx.parentNode);

  if (!childrenGroup) {
    return;
  }

  var childrenArray = [].slice.call(childrenGroup.childNodes);

  var indexOfChild = -1;

  childrenArray.forEach(function(childGroup, index) {
    if (domQuery('.djs-element', childGroup) === childGfx) {
      indexOfChild = index;
    }
  });

  return indexOfChild;
}

function insertChildAtIndex(childGfx, parentGfx, index) {
  var childrenArray = [].slice.call(parentGfx.childNodes);

  var childAtIndex = childrenArray[index];

  parentGfx.insertBefore(childGfx, childAtIndex.nextSibling);
}

function isZeroDimensional(clientRect) {
  return clientRect.width === 0 && clientRect.height === 0;
}
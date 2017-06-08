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

var GraphicsUtil = require('./GraphicsUtil');

var MINIMAP_POSITION = 'right-top';

var MINIMAP_MARGIN = '20px';

var MINIMAP_DIMENSIONS = {
  width: '320px',
  height: '180px'
};

var MINIMAP_STYLES = {
  'position': 'absolute',
  'overflow': 'hidden',
  'background-color': '#fff',
  'border': 'solid 1px #CCC',
  'borderRadius': '2px',
  'boxShadow': '0 1px 2px rgba(0,0,0,0.3)',
  'boxSizing': 'border-box',
  'userSelect': 'none',
  '-moz-user-select': 'none'
};

var MINIMAP_OPEN_MAP_STYLES = {
  'display': 'block'
};

var MINIMAP_CLOSED_MAP_STYLES = {
  'display': 'none'
};

var MINIMAP_MAP_STYLES = {
  'width': MINIMAP_DIMENSIONS.width,
  'height': MINIMAP_DIMENSIONS.height
};

var MINIMAP_TOGGLE_STYLES = {
  'background-color': 'rgb(250, 250, 250)'
};

var MINIMAP_OPEN_TOGGLE_STYLES = {
  'width': '100%',
  'height': '10px'
};

var MINIMAP_CLOSED_TOGGLE_STYLES = {
  'width': '46px',
  'height': '46px'
};

var MINIMAP_TOGGLE_HOVER_STYLES = {
  'background-color': '#666'
};

var VIEWPORT_STYLES = {
  'fill': 'rgba(255, 116, 0, 0.25)'
};

var CROSSHAIR_CURSOR = 'crosshair';
var DEFAULT_CURSOR = 'inherit';
var MOVE_CURSOR = 'move';

var ZOOM_SMOOTHING = 300;
var MIN_ZOOM = 4;
var MAX_ZOOM = 0.2;

/**
 * A minimap that reflects and lets you navigate the diagram.
 */
function Minimap(canvas, elementRegistry, eventBus, injector, config) {
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

    if (!self._svgClientRect) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg);

    setViewboxCenteredAroundPoint(diagramPoint, self._canvas);

    self._update();
  }, this);

  // scroll canvas on drag
  domEvent.bind(this._viewport, 'mousedown', function(event) {

    // add dragger
    var dragger = svgClone(self._viewport);
    svgAppend(self._svg, dragger);

    if (!self._svgClientRect) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg);

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

    if (!self._svgClientRect) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    // set viewbox if dragging active
    if (self._state.isDragging) {
      var diagramPoint = mapMousePositionToDiagramPoint({
            x: event.clientX - self._svgClientRect.left,
            y: event.clientY - self._svgClientRect.top
          }, self._canvas, self._svg),
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

    if (!self._svgClientRect) {
      self._svgClientRect = self._svg.getBoundingClientRect();
    }

    var diagramPoint = mapMousePositionToDiagramPoint({
      x: event.clientX - self._svgClientRect.left,
      y: event.clientY - self._svgClientRect.top
    }, self._canvas, self._svg);

    setViewboxCenteredAroundPoint(diagramPoint, self._canvas);

    var zoom = canvas.zoom();

    var delta = event.deltaY > 0 ? 100 : -100;

    canvas.zoom(Math.min(Math.max(zoom - (delta / ZOOM_SMOOTHING), MAX_ZOOM), MIN_ZOOM));

    self._update();
  });

  domEvent.bind(this._toggle, 'mouseenter', function() {
    if (!self._state.isDragging) {
      assign(self._toggle.style, MINIMAP_TOGGLE_HOVER_STYLES);
    }
  });

  domEvent.bind(this._toggle, 'mouseleave', function() {
    if (!self._state.isDragging) {
      assign(self._toggle.style, MINIMAP_TOGGLE_STYLES);
    }
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

  eventBus.on('canvas.resized', function() {
    if (!self._state.isDragging) {
      self._update();
    }

    self._svgClientRect = self._svg.getBoundingClientRect();
  });
}

Minimap.$inject = [ 'canvas', 'elementRegistry', 'eventBus', 'injector', 'config.minimap' ];

module.exports = Minimap;

Minimap.prototype._init = function() {
  var canvas = this._canvas,
      container = canvas.getContainer();

  // create parent div
  var parent = this._parent = document.createElement('div');

  domClasses(parent).add('djs-minimap');

  switch (getHorizontalPosition(MINIMAP_POSITION)) {
  case 'left':
    assign(MINIMAP_STYLES, { left: MINIMAP_MARGIN });
    break;
  default:
    assign(MINIMAP_STYLES, { right: MINIMAP_MARGIN });
    break;
  }

  switch (getVerticalPosition(MINIMAP_POSITION)) {
  case 'bottom':
    assign(MINIMAP_STYLES, { bottom: MINIMAP_MARGIN });
    break;
  default:
    assign(MINIMAP_STYLES, { top: MINIMAP_MARGIN });
    break;
  }

  assign(parent.style, MINIMAP_STYLES);

  container.appendChild(parent);

  // create map
  var map = this._map = document.createElement('div');

  domClasses(map).add('djs-minimap-map');

  assign(map.style, MINIMAP_MAP_STYLES);

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
  domClasses(viewport).add('djs-minimap-viewport');
  svgAttr(viewport, VIEWPORT_STYLES);
  svgAppend(viewportGroup, viewport);

  // create toggle
  var toggle = this._toggle = document.createElement('div');

  domClasses(toggle).add('djs-minimap-toggle');

  var translate = this._injector.get('translate', false) || function(s) { return s; };

  domAttr(toggle, 'title', translate('Toggle minimap'));

  assign(toggle.style, MINIMAP_TOGGLE_STYLES);

  parent.appendChild(toggle);

  // prevent drag propagation
  domEvent.bind(parent, 'mousedown', function(event) {
    event.stopPropagation();
  });
};

Minimap.prototype._update = function() {
  var bBox = this._canvas.getDefaultLayer().getBBox();
  var viewbox = this._canvas.viewbox();

  // update viewbox
  if (bBox.width < viewbox.width && bBox.height < viewbox.height) {
    svgAttr(this._svg, {
      viewBox: viewbox.x + ', ' + viewbox.y + ', ' + viewbox.width + ', ' + viewbox.height
    });
  } else {
    svgAttr(this._svg, {
      viewBox: bBox.x + ', ' + bBox.y + ', ' + bBox.width + ', ' + bBox.height
    });
  }

  // update viewport
  svgAttr(this._viewport, {
    x: viewbox.x,
    y: viewbox.y,
    width: viewbox.width,
    height: viewbox.height
  });
};

Minimap.prototype.open = function() {
  assign(this._map.style, MINIMAP_OPEN_MAP_STYLES);
  assign(this._toggle.style, MINIMAP_OPEN_TOGGLE_STYLES);

  assign(this._state, { isOpen: true });

  domClasses(this._parent).add('open');

  this._eventBus.fire('minimap.toggle', { open: true });
};

Minimap.prototype.close = function() {
  assign(this._map.style, MINIMAP_CLOSED_MAP_STYLES);
  assign(this._toggle.style, MINIMAP_CLOSED_TOGGLE_STYLES);

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

  // if parent is null element has been removed, if parent is undefined parent is root
  if (element.parent !== undefined && element.parent !== null) {
    this._removeElement(element);
    this._addElement(element);
  }
};

Minimap.prototype._updateElementId = function(element, newId) {
  var elementGfx = domQuery('#' + element.id, this._elementsGroup);

  if (elementGfx) {
    elementGfx.id = newId;
  }
};

/**
 * Adds an element and its children to the minimap.
 */
Minimap.prototype._addElement = function(element) {
  var self = this;

  this._removeElement(element);

  var newElementGfx = this._graphicsUtil.createElement(element);
  var newElementParentGfx = domQuery('#' + element.parent.id, this._elementsGroup);

  if (newElementGfx) {

    var elementGfx = this._elementRegistry.getGraphics(element);
    var parentGfx = this._elementRegistry.getGraphics(element.parent);

    var index = getIndexOfChildInParentChildren(elementGfx, parentGfx);

    // index can be 0
    if (index !== 'undefined') {
      if (newElementParentGfx) {
        insertChildAtIndex(newElementGfx, newElementParentGfx, index);
      } else {
        this._elementsGroup.appendChild(newElementGfx);
      }

    } else {

      // index undefined
      this._elementsGroup.appendChild(newElementGfx);
    }

    if (isConnection(element)) {
      var parent = element.parent,
          x = 0,
          y = 0;

      if (typeof parent.x !== 'undefined' && typeof parent.y !== 'undefined') {
        x = -parent.x;
        y = -parent.y;
      }

      svgAttr(newElementGfx, { transform: 'translate(' + x + ' ' + y + ')' });
    } else {
      var x = element.x,
      y = element.y;

      if (newElementParentGfx) {
        var parent = element.parent;

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

function getHorizontalPosition(position) {
  return getPositions(position).horizontal;
}

function getVerticalPosition(position) {
  return getPositions(position).vertical;
}

function getPositions(position) {

  var split = position.split('-');

  return {
    horizontal: split[0] || 'right',
    vertical: split[1] || 'top'
  };
}

function getDjsVisual(gfx) {
  return [].slice.call(gfx.childNodes).filter(function(childNode) {
    return childNode.getAttribute('class') === 'djs-visual';
  })[0];
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

function mapMousePositionToDiagramPoint(position, canvas, svg) {

  // firefox returns 0 for clientWidth and clientHeight
  var boundingClientRect = svg.getBoundingClientRect();

  // take different aspect ratios of default layers bounding box and minimap into account
  var bBox =
    fitAspectRatio(canvas.getDefaultLayer().getBBox(), boundingClientRect.width / boundingClientRect.height);

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
};

import {
  attr as domAttr,
  classes as domClasses,
  event as domEvent,
  query as domQuery
} from 'min-dom';

import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  remove as svgRemove
} from 'tiny-svg';

import {
  assign
} from 'min-dash';

import cssEscape from 'css.escape';

import GraphicsUtil from './GraphicsUtil';

const MINIMAP_VIEWBOX_PADDING = 50;

const ZOOM_SMOOTHING = 300;
const MIN_ZOOM = 4;
const MAX_ZOOM = 0.2;


/**
 * A minimap that reflects and lets you navigate the diagram.
 */
export default class Minimap {
  constructor(config, injector, eventBus, canvas, elementRegistry) {
    this._canvas = canvas;
    this._elementRegistry = elementRegistry;
    this._eventBus = eventBus;
    this._injector = injector;

    this._graphicsUtil = new GraphicsUtil(elementRegistry);

    this._state = {
      isOpen: undefined,
      isDragging: false,
      initialDragPosition: null,
      offsetViewport: null,
      cachedViewbox: null,
      dragger: null,
      svgClientRect: null,
      parentClientRect: null
    };

    this._init();

    this.toggle((config && config.open) || false);

    const setViewboxCenteredAroundClickEvent = event => {

      // getBoundingClientRect might return zero-dimensional when called for the first time
      if (!this._state._svgClientRect || isZeroDimensional(this._state._svgClientRect)) {
        this._state._svgClientRect = this._svg.getBoundingClientRect();
      }

      const diagramPoint = mapMousePositionToDiagramPoint({
        x: event.clientX - this._state._svgClientRect.left,
        y: event.clientY - this._state._svgClientRect.top
      }, this._canvas, this._svg, this._lastViewbox);

      setViewboxCenteredAroundPoint(diagramPoint, this._canvas);

      this._update();
    };

    // set viewbox on click
    domEvent.bind(this._svg, 'click', event => {
      event.preventDefault();
      event.stopPropagation();

      setViewboxCenteredAroundClickEvent(event);
    });

    // scroll canvas on drag
    domEvent.bind(this._viewportDom, 'mousedown', event => {

      // getBoundingClientRect might return zero-dimensional when called for the first time
      if (!this._state._svgClientRect || isZeroDimensional(this._state._svgClientRect)) {
        this._state._svgClientRect = this._svg.getBoundingClientRect();
      }

      const diagramPoint = mapMousePositionToDiagramPoint({
        x: event.clientX - this._state._svgClientRect.left,
        y: event.clientY - this._state._svgClientRect.top
      }, this._canvas, this._svg, this._lastViewbox);

      const viewbox = canvas.viewbox();

      const offsetViewport = getOffsetViewport(diagramPoint, viewbox);

      const initialViewportDomRect = this._viewportDom.getBoundingClientRect();

      const computedStyle = getComputedStyle(this._viewportDom, null);

      const borderTopWidth = parseInt(computedStyle.getPropertyValue('border-top-width')),
            borderLeftWidth = parseInt(computedStyle.getPropertyValue('border-left-width'));

      // take border width into account
      const offsetViewportDom = {
        x: event.clientX - initialViewportDomRect.left + borderLeftWidth,
        y: event.clientY - initialViewportDomRect.top + borderTopWidth
      };

      this._state.parentClientRect = this._parent.getBoundingClientRect();

      // init dragging
      assign(this._state, {
        cachedViewbox: viewbox,
        initialDragPosition: {
          x: event.clientX,
          y: event.clientY
        },
        isDragging: true,
        offsetViewport: offsetViewport,
        offsetViewportDom: offsetViewportDom
      });
    });

    domEvent.bind(document, 'mousemove', event => {

      // set viewbox if dragging active
      if (this._state.isDragging) {

        // getBoundingClientRect might return zero-dimensional when called for the first time
        if (!this._state._svgClientRect || isZeroDimensional(this._state._svgClientRect)) {
          this._state._svgClientRect = this._svg.getBoundingClientRect();
        }

        const offsetViewportDom = this._state.offsetViewportDom;

        const parentClientRect = this._state.parentClientRect;

        assign(this._viewportDom.style, {
          left: (event.clientX - offsetViewportDom.x - parentClientRect.left) + 'px',
          top: (event.clientY - offsetViewportDom.y - parentClientRect.top) + 'px'
        });

        const diagramPoint = mapMousePositionToDiagramPoint({
          x: event.clientX - this._state._svgClientRect.left,
          y: event.clientY - this._state._svgClientRect.top
        }, this._canvas, this._svg, this._lastViewbox);

        setViewboxCenteredAroundPoint({
          x: diagramPoint.x - this._state.offsetViewport.x,
          y: diagramPoint.y - this._state.offsetViewport.y
        }, this._canvas);
      }
    });

    domEvent.bind(document, 'mouseup', event => {

      if (this._state.isDragging) {

        // treat event as click
        if (this._state.initialDragPosition.x === event.clientX
            && this._state.initialDragPosition.y === event.clientY) {
          setViewboxCenteredAroundClickEvent(event);
        }

        this._update();

        // end dragging
        assign(this._state, {
          cachedViewbox: null,
          initialDragPosition: null,
          isDragging: false,
          offsetViewport: null,
          offsetViewportDom: null
        });
      }
    });

    domEvent.bind(this._parent, 'wheel', event => {

      // stop propagation and handle scroll differently
      event.preventDefault();
      event.stopPropagation();

      // getBoundingClientRect might return zero-dimensional when called for the first time
      if (!this._state._svgClientRect || isZeroDimensional(this._state._svgClientRect)) {
        this._state._svgClientRect = this._svg.getBoundingClientRect();
      }

      const diagramPoint = mapMousePositionToDiagramPoint({
        x: event.clientX - this._state._svgClientRect.left,
        y: event.clientY - this._state._svgClientRect.top
      }, this._canvas, this._svg, this._lastViewbox);

      setViewboxCenteredAroundPoint(diagramPoint, this._canvas);

      const zoom = canvas.zoom();

      const delta = event.deltaY > 0 ? 100 : -100;

      canvas.zoom(Math.min(Math.max(zoom - (delta / ZOOM_SMOOTHING), MAX_ZOOM), MIN_ZOOM));

      this._update();
    });

    domEvent.bind(this._toggle, 'click', event => {
      event.preventDefault();
      event.stopPropagation();

      this.toggle();
    });

    // TODO: remove
    eventBus.on('import.done', () => {
      setTimeout(() => {
        this._update();
      }, 0);
    });

    // add shape on shape/connection added
    eventBus.on([ 'shape.added', 'connection.added' ], ({ element }) => {
      this._addElement(element);

      this._update();
    });

    // remove shape on shape/connection removed
    eventBus.on([ 'shape.removed', 'connection.removed' ], ({ element }) => {
      this._removeElement(element);

      this._update();
    });

    // update on elements changed
    eventBus.on('elements.changed', ({ elements }) => {
      elements.forEach(element => {
        this._updateElement(element);
      });

      this._update();
    });

    // update on element ID update
    eventBus.on('element.updateId', ({ element, newId }) => {
      this._updateElementId(element, newId);
    });

    // update on viewbox changed
    eventBus.on('canvas.viewbox.changed', () => {
      if (!this._state.isDragging) {
        this._update();
      }
    });

    let viewerIsAttached = false;

    eventBus.on('attach', () => {
      viewerIsAttached = true;
    });

    eventBus.on('detach', () => {
      viewerIsAttached = false;
    });

    eventBus.on('canvas.resized', () => {
      if (!viewerIsAttached) {
        return;
      }

      if (!this._state.isDragging) {
        this._update();
      }

      this._state._svgClientRect = this._svg.getBoundingClientRect();
    });
  }

  _init() {
    const canvas = this._canvas,
          container = canvas.getContainer();

    // create parent div
    const parent = this._parent = document.createElement('div');

    domClasses(parent).add('djs-minimap');

    container.appendChild(parent);

    // create toggle
    const toggle = this._toggle = document.createElement('div');

    domClasses(toggle).add('toggle');

    const translate = this._injector.get('translate', false) || function(s) { return s; };

    domAttr(toggle, 'title', translate('Toggle minimap'));

    parent.appendChild(toggle);

    // create map
    const map = this._map = document.createElement('div');

    domClasses(map).add('map');

    parent.appendChild(map);

    // create svg
    const svg = this._svg = svgCreate('svg');
    svgAttr(svg, { width: '100%', height: '100%' });
    svgAppend(map, svg);

    // add groups
    const elementsGroup = this._elementsGroup = svgCreate('g');
    svgAppend(svg, elementsGroup);

    const viewportGroup = this._viewportGroup = svgCreate('g');
    svgAppend(svg, viewportGroup);

    // add viewport
    const viewport = this._viewport = svgCreate('rect');

    domClasses(viewport).add('viewport');

    svgAppend(viewportGroup, viewport);

    // prevent drag propagation
    domEvent.bind(parent, 'mousedown', event => {
      event.stopPropagation();
    });

    this._viewportDom = document.createElement('div');

    domClasses(this._viewportDom).add('viewport-dom');

    this._parent.appendChild(this._viewportDom);
  }

  _update() {
    const viewbox = this._canvas.viewbox(),
          innerViewbox = viewbox.inner,
          outerViewbox = viewbox.outer;

    let x, y, width, height;

    const widthDifference = outerViewbox.width - innerViewbox.width,
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

    const parentClientRect = this._state._parentClientRect = this._parent.getBoundingClientRect(),
          viewportClientRect = this._viewport.getBoundingClientRect();

    assign(this._viewportDom.style, {
      top: (viewportClientRect.top - parentClientRect.top) + 'px',
      left: (viewportClientRect.left - parentClientRect.left) + 'px',
      width: viewportClientRect.width + 'px',
      height: viewportClientRect.height + 'px'
    });
  }

  open() {
    assign(this._state, { isOpen: true });

    domClasses(this._parent).add('open');

    this._eventBus.fire('minimap.toggle', { open: true });
  }

  close() {
    assign(this._state, { isOpen: false });

    domClasses(this._parent).remove('open');

    this._eventBus.fire('minimap.toggle', { open: false });
  }

  toggle(open) {

    const isOpen = this.isOpen();

    if (typeof open === 'undefined') {
      open = !isOpen;
    }

    if (open == isOpen) {
      return;
    }

    if (open) {
      this.open();
    } else {
      this.close();
    }
  }

  isOpen() {
    return this._state.isOpen;
  }

  _updateElement(element) {

    try {

      // if parent is null element has been removed, if parent is undefined parent is root
      if (element.parent !== undefined && element.parent !== null) {
        this._removeElement(element);
        this._addElement(element);
      }
    } catch (error) {
      console.warn('Minimap#_updateElement errored', error);
    }

  }

  _updateElementId(element, newId) {

    try {
      const elementGfx = domQuery('#' + cssEscape(element.id), this._elementsGroup);

      if (elementGfx) {
        elementGfx.id = newId;
      }
    } catch (error) {
      console.warn('Minimap#_updateElementId errored', error);
    }

  }

  /**
   * Adds an element and its children to the minimap.
   */
  _addElement(element) {
    this._removeElement(element);

    let parent,
        x, y;

    const newElementGfx = this._graphicsUtil.createElement(element),
          newElementParentGfx = domQuery('#' + cssEscape(element.parent.id), this._elementsGroup);

    if (newElementGfx) {

      const elementGfx = this._elementRegistry.getGraphics(element),
            parentGfx = this._elementRegistry.getGraphics(element.parent);

      const index = getIndexOfChildInParentChildren(elementGfx, parentGfx);

      // index can be 0
      if (index !== 'undefined') {
        if (newElementParentGfx) {

          // in cases of doubt add as last child
          if (newElementParentGfx.childNodes.length > index) {
            insertChildAtIndex(newElementGfx, newElementParentGfx, index);
          } else {
            insertChildAtIndex(
              newElementGfx,
              newElementParentGfx,
              newElementParentGfx.childNodes.length - 1
            );
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
        element.children.forEach(child => {
          this._addElement(child);
        });
      }

      return newElementGfx;
    }
  }

  _removeElement(element) {
    const elementGfx = this._svg.getElementById(element.id);

    if (elementGfx) {
      svgRemove(elementGfx);
    }
  }
}

Minimap.$inject = [
  'config.minimap',
  'injector',
  'eventBus',
  'canvas',
  'elementRegistry'
];

// helpers //////////

function isConnection(element) {
  return element.waypoints;
}

function getOffsetViewport(diagramPoint, viewbox) {
  const centerViewbox = {
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
  const boundingClientRect = svg.getBoundingClientRect();

  // take different aspect ratios of default layers bounding box and minimap into account
  const bBox =
    fitAspectRatio(lastViewbox, boundingClientRect.width / boundingClientRect.height);

  // map click position to diagram position
  const diagramX = map(position.x, 0, boundingClientRect.width, bBox.x, bBox.x + bBox.width),
        diagramY = map(position.y, 0, boundingClientRect.height, bBox.y, bBox.y + bBox.height);

  return {
    x: diagramX,
    y: diagramY
  };
}

function setViewboxCenteredAroundPoint(point, canvas) {

  // get cached viewbox to preserve zoom
  const cachedViewbox = canvas.viewbox(),
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
  const aspectRatio = bounds.width / bounds.height;

  // assigning to bounds throws exception in IE11
  const newBounds = assign({}, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  });

  if (aspectRatio > targetAspectRatio) {

    // height needs to be fitted
    const height = newBounds.width * (1 / targetAspectRatio),
          y = newBounds.y - ((height - newBounds.height) / 2);

    assign(newBounds, {
      y: y,
      height: height
    });
  } else if (aspectRatio < targetAspectRatio) {

    // width needs to be fitted
    const width = newBounds.height * targetAspectRatio,
          x = newBounds.x - ((width - newBounds.width) / 2);

    assign(newBounds, {
      x: x,
      width: width
    });
  }

  return newBounds;
}

function map(x, inMin, inMax, outMin, outMax) {
  const inRange = inMax - inMin,
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
  const childrenGroup = domQuery('.djs-children', parentGfx.parentNode);

  if (!childrenGroup) {
    return;
  }

  const childrenArray = [].slice.call(childrenGroup.childNodes);

  let indexOfChild = -1;

  childrenArray.forEach((childGroup, index) => {
    if (domQuery('.djs-element', childGroup) === childGfx) {
      indexOfChild = index;
    }
  });

  return indexOfChild;
}

function insertChildAtIndex(childGfx, parentGfx, index) {
  const childrenArray = [].slice.call(parentGfx.childNodes);

  const childAtIndex = childrenArray[index];

  parentGfx.insertBefore(childGfx, childAtIndex.nextSibling);
}

function isZeroDimensional(clientRect) {
  return clientRect.width === 0 && clientRect.height === 0;
}
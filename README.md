# diagram-js Minimap

[![Build Status](https://github.com/bpmn-io/diagram-js-minimap/actions/workflows/CI.yml/badge.svg)](https://github.com/bpmn-io/diagram-js-minimap/actions/workflows/CI.yml)

A minimap for diagram-js.

![Minimap](resources/screenshot.png)


## Features

* See the whole diagram in the minimap
* Highlight current viewport
* Click/drag/scroll the minimap to navigate the diagram
* Optimized performance for large diagrams with intelligent update batching


## Usage

Extend your diagram-js application with the minimap module. We'll use [bpmn-js](https://github.com/bpmn-io/bpmn-js) as an example:

```javascript
import BpmnModeler from 'bpmn-js/lib/Modeler';

import minimapModule from 'diagram-js-minimap';

var bpmnModeler = new BpmnModeler({
  additionalModules: [
    minimapModule
  ]
});
```

For proper styling integrate the embedded style sheet:

```html
<link rel="stylesheet" href="diagram-js-minimap/assets/diagram-js-minimap.css" />
```

Please see [this example](https://github.com/bpmn-io/bpmn-js-examples/tree/master/minimap) for a more detailed instruction.


## Configuration

The minimap can be configured via the `minimap` config option:

```javascript
var bpmnModeler = new BpmnModeler({
  additionalModules: [
    minimapModule
  ],
  minimap: {
    open: true,           // Open minimap by default
    debounceDelay: 100    // Debounce delay for batching updates (in milliseconds)
  }
});
```

### Configuration Options

* `open` (boolean, default: `false`): Whether the minimap should be open by default
* `debounceDelay` (number, default: `100`): Delay in milliseconds for batching multiple element updates. This significantly improves performance when adding/removing many elements at once (e.g., during diagram import or copy-paste operations)


## Performance

The minimap uses intelligent update batching to maintain high performance even with large diagrams (2000+ elements):

* **Batched Updates**: Multiple element additions, removals, and changes are automatically batched together using a configurable debounce mechanism. This reduces the number of expensive DOM operations.

* **Immediate Updates**: Critical operations like viewport changes, user interactions (drag, zoom, click), and canvas resize trigger immediate updates for responsive user experience.

* **Optimized DOM Queries**: Element ordering uses efficient business object relationships instead of expensive DOM traversals.

### Performance Tips

* The default `debounceDelay` of 100ms works well for most use cases
* For very large diagram imports (1000+ elements), you may increase the delay to 200-300ms to further reduce update frequency
* The minimap automatically handles the trade-off between responsiveness and performance


## License

MIT

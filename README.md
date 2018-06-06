> As of version `1.0.0` this library exposes ES modules. Use an ES module aware transpiler such as Webpack, Rollup or Browserify + babelify to bundle it for the browser.


# diagram-js Minimap

[![Build Status](https://travis-ci.org/bpmn-io/diagram-js-minimap.svg?branch=master)](https://travis-ci.org/bpmn-io/diagram-js-minimap)

A minimap for diagram-js.

![Minimap](resources/screenshot.png)


## Features

* See the whole diagram in the minimap
* Highlight current viewport
* Click/drag/scroll the minimap to navigate the diagram


## Usage

Extend your diagram-js application with the minimap module. We'll use [bpmn-js](https://github.com/bpmm-io/bpmn-js) as an example:

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


## License

MIT
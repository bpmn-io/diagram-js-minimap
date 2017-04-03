# diagram-js-minimap

A minimap for diagram-js

![Minimap](docs/screenshot.png)

## Features

* See the whole diagram in the minimap
* Click/drag/scroll the minimap to navigate the diagram

## Usage

Extend your diagram-js application with the minimap module. We'll use [bpmn-js](https://github.com/bpmm-io/bpmn-js) as an example:

```javascript

var BpmnModeler = require('bpmn-js/lib/Modeler');

var minimapModule = require('diagram-js-minimap');

var canvas = $('#js-canvas');

var bpmnModeler = new BpmnModeler({
  container: canvas,
  additionalModules: [
    minimapModule
  ]
});

bpmnModeler.importXML(xml, function(err) {

  if (err) {
      console.error(err);
    } else {
      console.log('Awesome! Ready to navigate!');
    }
  });

```

Please see [this example](https://github.com/bpmn-io/bpmn-js-examples/tree/master/minimap) for a more detailed instruction.

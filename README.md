# DndBus

Library to faciliate drag & drop between Components in a web site, for example between Vue components.

### Features
* Drag elements
* Insertion Preview
* `candrop(el, src, src_idx, dst, dst_idx)` if the user can only drop following custom rules, these rules can be implemented here
* Does not modify any lists itself to play nice with state maneged by a UI library like Vue.

### Limitations
* Horizontal stack only - multiple elements in the same container on the same height will confuse the library
* does not directly work on lists or similar elements but simply calls a callback for the actual move operation, so you'll need to implement that yourself.

### Building (the example)
```bash
tsc  # to compile src/dndbus.ts to the build/-directory
cd example/
yarn serve  # to run the sample application. It will output how it is reachable with your browser
```

### Example

The `exmaple/` directory contains a very simple example how to use this library. \
`src/dragbus.js` creates a bus instance that will be shared between all components and defines the callback function `move` which does the actual moving of elements after a successful drop. \
`src/components/SortableList.vue` contains an example component with draggable elements. Those can then be reordered or dragged to the other List.

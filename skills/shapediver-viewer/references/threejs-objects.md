# Three.js Objects

Reference: <https://help.shapediver.com/doc/three-js-objects>

The ShapeDiver Viewer uses [three.js](https://threejs.org/) internally. You can add custom
three.js objects to the scene tree and access the three.js objects created by the Viewer.

## Background

The scene tree is built from nodes (`ITreeNode`). Each node can have 0-n child nodes and
0-n data items (`ITreeNodeData`) representing geometry, materials, animations, etc.
When a node is created or updated (`updateVersion()`), the Viewer processes it and creates
three.js `Object3D` instances per node and per data item. These are stored in the
`threeJsObject` property, keyed by viewport ID.

## Adding Custom Three.js Objects

Use `ThreejsData` to add any three.js `Object3D` to the scene tree.

### Imports

**NPM:**

```ts
import { TreeNode, ThreejsData } from "@shapediver/viewer";
import * as THREE from "three";
```

**CDN:** Use `SDV.TreeNode`, `SDV.ThreejsData`, and `THREE` (exposed by the bundle).

### Example — Add a Torus

```ts
// create a node that contains our data
const threejsNode = new TreeNode();

// create an Object3D and add it to the node as a data item
const obj = new THREE.Object3D();
threejsNode.data.push(new ThreejsData(obj));

// add any kind of three.js items to that object
const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const torus = new THREE.Mesh(geometry, material);
obj.add(torus);

// add the node to the scene tree and update
sceneTree.root.addChild(threejsNode);
sceneTree.root.updateVersion();
```

Access the scene tree via `viewport.sceneTree` or the `SDV.sceneTree` global (CDN).

## Accessing Three.js Data

Objects in the scene tree are converted into three.js objects. You can access and manipulate
them, but customization requests will overwrite your changes.

- **`node.threeJsObject`** — the three.js `Object3D` for the node, keyed by viewport ID
- **`data.threeJsObject`** — the three.js object for each data item, keyed by viewport ID
- **`node.updateCallbackThreeJsObject`** — callback invoked when the node's three.js object
  changes (e.g., after a customization). Use this to reapply manual modifications.

### Example — Access Geometry Meshes

```ts
// create a callback that is executed whenever the node changes
const cb = (newNode?: ITreeNode) => {
  if (!newNode) return;
  // traverse all data that is in the scene tree below this node
  newNode.traverseData((d) => {
    // for every geometry data, log the three.js objects, which in this case is the Mesh
    if (d instanceof GeometryData) {
      console.log(d.convertedObject[viewport.id]);
    }
  });
};

// assign the output callback and call it once
output.updateCallback = cb;
cb(output.node);
```

## Additional Examples

See the [viewer examples page — three.js section](https://viewer.shapediver.com/v3/examples/index.html#three.js).

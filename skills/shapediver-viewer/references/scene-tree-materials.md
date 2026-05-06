# Scene Tree, Events, Materials, Animations, Three.js

---

### Scene Tree (`ITreeNode`)

- **`sceneTree.root`**: root node. **`session.node`**: session's node.
- **`node.children`** / **`node.data`**: hierarchy and data items.
- **`node.addChild(child)`** / **`node.removeChild(child)`**.
- **`node.updateVersion()`**: **required** after modifying data/children.
- **`node.clone()`**: deep-clones node and descendants.
- **`node.traverse(cb)`** / **`node.traverseData(cb)`**: recursive traversal.
- **`node.transformations`**: array of `{ id, matrix }`. Push + `updateVersion()` to transform.

### Event Listeners

```ts
import { addListener, removeListener, EVENTTYPE } from "@shapediver/viewer";
const token = addListener(EVENTTYPE.SESSION.SESSION_CUSTOMIZED, (e) => { ... });
removeListener(token);
```

Key categories: `EVENTTYPE.SESSION`, `EVENTTYPE.VIEWPORT`, `EVENTTYPE.CAMERA`,
`EVENTTYPE.SCENE`, `EVENTTYPE.INTERACTION`.

For output-specific events, use `EVENTTYPE_OUTPUT.OUTPUT_UPDATED` with `addListener`:

```ts
SDV.addListener(SDV.EVENTTYPE_OUTPUT.OUTPUT_UPDATED, (e) => {
  const outputEvent = e as SDV.IOutputEvent;
  // outputEvent.outputId, outputEvent.newNode, outputEvent.oldNode
});
```

### Materials

The viewer supports three material types: `MaterialStandardData` (PBR metalness/roughness,
most common), `MaterialUnlitData` (no lighting), and `MaterialSpecularGlossinessData`
(specular/glossiness workflow). Assignment patterns are identical for all three.

```ts
import { MaterialStandardData, GeometryData } from "@shapediver/viewer";
const material = new MaterialStandardData({
  color: "#ff0000",
  metalness: 0.8,
  roughness: 0.2,
});
```

#### Changing Materials via the API

Material updates via the API are **immediate** — they don't require a server round-trip.
This provides instant feedback for configurators. There are two approaches depending on
which Grasshopper display component was used.

**Approach 1: glTF 2.0 Display component**

Materials are embedded in the geometry output. Find and replace by material name:

```ts
const replaceMaterial = (
  node: ITreeNode,
  materialName: string,
  material: MaterialStandardData,
) => {
  for (let i = 0; i < node.data.length; i++) {
    // Materials can be directly in the node's data
    if (node.data[i] instanceof MaterialStandardData) {
      const currentMaterial = node.data[i] as MaterialStandardData;
      if (currentMaterial.name === materialName) node.data[i] = material;
    }
    // Or assigned to a geometry
    if (node.data[i] instanceof GeometryData) {
      const geometry = node.data[i] as GeometryData;
      if (geometry.material && geometry.material.name === materialName)
        geometry.material = material;
    }
  }
  for (let i = 0; i < node.children.length; i++)
    replaceMaterial(node.children[i], materialName, material);
};

// Usage: find the output and replace the material
const output = session.getOutputByName("Primary")[0];
if (output.node) {
  replaceMaterial(
    output.node,
    "PrimaryMaterial",
    new MaterialStandardData({
      color: "#00ff00",
      metalness: 0.5,
      roughness: 0.3,
    }),
  );
  output.node.updateVersion();
}
```

To persist the override across `customize()` calls, use `output.updateCallback`:

```ts
output.updateCallback = (newNode) => {
  if (newNode) replaceMaterial(newNode, "PrimaryMaterial", myMaterial);
};
```

**Approach 2: ShapeDiver Display component**

Each ShapeDiver Display component creates a geometry output and a material output.
Override the material output directly:

```ts
const overrideOutputMaterial = async (
  session: ISessionApi,
  outputName: string,
  material: MaterialStandardData | MaterialStandardData[],
) => {
  const outputsByName = session.getOutputByName(outputName);
  // Find the geometry output (material property is undefined for geometry outputs)
  const geometryOutput = outputsByName.find((o) => o.material === undefined);
  if (!geometryOutput) return;

  // Freeze so server updates don't overwrite our override
  geometryOutput.freeze = true;

  // Assign material to output node children
  // Node structure: outputNode → transformationNode → materialNode
  if (Array.isArray(material)) {
    geometryOutput.node!.children.forEach(
      (c, index) => (c.children[0].data[0] = material[index]),
    );
  } else {
    geometryOutput.node!.children.forEach(
      (c) => (c.children[0].data[0] = material),
    );
  }

  // Apply the changes
  await session.updateOutputs();
};
```

**Changing material color on output update (via event or callback):**

```ts
// Using updateCallback
const doorOutput = session
  .getOutputByName("Door")
  .find((o) => !o.format.includes("material"))!;

doorOutput.updateCallback = async (newNode) => {
  if (newNode) {
    newNode.traverseData((d) => {
      if (d instanceof GeometryData)
        (d as GeometryData).material!.color = "red";
    });
  }
};

// Using EVENTTYPE_OUTPUT.OUTPUT_UPDATED
SDV.addListener(SDV.EVENTTYPE_OUTPUT.OUTPUT_UPDATED, (e) => {
  const outputEvent = e as SDV.IOutputEvent;
  const outputApi = session.getOutputById(outputEvent.outputId)!;
  if (outputApi.name === "HorizontalTop" && outputEvent.newNode) {
    outputEvent.newNode.traverseData((d) => {
      if (d instanceof GeometryData)
        (d as GeometryData).material!.color = "blue";
    });
  }
});
```

#### MaterialStandardData Properties

| Category                        | Properties                                                                                                       |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------- |
| **Color**                       | `color`, `map`                                                                                                   |
| **Metalness / Roughness**       | `metalness`, `metalnessMap`, `roughness`, `roughnessMap`, `metalnessRoughnessMap`                                |
| **Normal / Bump**               | `normalMap`, `normalScale`, `bumpMap`, `bumpScale`                                                               |
| **Displacement**                | `displacementMap`, `displacementScale`, `displacementBias`                                                       |
| **Emissive**                    | `emissiveness`, `emissiveMap`                                                                                    |
| **Ambient Occlusion**           | `aoMap`, `aoMapIntensity`                                                                                        |
| **Transparency (alpha)**        | `opacity`, `alphaMap`, `alphaCutoff`                                                                             |
| **Transparency (transmission)** | `transmission`, `transmissionMap`, `ior`, `thickness`, `thicknessMap`, `attenuationColor`, `attenuationDistance` |
| **Clearcoat**                   | `clearcoat`, `clearcoatMap`, `clearcoatNormalMap`, `clearcoatRoughness`, `clearcoatRoughnessMap`                 |
| **Sheen**                       | `sheen`, `sheenColor`, `sheenColorMap`, `sheenRoughness`, `sheenRoughnessMap`                                    |
| **Specular**                    | `specularColor`, `specularColorMap`, `specularIntensity`, `specularIntensityMap`                                 |

Replace materials by traversing node data. Use `output.freeze = true` to persist across
`customize()` calls.

### Animations

```ts
import { AnimationData, IAnimationTrack } from "@shapediver/viewer";
const animation = new AnimationData("myAnim", tracks, 0, 5);
session.node.data.push(animation);
animation.repeat = true;
animation.startAnimation();
```

### Three.js Integration

```ts
import { TreeNode, ThreejsData } from "@shapediver/viewer";
const threejsNode = new TreeNode();
threejsNode.data.push(new ThreejsData(new THREE.Object3D()));
sceneTree.root.addChild(threejsNode);
sceneTree.root.updateVersion();
```

- `viewport.threeJsCoreObjects`: `{ camera, renderer, scene }`.
- `node.threeJsObject`: `{ [viewportId]: Object3D }` per node.

### glTF Loader

```ts
import { DataEngine } from "@shapediver/viewer";
DataEngine.instance.loadContent({
  format: "gltf",
  href: "https://example.com/model.glb",
});
```

# ShapeDiver Viewer V3 — API Reference

Detailed API surfaces for Session, Viewport, Parameter, Output, Export, Scene Tree,
Events, Materials, Animations, and Three.js integration.

---

## Session API (`ISessionApi`)

A session represents an instance of a model hosted on a ShapeDiver Geometry Backend.

### Creation & Configuration

```ts
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
});
```

- **`customizeOnParameterChange`** (default: `false`): When `true`, triggers `customize()`
  on every `param.value` change. **⚠️ Do NOT enable this.** Combined with `onInput` handlers,
  every drag movement triggers a server request.

### Customization

- **`session.customize(parameterValues?, force?, waitForViewportUpdate?)`**: Sends parameter
  values to backend. Returns `Promise<ITreeNode>`. Always `await` it.
  - `parameterValues`: optional `{ [paramId]: value }` shorthand.
  - `force`: calls backend even if no parameters changed.
  - `waitForViewportUpdate`: resolves only when geometry is visible.
- **`session.customizeParallel(parameterValues)`**: Runs customization without affecting
  current state. Node must be manually inserted.
- **`session.customizeResult(parameterValues)`**: Returns raw backend response only.
- **`session.cancelCustomization()`**: Cancels in-progress customization.

### Parameter & Output Access

Parameters, outputs, and exports can all be looked up by **name** or **ID** — use
whichever the user provides.

- **`session.parameters`**: `{ [id]: IParameterApi }` dictionary (keyed by ID).
- **`session.getParameterByName(name)`**: returns `IParameterApi[]` (multiple can share a name).
- **`session.getParameterById(id)`**: returns `IParameterApi | null`.
- **`session.getParameterByType(type)`**: returns `IParameterApi[]`.
- **`session.exports`**: `{ [id]: IExportApi }` dictionary (keyed by ID).
- **`session.getExportByName(name)`** / **`getExportById(id)`** / **`getExportByType(type)`**: lookup exports.
- **`session.outputs`**: `{ [id]: IOutputApi }` dictionary (keyed by ID).
- **`session.getOutputByName(name)`** / **`getOutputById(id)`** / **`getOutputByFormat(format)`**.
- **`session.parameterValues`**: read-only snapshot of current values.
- **`session.parameterSessionValues`**: snapshot from last successful `customize()`.
- **`session.parameterDefaultValues`**: model defaults.
- **`session.resetParameterValues(force?)`**: resets all to defaults and customizes.
- **`session.updateOutputs()`**: applies pending scene tree changes from `updateOutputContent()`
  calls made with `preventUpdate: true`.
- **`session.close()`**: terminates session and frees resources.

### Session History

- **`session.canGoBack()`** / **`session.canGoForward()`**: check history state.
- **`session.goBack()`** / **`session.goForward()`**: returns `Promise<ITreeNode>`.

### Model States

- **`session.createModelState(parameterValues?, omitSessionParameterValues?, image?, data?, arScene?)`**: creates a saved state. Returns `Promise<string>` (state id).
- **`session.getModelState(modelStateId?)`**: retrieves a model state.
- **`session.customizeWithModelState(modelState)`**: applies a saved state's parameter values.
- Model states have a **6-month lifetime**. Can be applied across models (matched by id/name).
- Use `modelStateId` in `createSession` options to apply a state at init time.

### File Uploads & glTF

- **`session.uploadFileParameters(values)`**: uploads files for file parameters.
- **`session.convertToGlTF(convertForAR?)`**: converts session scene to glTF Blob.
- **`session.uploadSDTF(arrayBuffers)`**: uploads sdTF files.
- **`session.loadSdtf`** (default: `false`): load SDTF data.

### JWT & Settings

- **`session.jwtToken`** / **`session.setJwtToken(token)`** / **`session.refreshJwtToken`**: JWT management.
- **`session.saveSettings(viewportId?)`** / **`session.resetSettings(sections?)`** / **`session.applySettings(response, sections?)`**: viewport settings persistence.
- **`session.saveDefaultParameterValues()`**: saves current values as defaults.
- **`session.saveUiProperties()`**: saves displayname, order, hidden, tooltip.

### Credit Usage

- Each session consumes **at least one credit**. Each credit covers 10 minutes with unlimited
  customizations. Export requests consume additional credits.

### Session Update Callback

- **`session.updateCallback`**: `(newNode?, oldNode?) => void | Promise<void>` — called when
  the session's scene tree node is replaced.

---

## Viewport API (`IViewportApi`)

Create the viewport before the session so geometry renders immediately.

### Creation & Lifecycle

```ts
const viewport = await SDV.createViewport({
  id: "vp",
  canvas: canvasRef.current,
});
viewport.close(); // destroys WebGL context
```

- **`viewport.id`**: unique identifier (read-only).
- **`viewport.canvas`**: the canvas element (read-only).
- **`viewport.isBusy`**: `true` while processing (read-only).

### Camera

- **`viewport.camera`**: current `ICameraApi`.
- **`viewport.cameras`**: dictionary of all cameras.
- **`viewport.createPerspectiveCamera(id?)`** / **`viewport.createOrthographicCamera(id?)`**.
- **`viewport.assignCamera(id)`** / **`viewport.removeCamera(id)`**.
- **`camera.animate(keyframes, options?)`**: animate through `{ position, target }` keyframes.
- **`camera.zoomTo(nodes?)`**: zoom to fit nodes or entire scene.
- **`camera.reset(duration?)`**: reset to default position/target.

### Environment & Appearance

- **`viewport.environmentMap`**: HDR map URL or preset from `ENVIRONMENT_MAP`.
- **`viewport.environmentMapAsBackground`** / **`viewport.environmentMapBlurriness`** / **`viewport.environmentMapIntensity`**.
- **`viewport.clearColor`** / **`viewport.clearAlpha`**: background color/alpha.
- **`viewport.gridVisibility`** / **`viewport.gridColor`**: grid display.
- **`viewport.groundPlaneVisibility`** / **`viewport.groundPlaneColor`** / **`viewport.groundPlaneShadowVisibility`**.

### Lighting

- **`viewport.lights`** / **`viewport.shadows`** / **`viewport.softShadows`**: enable/disable.
- **`viewport.lightScene`** / **`viewport.lightScenes`**: current and all light scenes.
- **`viewport.createLightScene()`** / **`viewport.assignLightScene(id)`**: manage light scenes.
- Light scenes support ambient, directional, point, and spot lights.

### Screenshots

- **`viewport.getScreenshot(type?, quality?)`**: returns data URL (default `image/png`).
- **`viewport.getScreenshotAdvanced(type?, quality?, resolution?, camera?)`**: custom resolution.

### Three.js Access

- **`viewport.threeJsCoreObjects`**: `{ camera, renderer, scene }` — direct three.js objects.

### Raycasting

- **`viewport.pointerEventToRay(event)`**: converts PointerEvent to `{ origin, direction }`.
- **`viewport.raytraceScene(origin, direction, filterCriteria?)`**: sorted intersections.
- **`viewport.convert3Dto2D(point)`**: 3D → 2D coordinate conversion.

### Rendering & Resize

- **`viewport.maximumRenderingSize`** / **`viewport.automaticResizing`** / **`viewport.resize(w, h)`**.
- **`viewport.toneMapping`** / **`viewport.toneMappingExposure`**.
- **`viewport.pauseRendering()`** / **`viewport.continueRendering()`** / **`viewport.render()`**.

### AR (Augmented Reality)

- **`viewport.viewableInAR()`** / **`viewport.viewInAR(node?)`** / **`viewport.createArSessionLink(...)`**.
- See [AR docs](https://help.shapediver.com/doc/augmented-reality) for full reference.

### Scene Tree Updates

- **`viewport.update()`**: process pending scene tree changes.
- **`viewport.updateNode(node)`** / **`viewport.updateNodeTransformation(node)`**.
- **`viewport.updateEnvironmentGeometry()`**: reposition grid/ground to bounding box.

### Post-Processing

- **`viewport.postProcessing`**: access to `IPostProcessingApi`.
- Effects: Bloom, Depth of Field, SSAO, HBAO, Outline, Vignette, Selective Bloom, and more.
- See [post-processing.md](post-processing.md) for full API, all effect types with properties, and code examples.

---

## Parameter API (`IParameterApi`)

Parameters represent input channels for the model.

### Core Properties

- `id`: unique string identifier (read-only)
- `name`: human-readable label
- `type`: `'Float'`, `'Int'`, `'Even'`, `'Odd'`, `'StringList'`, `'Bool'`, `'Color'`,
  `'String'`, `'File'`, `'Drawing'`, `'Interaction'`
- `value`: current value — read/write. Validation on set. **Setting `value` does NOT
  auto-trigger `customize()`.**
- `sessionValue`: value from last successful `customize()` (read-only)
- `hidden`: boolean — whether to hide in UI

### Display Properties

- `displayname`, `tooltip`, `group`, `order`, `hint`, `visualization`

### Type-Specific Properties

- `choices`: `string[]` — **only for `StringList`**
- `min` / `max` / `interval` — only for numeric types
- `decimalplaces` — only for `Float`
- `defval`: default value as string
- `format`: `string[]` — for file parameters, accepted MIME types
- `settings`: pre-configured settings for `Drawing` and `Interaction` parameters
- `umin` / `umax` / `vmin` / `vmax`: for 2D domain parameters

### Drawing & Interaction Parameter APIs

Parameters with `type: 'Drawing'` or `type: 'Interaction'` have specialized APIs with
strongly-typed `settings`. Use type guards to narrow:

| Type Guard                                | Narrows to                        | `settings` type                     |
| :---------------------------------------- | :-------------------------------- | :---------------------------------- |
| `isDrawingParameterApi(param)`            | `IDrawingParameterApi`            | `IDrawingParameterSettings`         |
| `isSelectionParameterApi(param)`          | `ISelectionParameterApi`          | `ISelectionParameterProps`          |
| `isDraggingParameterApi(param)`           | `IDraggingParameterApi`           | `IDraggingParameterProps`           |
| `isGumballTransformParameterApi(param)`   | `IGumballTransformParameterApi`   | `IGumballTransformParameterProps`   |
| `isRectangleTransformParameterApi(param)` | `IRectangleTransformParameterApi` | `IRectangleTransformParameterProps` |

Once a type guard passes, `param.settings` is **already defined and typed**. No cast needed.

**⚠️ Runtime structure:** At runtime, `param.settings` for interaction parameters has a
nested structure: `{ type: "selection", props: { nameFilter, maximumSelection, ... } }`.
The actual properties are under `settings.props`, NOT directly on `settings`. Always
extract props first:

```ts
const settings = param.settings?.props ?? param.settings;
```

Reading `param.settings.nameFilter` directly returns `undefined`. See the interaction
reference files for details.

**Typed parameter values:**

| Parameter API                     | Value Type                         | Structure                                                     |
| :-------------------------------- | :--------------------------------- | :------------------------------------------------------------ |
| `IDrawingParameterApi`            | `DrawingParameterValue`            | `{ points: number[][] }`                                      |
| `ISelectionParameterApi`          | `SelectionParameterValue`          | `{ names: string[] }`                                         |
| `IDraggingParameterApi`           | `DraggingParameterValue`           | `{ objects: { name, restrictionId, transformation, ... }[] }` |
| `IGumballTransformParameterApi`   | `GumballTransformParameterValue`   | `{ names: string[]; transformations: number[][] }`            |
| `IRectangleTransformParameterApi` | `RectangleTransformParameterValue` | `{ names: string[]; transformations: number[][] }`            |

### Methods

- **`param.isValid(value, throwError?)`**: validates without setting.
- **`param.resetToDefaultValue()`** / **`param.resetToSessionValue()`**: reset value.
- **`param.stringify(value?)`**: returns value as string.

---

## Export API (`IExportApi`)

Exports output data NOT visualized in the scene (file downloads, reports). **NOT computed
by `customize()` — must be explicitly requested.**

### Properties

- `id`, `name`, `type`, `hidden`, `dependency`, `version` — constant over session lifetime.
- `displayname?`, `order?`, `tooltip?`, `group?` — UI hints from the model author. Use these to label and sort export buttons.
- `filename?` — suggested download filename.
- `content?` — `ShapeDiverResponseExportContent[]` from the last `request()` call (see shape below).
- `result?` — `ShapeDiverResponseExportResult` from the last `request()` call.

### Methods

- **`export.request(parameters?)`**: requests the export. Accepts an optional `{ [paramId]: value }` map to override parameter values for this export only (current values are used for any parameter not specified). Returns `Promise<ShapeDiverResponseExport>`.

### Batch Export Requests

- **`session.requestExports(body, loadOutputs?, maxWaitMsec?)`**: request one or multiple exports in a single call. Returns `Promise<ResBase>`.

### Response Shapes

**`ShapeDiverResponseExportContent`** — each item in `result.content[]`:

| Property       | Type     | Description                    |
| -------------- | -------- | ------------------------------ |
| `href`         | `string` | Download URL for the file      |
| `format`       | `string` | File format (e.g. `"stl"`)     |
| `contentType?` | `string` | MIME type (e.g. `"model/stl"`) |
| `size?`        | `number` | File size in bytes             |

**`ShapeDiverResponseExportResult`** — available as `result.result`:

| Property   | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `href?`    | `string` | URL                     |
| `err?`     | `string` | Error message if failed |
| `msg?`     | `string` | Status message          |
| `modelId?` | `string` | Model identifier        |

### Code Examples

Basic export download:

```ts
const exportApi = session.getExportByName("MyExport")[0];
const result = await exportApi.request();
const fileUrl = result.content?.[0].href;
if (fileUrl) window.open(fileUrl);
```

Export with parameter overrides (exports using specific values without changing the session):

```ts
const exportApi = session.getExportByName("STL Export")[0];
const lengthParam = session.getParameterByName("Length")[0];
const result = await exportApi.request({ [lengthParam.id]: 10 });
const fileUrl = result.content?.[0].href;
if (fileUrl) window.open(fileUrl);
```

---

## Output API (`IOutputApi`)

Outputs represent data channels from the model, computed during customizations.
Each output has a corresponding node in the scene tree that is updated automatically
when parameter values change and `customize()` is called.

**ShapeDiver Display note:** When using the ShapeDiver Display component in Grasshopper,
each component creates **two** outputs — one for geometry and one for material. Use the
`format` property to distinguish: the geometry output does NOT include `"material"` in
its format array, while the material output does. Example:

```ts
const geometryOutput = session
  .getOutputByName("Door")
  .find((o) => !o.format.includes("material"));
const materialOutput = session
  .getOutputByName("Door")
  .find((o) => o.format.includes("material"));
```

### Properties

- `id`: unique string identifier (read-only)
- `name`: human-readable name (read-only)
- `format`: `string[]` — formats of items in the content array (read-only).
  Use to distinguish geometry vs material outputs.
- `content`: `ShapeDiverResponseOutputContent[]` — the output data/assets. Changes on
  each customization. Access data via `output.content?.[0]?.data`.
- `node`: `ITreeNode` — the corresponding scene tree node (read-only, optional).
  Replaced on each customization.
- `version`: string — changes on each update (read-only)
- `hidden`: boolean — whether the output is hidden in the UI
- `dependency`: `string[]` — parameter IDs this output depends on
- `displayname`, `tooltip`, `group`, `order`: display metadata from the model
- `bbmin` / `bbmax`: `number[]` — bounding box corners
- `material`: `string` — material identifier (for ShapeDiver Display material outputs,
  this is `undefined` for the geometry output of a pair)

### Freeze & Manual Updates

- **`output.freeze`**: when `true`, subsequent `customize()`, `updateOutputContent()`, and
  `session.updateOutputs()` calls will NOT update this output. Use after manually
  overriding content to persist the override across customizations.
- **`output.updateCallback`**: `(newNode?: ITreeNode, oldNode?: ITreeNode) => void | Promise<void>`
  — called whenever the output's scene tree node is replaced (e.g., after `customize()`).
  Use to carry over data (like interaction flags or material overrides) from the old node
  to the new one. If the callback returns a Promise, it is awaited.
- **`output.updateOutputContent(content, preventUpdate?)`**: manually override the output's
  content. Use `preventUpdate: true` to batch multiple overrides, then call
  `session.updateOutputs()` to apply them all at once.

### Listening for Output Updates

**Option 1: `updateCallback` (per-output)**

```ts
const output = session.getOutputByName("PricingData")[0];
output.updateCallback = (newNode, oldNode) => {
  // content is already updated at this point
  console.log("Output updated:", output.content?.[0]?.data);
};
```

**Option 2: `EVENTTYPE_OUTPUT.OUTPUT_UPDATED` event (global)**

```ts
SDV.addListener(SDV.EVENTTYPE_OUTPUT.OUTPUT_UPDATED, (e) => {
  const outputEvent = e as SDV.IOutputEvent;
  const outputApi = session.getOutputById(outputEvent.outputId);
  if (outputApi && outputApi.name === "MyOutput" && outputEvent.newNode) {
    // React to the update — newNode is the new scene tree node
  }
});
```

### Batch Output Updates

- **`session.updateOutputs()`**: applies pending output content changes (from
  `updateOutputContent` with `preventUpdate: true`). Use when updating multiple
  outputs simultaneously.

---

## Scene Tree, Events, Materials, Animations, Three.js

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

---

## Development Environment & Security

### Domain Whitelisting

If you get HTTP 403 on session creation, the domain isn't whitelisted. Add it in the model's
Embedding Settings on the ShapeDiver platform:

- Include port for non-standard ports (e.g. `localhost:3000`)
- Subdomains must be added individually
- Local domains don't count toward domain limit

**LLM coding environments (Bolt, Replit, CodeSandbox, etc.):** The preview runs on a dynamic
subdomain. Add a wildcard entry `*.base-domain` (e.g. `*.webcontainer-api.io`). If the
platform doesn't allow it, post on the [ShapeDiver Forum](https://forum.shapediver.com/).

### JWT (Strong Authorization)

When enabled, use `session.setJwtToken()` and `session.refreshJwtToken` callback. See
[API Authorization docs](https://help.shapediver.com/doc/api-authorization).

### Testing Locally

Open via an HTTP server, not `file://`:

- `npx serve` or `python3 -m http.server 8080`

The `file://` protocol causes cosmetic browser warnings but doesn't affect API calls.

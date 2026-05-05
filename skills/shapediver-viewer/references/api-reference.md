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

#### Customize Shorthand

You can pass parameter values directly to `customize()` instead of setting `param.value`
first. Both approaches are valid — the shorthand is simpler when updating known values:

```ts
// Shorthand — pass values directly (by name or ID)
await session.customize({
  "Length": 1500,
  "Material Color": "#ff0000"
});

// Equivalent step-by-step approach
session.getParameterByName("Length")[0].value = 1500;
session.getParameterByName("Material Color")[0].value = "#ff0000";
await session.customize();
```

**When to use which:**
- **Shorthand**: Simple value updates where you know parameter names/IDs and don't need
  type conversion or validation.
- **Step-by-step**: When using `toSDValue()` for type-safe conversion, when building
  dynamic UIs from `session.parameters`, or when you need `param.isValid()` checks.

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

Some models also define **dynamic parameters** in their AppBuilder output — these are
not found in `session.parameters` but in the `"AppBuilder"` output JSON. See
[dynamic-parameters.md](dynamic-parameters.md).

- **`session.updateOutputs()`**: applies pending scene tree changes from `updateOutputContent()`
  calls made with `preventUpdate: true`.
- **`session.close()`**: terminates session and frees resources.

### Session History

- **`session.canGoBack()`** / **`session.canGoForward()`**: check history state.
- **`session.goBack()`** / **`session.goForward()`**: returns `Promise<ITreeNode>`.

### Model States

Model states allow saving and restoring parameter configurations with optional
screenshots, custom data, and AR scenes. Each state gets a unique ID for later retrieval
or sharing (e.g., via URL parameter).

- **`session.createModelState(parameterValues?, omitSessionParameterValues?, image?, data?, arScene?)`**: creates a saved state. Returns `Promise<string>` (state id).
- **`session.getModelState(modelStateId?)`**: retrieves a model state.
- **`session.customizeWithModelState(modelState)`**: applies a saved state's parameter values.
- Model states have a **6-month lifetime**. Can be applied across models (matched by id/name).
- Use `modelStateId` in `createSession` options to apply a state at init time.

```ts
// Save current state with a screenshot
const stateId = await session.createModelState(
  {},                                    // use current parameter values
  false,                                 // include session values
  () => viewport.getScreenshot(),        // screenshot function
  { label: "User Config #1" },          // custom data (any object)
  async () => await viewport.convertToGlTF() // optional AR scene
);
// stateId can be stored in a database or passed via URL

// Load a saved state at session creation time (avoids a round-trip)
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  modelStateId: "SAVED_STATE_ID",
});

// Apply a saved state to an existing session
await session.customizeWithModelState("SAVED_STATE_ID");
// Or pass the full model state object:
const state = await session.getModelState("SAVED_STATE_ID");
await session.customizeWithModelState(state);
```

### File Uploads & glTF

- **`session.uploadFileParameters(values)`**: uploads files for file parameters.
- **`session.convertToGlTF(convertForAR?)`**: converts session scene to glTF Blob.
- **`session.uploadSDTF(arrayBuffers)`**: uploads sdTF files.
- **`session.loadSdtf`** (default: `false`): load SDTF data.

### JWT & Settings

JWT (JSON Web Token) authorization adds an extra security layer for production models.
When enabled on the platform, all API requests require a valid JWT.

- **`session.jwtToken`**: current JWT token (read-only).
- **`session.setJwtToken(token)`**: set a new JWT token.
- **`session.refreshJwtToken`**: callback `() => Promise<string>` — called automatically
  when the current token expires. Set this to a function that fetches a fresh token
  from your backend.

```ts
// Set initial JWT at session creation
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  jwtToken: "INITIAL_JWT_TOKEN",
});

// Auto-refresh when token expires
session.refreshJwtToken = async () => {
  const response = await fetch("/api/shapediver/token");
  const { token } = await response.json();
  return token;
};
```

See [API Authorization docs](https://help.shapediver.com/doc/api-authorization) for
backend token generation and the full security flow.

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
- **`viewport.createOrthographicCamera(id?)`**: create an orthographic camera. Set `camera.direction` to `ORTHOGRAPHIC_CAMERA_DIRECTION.TOP`, `.FRONT`, `.LEFT`, etc.
- **`viewport.assignCamera(id)`** / **`viewport.removeCamera(id)`**.
- **`camera.animate(keyframes, options?)`**: animate through `{ position, target }` keyframes. `options`: `{ duration: ms }`.
- **`camera.zoomTo(nodes?)`**: zoom to fit nodes or entire scene.
- **`camera.reset(duration?)`**: reset to default position/target.
- **`camera.defaultPosition`** / **`camera.defaultTarget`**: default camera values (read-only).
- **`camera.position`** / **`camera.target`**: current camera position/target (read/write).

#### Camera Restrictions

Restrict how end users can navigate the 3D scene. Common for configurators that
need a controlled viewing experience.

| Property                  | Type              | Description                                                    |
| :------------------------ | :---------------- | :------------------------------------------------------------- |
| `camera.enableZoom`       | `boolean`         | Enable/disable scroll-to-zoom (default: `true`)               |
| `camera.enableRotation`   | `boolean`         | Enable/disable orbit rotation (default: `true`)                |
| `camera.enablePan`        | `boolean`         | Enable/disable panning (default: `true`)                       |
| `camera.enableAutoRotation` | `boolean`       | Auto-rotate the camera around the target (default: `false`)    |
| `camera.autoRotationSpeed`  | `number`        | Rotation speed when auto-rotation is enabled                   |
| `camera.zoomRestriction`  | `{ minDistance?, maxDistance? }` | Min/max zoom distances                      |
| `camera.rotationRestriction` | `{ minPolarAngle?, maxPolarAngle?, minAzimuthAngle?, maxAzimuthAngle? }` | Orbit angle limits (radians) |

```ts
// Lock zoom range and vertical rotation
const camera = viewport.camera;
camera.enablePan = false;
camera.zoomRestriction = { minDistance: 50, maxDistance: 300 };
camera.rotationRestriction = {
  minPolarAngle: Math.PI / 6,
  maxPolarAngle: Math.PI / 2,
};
```

```ts
// Auto-rotate (turntable) for showcase / hero shots
camera.enableAutoRotation = true;
camera.autoRotationSpeed = 1.0;
```

```ts
// Switch between perspective and orthographic cameras
const orthoTop = viewport.createOrthographicCamera();
orthoTop.direction = SDV.ORTHOGRAPHIC_CAMERA_DIRECTION.TOP;
viewport.assignCamera(orthoTop.id);  // switch to top view
viewport.assignCamera(viewport.cameras["default"].id);  // switch back
```

### Environment & Appearance

- **`viewport.environmentMap`**: HDR map URL or preset from `ENVIRONMENT_MAP`.
- **`viewport.environmentMapAsBackground`** / **`viewport.environmentMapBlurriness`** / **`viewport.environmentMapIntensity`**.
- **`viewport.clearColor`** / **`viewport.clearAlpha`**: background color/alpha.
- **`viewport.gridVisibility`** / **`viewport.gridColor`**: grid display.
- **`viewport.groundPlaneVisibility`** / **`viewport.groundPlaneColor`** / **`viewport.groundPlaneShadowVisibility`**.

### Branding, Spinner & Visibility

- **`viewport.logo`**: set to `null` to remove the ShapeDiver logo, or set to a custom image URL.
- **`viewport.logoBackgroundColor`** / **`viewport.logoBackgroundOpacity`**: customize logo background.
- **`viewport.busyModeDisplay`**: controls the loading spinner appearance.
- **`viewport.show`** / **`viewport.hide`**: programmatically show/hide the viewport canvas overlay.

```ts
// Remove default logo
viewport.logo = null;

// Custom logo
viewport.logo = "https://example.com/my-logo.png";

// Transparent background
viewport.clearColor = "#ffffff";
viewport.clearAlpha = 0;

// Hide grid and ground plane
viewport.gridVisibility = false;
viewport.groundPlaneVisibility = false;
```

### Color Management

Colors in the viewer use linear color space internally. The `automaticColorAdjustment`
setting (default: enabled since v2.7.0) automatically converts hex/string colors from
sRGB to linear. When providing colors as numbers, they are assumed to already be linear.

- **`viewport.automaticColorAdjustment`**: `boolean` — auto-convert sRGB string colors to linear.
- **`viewport.textureEncoding`**: color space for `map` and `emissiveMap` textures.
- **`viewport.outputEncoding`**: color space for the final rendered output.

If colors from `<input type="color">` look different in the viewer, `automaticColorAdjustment`
handles this automatically. Only disable if you are providing pre-linearized colors.

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

---

## Initial Parameters on Session Creation

Set parameter values in the `createSession` call to send them with the initial request,
avoiding a second round-trip. Useful when you know the starting configuration from a URL
parameter, saved state, or user preference.

```ts
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  initialParameterValues: {
    "Length": 1500,
    "Material Color": "#00ff00",
  },
});
```

This sends the specified parameter values with the very first computation request. Without
this, the session loads with model defaults, and you'd need a second `customize()` call.

---

## Multiple Sessions & Multiple Viewports

### Multiple Sessions in One Viewport

Load two or more models into the same 3D scene. Each session manages its own parameters,
outputs, and exports independently. All sessions share the same viewport and camera.

```ts
const viewport = await SDV.createViewport({
  id: "vp",
  canvas: document.getElementById("canvas"),
});

const sessionA = await SDV.createSession({
  id: "model-A",
  ticket: TICKET_A,
  modelViewUrl: MODEL_VIEW_URL_A,
});

const sessionB = await SDV.createSession({
  id: "model-B",
  ticket: TICKET_B,
  modelViewUrl: MODEL_VIEW_URL_B,
});

// Each session has independent parameters
sessionA.getParameterByName("Length")[0].value = 10;
await sessionA.customize();

// Clean up both sessions
sessionA.close();
sessionB.close();
viewport.close();
```

### Multiple Viewports

Show the same model from different angles or with different rendering settings.
Each viewport needs its own canvas element and can have independent cameras,
post-processing, and environment settings.

```ts
const viewportFront = await SDV.createViewport({
  id: "front-view",
  canvas: document.getElementById("canvas-front"),
});

const viewportTop = await SDV.createViewport({
  id: "top-view",
  canvas: document.getElementById("canvas-top"),
});

// Set top viewport to orthographic top-down camera
const topCamera = viewportTop.createOrthographicCamera();
topCamera.direction = SDV.ORTHOGRAPHIC_CAMERA_DIRECTION.TOP;
viewportTop.assignCamera(topCamera.id);

const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
});
// Session geometry appears in all viewports automatically
```

---

## Progress Events

Track loading and customization progress for loading indicators and progress bars.

```ts
import { addListener, EVENTTYPE } from "@shapediver/viewer";

// Fires during initial model loading and customizations
addListener(EVENTTYPE.SESSION.SESSION_INITIAL_OUTPUTS_LOADED, (e) => {
  console.log("Initial outputs loaded");
  hideLoadingSpinner();
});

// Track when the viewport is busy (processing scene updates)
addListener(EVENTTYPE.VIEWPORT.BUSY_MODE_ON, () => {
  showBusyIndicator();
});

addListener(EVENTTYPE.VIEWPORT.BUSY_MODE_OFF, () => {
  hideBusyIndicator();
});

// Track customization lifecycle
addListener(EVENTTYPE.SESSION.SESSION_CUSTOMIZED, (e) => {
  console.log("Customization complete");
});
```

CDN: `SDV.addListener(SDV.EVENTTYPE.SESSION.SESSION_CUSTOMIZED, ...)`.

---

## Performance Tips

- **Batch parameter changes:** Set multiple `param.value` before calling `customize()` once.
  Each `customize()` is a server round-trip.
- **Debounce rapid changes:** For text inputs, commit on `onBlur` rather than every keystroke.
- **Use `cancelCustomization()`:** When the user changes a parameter while a previous
  customization is still in-flight, cancel the old one to avoid processing stale results.
- **`customizeParallel()` for preview:** Runs a computation without replacing the current
  scene. Useful for "what-if" previews or pre-caching.
- **`initialParameterValues`:** Set known starting values at session creation to skip the
  default-then-update round-trip.
- **Use `output.freeze = true`:** After material overrides, freeze the output to prevent
  server updates from resetting your local changes.
- **Pause rendering:** Use `viewport.pauseRendering()` during bulk scene tree operations,
  then `viewport.continueRendering()`.
- **Fixed CDN version:** Use a pinned version (e.g., `v3/2.20.0/bundle.js`) instead of
  `latest` in production to avoid unexpected changes.

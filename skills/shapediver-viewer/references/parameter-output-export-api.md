# Parameter, Output & Export API

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

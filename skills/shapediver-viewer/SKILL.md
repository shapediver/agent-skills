---
name: shapediver-viewer
description: >
  Use this skill when the user needs to write custom code using the ShapeDiver
  Viewer V3 API (@shapediver/viewer or the ShapeDiver CDN bundle) to build a 3D
  product configurator — including session/viewport setup, parameter controls,
  commit patterns, export downloads, React integration, and interaction features
  (selection, hover, drag, gumball, drawing tools, attribute visualization).
  Covers CDN and NPM workflows.
---

# ShapeDiver Viewer V3 API

Follow every rule in this file exactly. Do not improvise or work around any constraint.

---

## Obtaining Model-Specific Values

### Option A: Retrieve via API (preferred)

If the user provides a **model slug** (the URL identifier from `shapediver.com/app/m/{slug}`)
and **Platform API access keys** (access key ID + secret), you can retrieve `ticket`,
`modelViewUrl`, and full parameter/output/export metadata automatically.

Run the shared script at the repository root (self-contained — auto-installs
dependencies on first run, requires Node.js):

```bash
node ../../scripts/get-model-info.js <slug> <accessKeyId> <accessKeySecret>
```

The script outputs clean JSON to stdout (diagnostics to stderr). The `model` object
contains two tickets and the model view URL:

- **`ticket`** — the **embedding ticket** for Viewer use in the browser. Use this in generated frontend code.
- **`backendTicket`** — the **backend ticket** for headless/server-side SDK use.
- **`modelViewUrl`** — the Geometry Backend URL.

It also includes `parameters`, `outputs`, and `exports`. Run with `--help` for full usage and exit codes.

It performs a three-step flow:

1. **Authenticate** with the ShapeDiver Platform Backend API (`POST /oauth/token`)
2. **Get model info** by slug (`GET /api/v1/models/{slug}?embed=backend_ticket,backend_system`)
   — returns `backend_ticket` and `backend_system.model_view_url`
3. **Init session** on the Geometry Backend (`POST /api/v2/ticket/{ticket}`)
   — returns all parameters, outputs, and exports with their IDs, types, defaults, etc.
   The session is closed immediately after retrieving the metadata.

Use the returned data to populate `ticket`, `modelViewUrl`, parameter names/IDs, etc. in
generated code.

**Important:** The model must have "backend access" enabled. The script will attempt to
enable it automatically. Access keys are created at
https://www.shapediver.com/app/settings/developers

### Option B: Manual values from the user

If the user provides `ticket` and `modelViewUrl` directly (from the "Developers" tab on
shapediver.com), use those values as-is.

### Placeholders — Never Invent Model-Specific Values

Use ONLY values the user has explicitly provided or that were retrieved via the API script.
If missing, use the placeholder and ask.

| Value             | Placeholder                        |
| ----------------- | ---------------------------------- |
| `ticket`          | `"PASTE_YOUR_TICKET_HERE"`         |
| `modelViewUrl`    | `"PASTE_YOUR_MODEL_VIEW_URL_HERE"` |
| Parameter name/ID | `"PARAM_NAME_OR_ID"`               |
| Output name/ID    | `"OUTPUT_NAME_OR_ID"`              |
| Export name/ID    | `"EXPORT_NAME_OR_ID"`              |

Do NOT filter or group parameters by guessing names. If grouping is needed, ask the user
for exact names/IDs. `param.type` tells you how to render a control, not which group it
belongs to.

### App Builder Output Check

If the model metadata (retrieved via the script or provided by the user) contains an output
named **"AppBuilder"**, pause and ask the user:

> _"This model has an AppBuilder output, which means it is configured for the ShapeDiver
> App Builder. Are you sure you want to build a custom Viewer API integration instead of
> using the App Builder? The App Builder may already cover your needs with less effort."_

This may be intentional (e.g., the user needs features beyond what App Builder offers), but
confirm before proceeding. If the user decides to switch, hand off to the
`shapediver-appbuilder` skill.

---

## Critical Rules

These are the most commonly violated patterns. Read all before writing code.
For code examples of each rule, see [references/code-patterns.md](references/code-patterns.md).

### Rule 1: NEVER use `onChange` to commit parameters

Every `session.customize()` call is a network request. `onChange` on sliders, color pickers,
and text inputs fires continuously, causing HTTP 429 rate-limit errors.
**Dropdown and checkbox are the ONLY controls where `onChange` is safe.**
Use `onMouseUp`/`onChangeEnd`/`onBlur` for all others. See [code-patterns.md](references/code-patterns.md) § Commit Function.

### Rule 2: Color picker — commit at end, not on every movement

`onChange` on `<input type="color">` fires on every mouse movement. `onMouseUp` fires when
opening the picker, not when selecting. Both are wrong.
See [code-patterns.md](references/code-patterns.md) Pattern E for correct implementations.

### Rule 3: Slider — use `useRef` to avoid stale closures

React state is async. Reading state in `onMouseUp` captures the previous render's value.
See [code-patterns.md](references/code-patterns.md) Pattern D.

### Rule 4: Color format is `0xRRGGBBAA`

`<input type="color">` only accepts `#RRGGBB`. Convert with `slice(2, 8)`, NOT `slice(-6)`.
See [code-patterns.md](references/code-patterns.md) § Color.

### Rule 5: Never expose credentials in UI

`ticket` and `modelViewUrl` are developer credentials. Hardcode them directly from what the
user provides. Never create input fields for end users to enter these values.

### Rule 6: Check `param.type` before using type-specific APIs

Use type guards (`isDrawingParameterApi`, `isSelectionParameterApi`, etc.) before accessing
`param.settings`. Do not assume a type from the user's description.

**Warning — Interaction `param.settings` is nested at runtime:** The structure is
`{ type: "selection", props: { nameFilter, maximumSelection, ... } }`. The actual
properties are under `settings.props`, NOT directly on `settings`. Always extract:
`const settings = param.settings?.props ?? param.settings;`
Reading `param.settings.nameFilter` directly returns `undefined`.

### Rule 7: CDN — single `bundle.js`, correct globals

- Use `https://viewer.shapediver.com/v3/latest/bundle.js` with `crossorigin="anonymous"` (REQUIRED)
- The global is **`SDV`**, not `SDV3`
- Do NOT add extra `<script>` tags or use esm.sh/unpkg/jsDelivr

### Rule 8: Show actual errors, never generic messages

Use `getSDErrorMessage(e)` to extract the real error. See [code-patterns.md](references/code-patterns.md) § Error Extraction.

### Rule 9: Do NOT enable `customizeOnParameterChange`

Leave it `false` (default). Call `session.customize()` explicitly after setting values.

### Rule 10: Setting `param.value` does NOT send a request

Always call `session.customize()` after setting values.

### Rule 11: Canvas MUST be in the DOM before `createViewport`

Never conditionally render the canvas. Use a loading overlay on top of an always-present canvas.
See [code-patterns.md](references/code-patterns.md) § React Architectural Rules.

### Rule 12: Live color preview — use client-side material mutation, NOT `session.customize()`

When the user wants **live color preview without committing to the server immediately**,
do NOT call `session.customize()` on every color picker movement — this causes 429 errors
and lag. Instead, **mutate `color` on the existing `MaterialStandardData` objects in-place**
using an `output.updateCallback` + `viewport.update()` pattern. Stage the value and commit
only when the user explicitly clicks Apply.

**⚠️ Never replace a material object with `new MaterialStandardData()`** — this discards
all texture maps and breaks the model's appearance. Always mutate the existing object.

Call `updateVersion()` on each mutated `GeometryData` and `MaterialStandardData` at the
leaf level (not just the output node) — geometry can be 6+ levels deep.

Register `output.updateCallback` so the color override persists after server-triggered
geometry updates (e.g., after clicking Apply).

See [code-patterns.md](references/code-patterns.md) Pattern L for the full implementation.

---

## Setup

**CDN vs. NPM decision:** Use CDN + plain HTML for single-page demos, prototypes, and
embeds. Use NPM + framework (React, Vue, etc.) for production apps with build tooling.

### CDN (plain HTML)

```html
<script
  src="https://viewer.shapediver.com/v3/latest/bundle.js"
  crossorigin="anonymous"
></script>
```

Use a fixed version (`X.X.X`) in production. **This single script includes ALL features** —
viewer, interactions, drawing tools, transformation tools, and attribute visualization.
Do NOT add extra `<script>` tags for individual features. Globals: `SDV`, `SDVInteractions`,
`SDVDrawingTools`, `SDVTransformationTools`, `SDVAttributeVisualization`.

### CDN + React

`window.SDV` is not available at mount time. Use the `loadShapeDiverCDN()` loader from
[code-patterns.md](references/code-patterns.md) Pattern K — do NOT write your own.

### NPM / React

```ts
import { createViewport, createSession } from "@shapediver/viewer";
```

For SSR (Next.js, Shopify Hydrogen), dynamic-import inside `useEffect`.

### Feature Packages (NPM vs. CDN)

| Feature                 | NPM Package                                           | CDN Global                  |
| :---------------------- | :---------------------------------------------------- | :-------------------------- |
| Selection, Hover, Drag  | `@shapediver/viewer.features.interaction`             | `SDVInteractions`           |
| Drawing Tools           | `@shapediver/viewer.features.drawing-tools`           | `SDVDrawingTools`           |
| Gumball / Rectangle     | `@shapediver/viewer.features.transformation-tools`    | `SDVTransformationTools`    |
| Attribute Visualization | `@shapediver/viewer.features.attribute-visualization` | `SDVAttributeVisualization` |

---

## Quick API Overview

Create viewport first, then session. Always `await` both.

```ts
const viewport = await SDV.createViewport({
  id: "vp",
  canvas: canvasRef.current,
});
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
});
session.automaticSceneUpdate = true;
```

### Key APIs

- **Parameters:** `session.parameters` (by ID), `session.getParameterByName(name)` (by name)
- **Outputs:** `session.outputs`, `session.getOutputByName(name)`
- **Exports:** `session.exports`, `session.getExportByName(name)`, `session.getExportByType(type)` — must call `export.request(parameters?)` explicitly; accepts optional `{ [paramId]: value }` overrides
- **Customize:** `param.value = newVal; await session.customize();`
- **Sort params for UI:** `Object.values(session.parameters).filter(p => !p.hidden).sort((a,b) => (a.order??0) - (b.order??0))`
- **Close:** `session.close(); viewport.close();` in cleanup

### Parameter Properties

- **`param.type`** — determines how to render a control and format the value:
  `Bool`, `Int`, `Float`, `Even`, `Odd`, `String`, `StringList`, `Color`, `File`,
  `Drawing`, `Interaction`
- **`param.settings`** — pre-configured settings for `Drawing` and `Interaction` params.
  Use type guards to determine the sub-type: `isSelectionParameterApi(param)`,
  `isDraggingParameterApi(param)`, `isGumballTransformParameterApi(param)`,
  `isRectangleTransformParameterApi(param)`, `isDrawingParameterApi(param)`.
  **Warning — For interaction parameters, `settings` is nested at runtime:**
  `{ type: "selection", props: { nameFilter, maximumSelection, ... } }`.
  Always extract: `const settings = param.settings?.props ?? param.settings;`
- **`param.group`** — model-author grouping from Grasshopper. Use this to organize UI
  sections. Do NOT guess groups from parameter names.
- **`param.visualization`** — hint for UI rendering (e.g., `CHECKLIST`, `SLIDER`)
- **`param.order`** — sort order intended by the model author
- **`param.hidden`** — if `true`, do not show in UI

Some models also define **dynamic parameters** in their AppBuilder output that change
based on model state. See [references/dynamic-parameters.md](references/dynamic-parameters.md).

For detailed API surfaces (Session, Viewport, Parameter, Output, Export, Scene Tree, Events,
Materials, Animations, Three.js), see [references/api-reference.md](references/api-reference.md).
Key sections include:
- **Camera restrictions** (zoom/rotation/pan limits, auto-rotate, orthographic)
- **Branding & spinner** (logo, background, grid, busy indicator)
- **Color management** (automaticColorAdjustment, encoding)
- **Model states** (create, load, apply)
- **JWT authorization** (refreshJwtToken callback)
- **Initial parameters** (initialParameterValues on session creation)
- **Multiple sessions & viewports**
- **Progress events** (TASK_START, TASK_PROCESS, TASK_END)
- **Performance tips**

For ready-to-use code patterns (Patterns A–M), parameter value formatting, `toSDValue()`,
React architecture, and troubleshooting, see [references/code-patterns.md](references/code-patterns.md).
Key patterns include:
- **Pattern M** — File upload parameters
- **Pattern L** — Live material color override (client-side, no server call)
- **Customize shorthand** — `session.customize({ "Name": value })`

For advanced troubleshooting beyond the quick-reference table, see
[references/troubleshooting.md](references/troubleshooting.md).

---

## Interaction Features

When the user wants interaction features, load the specific reference:

- **Name Filters** (targeting specific nodes for interaction): [references/name-filters.md](references/name-filters.md)
  How `nameFilter` patterns work, dot-separated syntax, wildcards, scene tree traversal
- **Selection** (click to select/deselect): [references/interactions-selection.md](references/interactions-selection.md)
  SelectManager + HoverManager + InteractionEngine setup, select/deselect events,
  multi-select, cleanup/teardown, multiple selection parameters.
  **Always includes hover** — do not set up hover separately when using selection.
- **Hovering** (visual feedback on hover, standalone): [references/interactions-hovering.md](references/interactions-hovering.md)
  HoverManager setup for hover-only use cases. When combined with selection,
  hover is already included — see selection reference instead.
- **Dragging** (move objects by dragging): [references/interactions-dragging.md](references/interactions-dragging.md)
  DragManager + constraints. References selection.md for InteractionEngine
- **Gumball Transform** (3D translate/rotate/scale gizmo): [references/gumball-transform.md](references/gumball-transform.md)
  GumballTransform setup, axis constraints, events
- **Rectangle Transform** (2D planar gizmo): [references/rectangle-transform.md](references/rectangle-transform.md)
  RectangleTransform setup, 2D bounds
- **Drawing Tools** (draw/edit points and lines): [references/drawing-tools-reference.md](references/drawing-tools-reference.md)
  Rules 10-12, settings tables, restrictions, full CDN + NPM examples, value format
- **HTML Anchors** (overlay HTML on 3D scene, in-scene UI): [references/html-anchors.md](references/html-anchors.md)
  Text labels, image anchors, custom data anchors, **in-scene UI elements** (buttons,
  controls, parameter widgets anchored to 3D objects)
- **Attribute Visualization** (color-code geometry by data): [references/attribute-visualization.md](references/attribute-visualization.md)
  Color-coded geometry overlays, layers, sdTF data inspection
- **Post-Processing** (visual effects on rendered scene): [references/post-processing.md](references/post-processing.md)
  Bloom, SSAO, HBAO, Depth of Field, Outline, Vignette, Selective Bloom, custom effects,
  manual EffectComposer access, combining outline with interactions
- **Animations** (animate scene nodes): [references/animations.md](references/animations.md)
  AnimationData + AnimationTracks, translation/rotation/scale keyframes, looping, glTF animations
- **Augmented Reality (AR)** (view models in real world): [references/augmented-reality.md](references/augmented-reality.md)
  AR availability check, launch AR on device, QR code session links, scene setup for AR
- **Three.js Objects** (add custom three.js objects, access internal meshes): [references/threejs-objects.md](references/threejs-objects.md)
  ThreejsData, adding Object3D to scene tree, accessing converted geometry, updateCallbackThreeJsObject
- **glTF Loader** (load external glTF/glb assets into the scene): [references/gltf-loader.md](references/gltf-loader.md)
  DataEngine.loadContent(), external glTF enrichment, glTF preview tool

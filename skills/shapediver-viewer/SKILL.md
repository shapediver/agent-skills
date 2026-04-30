---
name: shapediver-viewer
description: >
  Build custom 3D product configurators with the ShapeDiver Viewer V3 API.
  Use this skill when the user needs to write custom code using @shapediver/viewer
  or the ShapeDiver CDN bundle — including session/viewport setup, parameter
  controls, commit patterns, export downloads, React integration, and interaction
  features (selection, hover, drag, gumball, drawing tools, attribute visualization).
  Covers CDN and NPM workflows.
---

# ShapeDiver Viewer V3 API

Follow every rule in this file exactly. Do not improvise or work around any constraint.

---

## Gotchas — Never Invent Model-Specific Values

Use ONLY values the user has explicitly provided. If missing, use the placeholder and ask.

| Value             | Placeholder                        |
| ----------------- | ---------------------------------- |
| `ticket`          | `"PASTE_YOUR_TICKET_HERE"`         |
| `modelViewUrl`    | `"PASTE_YOUR_MODEL_VIEW_URL_HERE"` |
| Parameter name/ID | `"PARAM_NAME_OR_ID"`               |
| Output name/ID    | `"OUTPUT_NAME_OR_ID"`              |
| Export name/ID    | `"EXPORT_NAME_OR_ID"`              |

`ticket` and `modelViewUrl` can only be obtained from the "Developers" tab on
shapediver.com. A public model URL does NOT expose these values. If the user shares a URL,
tell them: _"I need the `ticket` and `modelViewUrl` from the Developers tab."_

Do NOT filter or group parameters by guessing names. If grouping is needed, ask the user
for exact names/IDs. `param.type` tells you how to render a control, not which group it
belongs to.

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
- **Exports:** `session.exports`, `session.getExportByName(name)` — must call `export.request()` explicitly
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
- **`param.group`** — model-author grouping from Grasshopper. Use this to organize UI
  sections. Do NOT guess groups from parameter names.
- **`param.visualization`** — hint for UI rendering (e.g., `CHECKLIST`, `SLIDER`)
- **`param.order`** — sort order intended by the model author
- **`param.hidden`** — if `true`, do not show in UI

For detailed API surfaces (Session, Viewport, Parameter, Output, Export, Scene Tree, Events,
Materials, Animations, Three.js), see [references/api-reference.md](references/api-reference.md).

For ready-to-use code patterns (Patterns A–K), parameter value formatting, `toSDValue()`,
React architecture, and troubleshooting, see [references/code-patterns.md](references/code-patterns.md).

---

## Interaction Features

When the user wants interaction features, load the specific reference:

- **Selection** (click to select/deselect): [references/interactions-selection.md](references/interactions-selection.md)
  SelectManager + InteractionEngine setup, select/deselect events, multi-select
- **Hovering** (visual feedback on hover): [references/interactions-hovering.md](references/interactions-hovering.md)
  HoverManager setup, highlight on hover. References selection.md for InteractionEngine
- **Dragging** (move objects by dragging): [references/interactions-dragging.md](references/interactions-dragging.md)
  DragManager + constraints. References selection.md for InteractionEngine
- **Gumball Transform** (3D translate/rotate/scale gizmo): [references/gumball-transform.md](references/gumball-transform.md)
  GumballTransform setup, axis constraints, events
- **Rectangle Transform** (2D planar gizmo): [references/rectangle-transform.md](references/rectangle-transform.md)
  RectangleTransform setup, 2D bounds
- **Drawing Tools** (draw/edit points and lines): [references/drawing-tools-reference.md](references/drawing-tools-reference.md)
  Rules 10-12, settings tables, restrictions, full CDN + NPM examples, value format
- **HTML Anchors** (overlay HTML on 3D scene): [references/html-anchors.md](references/html-anchors.md)
  Text labels, image anchors, custom data anchors
- **Attribute Visualization** (color-code geometry by data): [references/attribute-visualization.md](references/attribute-visualization.md)
  Color-coded geometry overlays, layers, sdTF data inspection

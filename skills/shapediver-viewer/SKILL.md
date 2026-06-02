---
name: shapediver-viewer
description: >
  Use this skill when the user needs to write custom code using the ShapeDiver
  Viewer V3 API (@shapediver/viewer or the ShapeDiver CDN bundle) to build a 3D
  product configurator — including session/viewport setup, parameter controls,
  commit patterns, export downloads, React integration, and interaction features
  (selection, hover, drag, gumball, drawing tools, attribute visualization).
  Covers CDN and NPM workflows.
license: MIT
---

# ShapeDiver Viewer V3 API

> **Prerequisite:** This skill assumes you have already read and followed the
> `shapediver-router` skill. If you arrived here directly, stop — read
> `shapediver-router` first. It selects the correct integration strategy and
> gathers required credentials before any implementation skill is read.

Follow every rule in this file exactly. Do not improvise or work around any constraint.

**Scope discipline:** Touch only what the user asked for. Do not add features, refactor
adjacent code, or "improve" files beyond the stated request. If the user asks for a slider,
build a slider — do not add export buttons, camera controls, or interaction features
they did not request.

---

## Workflow

Follow these steps in order. Do not skip steps or jump ahead to writing code.
Each step has a checkpoint — do not proceed until the checkpoint is met.

### Step 1: Collect Credentials and Model Metadata

Obtain `ticket`, `modelViewUrl`, and parameter/output/export metadata.
Use the API script (Option A below) or manual values from the user (Option B).

**Checkpoint:** You have real values for `ticket` and `modelViewUrl`, OR you have inserted
placeholders and asked the user to provide them. You have confirmed the AppBuilder output
check below.

### Step 1a: AppBuilder Output Check (mandatory before writing any code)

Scan the outputs list from the script or user-provided metadata for an output named
**"AppBuilder"** (exact name, case-insensitive). Do this **before reading further**.

**If found:** Stop. Ask the user:

> _"This model has an AppBuilder output — it is configured for the ShapeDiver App Builder.
> Are you sure you want a custom Viewer API integration instead? The App Builder may
> already cover your needs with less effort."_

If they confirm custom integration, document their reason and continue.
If they want App Builder, hand off to the `shapediver-appbuilder` skill.

**Checkpoint:** You have confirmed no AppBuilder output exists, OR the user has explicitly
confirmed they want a custom integration despite the AppBuilder output.

### Step 2: Choose CDN or NPM

Ask the user's stack if not obvious. Use CDN + plain HTML for single-page demos, prototypes,
and embeds. Use NPM + framework for production apps with build tooling. See "Setup" below.

**Checkpoint:** CDN or NPM decision is made. If CDN: you will use a single `bundle.js`
script tag (Rule 7). If NPM: you know the framework (React, Vue, plain TS).

### Step 3: Scaffold the Page / Component

Create the HTML file or React component with the canvas element.

**Checkpoint:** The canvas element is **always present in the DOM** — not conditionally
rendered (Rule 11). If showing a loading state, it is an overlay on top of the
always-present canvas. The correct script tag (CDN) or imports (NPM) are in place.

### Step 4: Create Viewport and Session

Write the initialization code: create viewport first, then session. Always `await` both.
See "Quick API Overview" below.

**Checkpoint:** `createViewport` is called before `createSession`. Both calls are awaited.
`ticket` and `modelViewUrl` are hardcoded from user-provided values — not exposed as UI
inputs (Rule 5). Error handling wraps initialization with `getSDErrorMessage` (Rule 8).

### Step 5: Build Parameter Controls

Render UI controls for each parameter based on `param.type`. Filter out `param.hidden`,
sort by `param.order`, group by `param.group`.

**Checkpoint — verify ALL of these before proceeding:**

- Sliders (`Int`, `Float`, `Even`, `Odd`): commit on `onMouseUp` / `onChangeEnd`, NOT
  `onChange` (Rule 1). React sliders use `useRef` to avoid stale closures (Rule 3).
- Color pickers: commit at end of interaction, not on every movement (Rule 2). Format is
  `0xRRGGBBAA` (Rule 4).
- Dropdowns (`StringList`) and checkboxes (`Bool`): these are the ONLY controls where
  `onChange` is safe.
- Text inputs (`String`): commit on `onBlur`, NOT `onChange` (Rule 1).
- `session.customize()` is called explicitly after setting `param.value` (Rules 9–10).
- Values are formatted correctly per type — see "Parameter Formatting" reference.
- **When multiple parameter types are requested, ALL must appear in the delivered file.**
  A partial implementation is not acceptable — do not truncate or omit any requested
  control type. Prioritize complete code over explanatory prose.

### Step 6: Add Interaction Features (if requested)

Only if the user asked for interactions (selection, drag, drawing tools, gumball, etc.).
Load the specific reference file listed in "Interaction Features" below.

**Checkpoint:** Type guards are used before accessing `param.settings` (Rule 6). Settings
are extracted with `param.settings?.props ?? param.settings` — never read directly from
`param.settings`. The correct reference file has been read and its rules followed.

### Step 7: Add Exports and Outputs (if requested)

Only if the user asked for file downloads or data output reading.
`export.request()` must be called explicitly — exports do not auto-trigger.

**Checkpoint:** Export requests use the correct API. Output data is read from
`output.content`. Error handling is in place.

### Step 8: Add Cleanup

Add `session.close()` and `viewport.close()` in the appropriate cleanup path
(React `useEffect` return, `window.onbeforeunload`, etc.).

**Checkpoint:** Both session and viewport are closed on teardown. No dangling sessions.

### Step 9: Review Against Critical Rules

Before delivering, re-read Critical Rules 1–12 below and verify the generated code
against every one. Fix any violations.

**Checkpoint — exit criteria (all must be true):**

- Every Critical Rule (1–12) has been checked and the code complies.
- No model-specific values are invented — only user-provided or placeholder values are used.
- Credentials are not exposed in UI input fields.
- The code is a complete, runnable file — not a fragment.

### Step 10: Serve Locally

If model metadata was retrieved via the API script (Option A), check the `allowedDomains`
array in the script output for a `localhost` entry (e.g., `localhost:5000`, `127.0.0.1:8080`).

If a localhost domain with a specific port is found, serve the generated file on that port:

```bash
npx serve -l <port>
```

If no localhost entry exists in `allowedDomains`, inform the user that they need to add
their local development domain (e.g., `localhost:3000`) to the model's embedding domains
at https://www.shapediver.com/app/settings/domains before the viewer session will work
locally — otherwise session creation will fail with HTTP 403.

**Checkpoint:** The file is served on a port that matches a whitelisted domain, or the user
has been informed about the domain whitelisting requirement.

---

## Obtaining Model-Specific Values

### Option A: Retrieve via API (preferred)

If the user provides a **model slug** (the URL identifier from `shapediver.com/app/m/{slug}`)
and **Platform API access keys** (access key ID + secret), you can retrieve `ticket`,
`modelViewUrl`, and full parameter/output/export metadata automatically.

Run the shared script at the repository root (self-contained — auto-installs
dependencies on first run, requires Node.js):

```bash
node ../../scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

> **Note:** Adjust `../../scripts/` to the actual path of the script relative to your
> current working directory. From a project at the workspace root, use `scripts/get-model-info.js`.

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

**After running the script:** Before reading the full JSON, extract and review all output
names to check for an AppBuilder output:

```bash
# Linux / macOS
cat model-info.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); JSON.parse(d).outputs.forEach(o=>console.log(o.name))"

# Windows PowerShell
Get-Content model-info.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); JSON.parse(d).outputs.forEach(o=>console.log(o.name))"
```

This reveals all output names in under a second and prevents missing a late-appearing
AppBuilder output in a long JSON file.

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

**When the user provides values** (e.g., `ticket: abc123` in the prompt): use them
exactly as-is. Do NOT add comments calling them placeholders or suggesting they need
to be replaced — they are the real values.

Do NOT filter or group parameters by guessing names. If grouping is needed, ask the user
for exact names/IDs. `param.type` tells you how to render a control, not which group it
belongs to.

---

## Critical Rules

These are the most commonly violated patterns. Read all before writing code.
For code examples of each rule, see [references/core-patterns.md](references/core-patterns.md).

### Rule 1: NEVER use `onChange` to commit parameters

Every `session.customize()` call is a network request. `onChange` on sliders, color pickers,
and text inputs fires continuously, causing HTTP 429 rate-limit errors.
**Dropdown and checkbox are the ONLY controls where `onChange` is safe.**
Use `onMouseUp`/`onChangeEnd`/`onBlur` for all others. See [core-patterns.md](references/core-patterns.md) § Commit Function.

### Rule 2: Color picker — use debounced `input` + immediate `change`, not `onChange` or `onMouseUp`

`onChange` on `<input type="color">` fires on every mouse movement — causes 429 errors.
This applies to **both React (`onChange`) and vanilla JS** — in both environments the event
fires continuously while the user drags. Do NOT use `onChange` (React) or `oninput` (DOM)
for color pickers, **even indirectly through a wrapper function** — if `onChange` triggers
any path that calls `session.customize()`, it violates this rule.
`onMouseUp` fires when _opening_ the picker, not when selecting a color — wrong event.

For CDN / vanilla JS, use **Pattern E2**: add an `input` listener with a ~300 ms debounce
for live preview while dragging, **plus** a DOM `change` listener that clears the timer and
commits immediately when the picker closes. Both listeners are required — `change`-only
(Pattern E3) gives no live preview and feels unresponsive.
For React, `onChange` on `<input type="color">` maps to the DOM `change` event (fires only
when the picker closes, not on every movement) — so `onChange` can be used for the final
commit. Pair it with a debounced `onInput` for live preview (Pattern E2).
See [ui-patterns.md](references/ui-patterns.md) Pattern E for all implementations.

### Rule 3: Slider — use `useRef` to avoid stale closures

React state is async. Reading state in `onMouseUp` captures the previous render's value.
See [ui-patterns.md](references/ui-patterns.md) Pattern D.

### Rule 4: Color format is `0xRRGGBBAA`

`<input type="color">` only accepts `#RRGGBB`. Convert with `slice(2, 8)`, NOT `slice(-6)`.
See [parameter-formatting.md](references/parameter-formatting.md) § Color.

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

Use `getSDErrorMessage(e)` to extract the real error. See [core-patterns.md](references/core-patterns.md) § Error Extraction.

### Rule 9: Do NOT enable `customizeOnParameterChange`

Leave it `false` (default). Call `session.customize()` explicitly after setting values.

### Rule 10: Setting `param.value` does NOT send a request

Always call `session.customize()` after setting values.

### Rule 11: Canvas MUST be in the DOM before `createViewport`

Never conditionally render the canvas. Use a loading overlay on top of an always-present canvas.
See [core-patterns.md](references/core-patterns.md) § React Architectural Rules.

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

See [advanced-patterns.md](references/advanced-patterns.md) Pattern L for the full implementation.

---

## Anti-Rationalization Table

These are the shortcuts you will be tempted to take. Each one breaks the integration.

| You will think…                                                             | Why it is wrong                                                                                                                                                      |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "This is a simple demo, so `onChange` on the slider is fine."               | Every `customize()` is a network request. Even a demo hits HTTP 429 errors within seconds of dragging a slider. Use `onChangeEnd` / `onMouseUp`. Always.             |
| "I'll add a text field for the ticket so the user can test easily."         | Tickets are credentials. Exposing them in a UI input trains users to paste secrets into form fields. Hardcode them from provided values.                             |
| "I don't need `settings.props` — I'll read `settings.nameFilter` directly." | It returns `undefined` at runtime. The nested structure (`settings.props`) is how the API works. Always extract via `param.settings?.props ?? param.settings`.       |
| "I know what parameter names this model has — I'll hardcode them."          | You do not know. Parameter names are model-specific. Use placeholders or values from the API script. Never invent names.                                             |
| "The user asked for a configurator, so I'll add export buttons too."        | The user asked for what they asked for. Adding unrequested features violates scope discipline and bloats the code with untested behavior.                            |
| "I'll use `esm.sh` / `unpkg` / `jsDelivr` for the CDN bundle."              | The only supported CDN URL is `https://viewer.shapediver.com/v3/latest/bundle.js`. Third-party CDNs serve broken or incomplete builds.                               |
| "The code compiles, so it's correct — no need to re-check the rules."       | Rules 1–4 are violated in the majority of LLM-generated ShapeDiver code. Step 9 of the Workflow exists because this rationalization is the most common failure mode. |

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
[advanced-patterns.md](references/advanced-patterns.md) Pattern K — do NOT write your own.

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

For detailed API surfaces, load the specific reference needed:

- **Session API** (creation, customization, parameter/output access, model states, JWT, file uploads): [references/session-api.md](references/session-api.md)
- **Viewport API** (camera restrictions, environment, branding, screenshots, AR, rendering): [references/viewport-api.md](references/viewport-api.md)
- **Parameter, Output & Export API** (properties, type guards, export requests, output updates): [references/parameter-output-export-api.md](references/parameter-output-export-api.md)
- **Scene Tree, Materials, Events, Animations, Three.js** (ITreeNode, MaterialStandardData, event listeners, glTF): [references/scene-tree-materials.md](references/scene-tree-materials.md)
- **Advanced Topics** (domain whitelisting, JWT, initial parameters, multi-session, performance): [references/advanced-topics.md](references/advanced-topics.md)

For code patterns, load the specific reference needed:

- **Parameter Formatting & `toSDValue()`** (Bool, Int, Float, StringList, Color, File conversion): [references/parameter-formatting.md](references/parameter-formatting.md)
- **Core Patterns** (commitParam, error extraction, React architectural rules, commit events): [references/core-patterns.md](references/core-patterns.md)
- **UI Patterns A–I** (CDN setup, React setup, slider, dropdown, color picker, export, output, router): [references/ui-patterns.md](references/ui-patterns.md)
- **Advanced Patterns J–M & Troubleshooting** (screenshot, CDN+React loader, live material override, file upload, error table): [references/advanced-patterns.md](references/advanced-patterns.md)

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

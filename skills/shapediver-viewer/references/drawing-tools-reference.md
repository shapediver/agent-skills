# DrawingTools — Create/Edit Points & Lines

**Does NOT require InteractionEngine.** Has its own event handling. Beta feature.

Uses `@shapediver/viewer.features.drawing-tools` (NPM) or `SDVDrawingTools` (CDN).

Drawing parameters can also appear as **dynamic parameters** in the AppBuilder output.
See [dynamic-parameters.md](dynamic-parameters.md).

---

## Critical Rules

### Rule 10: NEVER hardcode DrawingTools settings — use `param.settings`

The Grasshopper model author configures mode, points, close behavior, and restrictions.
Hardcoding overwrites their configuration and breaks the model.

```ts
// ✅ CORRECT — spread param.settings as base, provide fallbacks only
const preConfigured = isDrawingParameterApi(param) ? param.settings : {};
const settings = {
  geometry: {
    ...preConfigured.geometry,
    mode: preConfigured.geometry?.mode ?? "lines",
    points: [],
    close: preConfigured.geometry?.close ?? true,
    autoClose: preConfigured.geometry?.autoClose ?? false, // Rule 11
    ...(preConfigured.geometry?.minPoints != null && {
      minPoints: preConfigured.geometry.minPoints,
    }),
    ...(preConfigured.geometry?.maxPoints != null && {
      maxPoints: preConfigured.geometry.maxPoints,
    }),
    ...(preConfigured.geometry?.strictMinMaxPoints != null && {
      strictMinMaxPoints: preConfigured.geometry.strictMinMaxPoints,
    }),
  },
  restrictions:
    preConfigured.restrictions ??
    {
      /* fallback plane */
    },
  // Visualization settings (point labels, distance labels, materials)
  ...(preConfigured.visualization && {
    visualization: preConfigured.visualization,
  }),
  // Key binding overrides
  ...(preConfigured.keyBindings && {
    keyBindings: preConfigured.keyBindings,
  }),
  // General/behavior settings (autoStart, autoUpdate, closeOnUpdate, displayUnit)
  ...(preConfigured.general && {
    general: preConfigured.general,
  }),
  // Drawing controls settings
  ...(preConfigured.controls && {
    controls: preConfigured.controls,
  }),
};
```

### Rule 11: `autoClose` MUST default to `false`

`autoClose: true` locks the polygon closed permanently. Only set `true` if the user
explicitly requests it. Never set `minPoints`/`maxPoints` to `undefined` — use conditional
spread or omit entirely.

### Rule 12: ALWAYS provide clickable UI buttons

In LLM coding environments (Bolt, Replit, CodeSandbox), keyboard events are intercepted.
Always render visible Apply/Cancel/Undo/Redo buttons.

```ts
function createDrawingToolbar(container, api, settings) {
  const toolbar = document.createElement("div");
  toolbar.style.cssText =
    "position:absolute;top:10px;right:10px;z-index:100;display:flex;gap:6px;";
  const makeBtn = (label, onClick) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = onClick;
    toolbar.appendChild(btn);
    return btn;
  };
  makeBtn("✓ Apply", () => api.update());
  makeBtn("✗ Cancel", () => api.cancel());
  makeBtn("↩ Undo", () => api.undo());
  makeBtn("↪ Redo", () => api.redo());
  if (settings.geometry?.mode === "points") {
    makeBtn("✓ Done", () => {
      api.update();
      api.close();
      toolbar.remove();
    });
  }
  container.appendChild(toolbar);
  return toolbar;
}
```

---

## Basic Usage

Every implementation MUST:

1. Spread `param.settings` as base (Rule 10)
2. Default `autoClose` to `false` (Rule 11)
3. Omit `minPoints`/`maxPoints` when not needed — use conditional spread (Rule 11)
4. Render clickable UI buttons (Rule 12)
5. Add "Done" button for `mode: 'points'`

```ts
import { createDrawingTools } from "@shapediver/viewer.features.drawing-tools";
import { isDrawingParameterApi } from "@shapediver/viewer";

const param = session.parameters["MY_DRAWING_PARAM_ID"];
const isTypedDrawing = isDrawingParameterApi(param);
const preConfigured = isTypedDrawing ? param.settings : {};

const settings = {
  /* see Rule 10 pattern above for full settings construction */
};

const drawingApi = createDrawingTools(
  viewport,
  {
    onUpdate: async (pointsData) => {
      param.value = JSON.stringify({ points: pointsData });
      await session.customize();
    },
    onCancel: () => console.log("Drawing cancelled"),
  },
  settings,
);

createDrawingToolbar(
  document.getElementById("canvas-container"),
  drawingApi,
  settings,
);
```

### CDN equivalent

On CDN, all globals come from the single `bundle.js`. No extra scripts needed.
Use `SDV.isDrawingParameterApi` for type guards and `SDVDrawingTools.createDrawingTools`
for the factory.

```js
const param = session.getParameterByName("MY_DRAWING_PARAM");
const isTypedDrawing = SDV.isDrawingParameterApi(param);
const preConfigured = isTypedDrawing ? param.settings : {};

const settings = {
  /* see Rule 10 pattern above for full settings construction */
};

const drawingApi = SDVDrawingTools.createDrawingTools(
  viewport,
  {
    onUpdate: async (pointsData) => {
      param.value = JSON.stringify({ points: pointsData });
      await session.customize();
    },
    onCancel: () => console.log("Drawing cancelled"),
  },
  settings,
);

createDrawingToolbar(
  document.getElementById("canvas-container"),
  drawingApi,
  settings,
);
```

### Drawing Parameter Value Format

The `onUpdate` callback receives `pointsData` — an array of `[x, y, z]` coordinate arrays.
Always set the value as:

```ts
param.value = JSON.stringify({ points: pointsData });
```

This is the format for both typed (`isDrawingParameterApi`) and untyped drawing parameters.
Do NOT stringify `pointsData` directly without wrapping it in `{ points: ... }`.

---

## Settings Reference

### `geometry`

| Property             | Type                  | Description                                                         |
| :------------------- | :-------------------- | :------------------------------------------------------------------ |
| `mode`               | `'lines' \| 'points'` | Lines: connected in order. Points: independent.                     |
| `points`             | `number[][]`          | Initial points.                                                     |
| `close`              | `boolean`             | Initial closed state (user can toggle).                             |
| `autoClose`          | `boolean`             | **Forces** line to stay closed. Default `false`.                    |
| `minPoints`          | `number`              | Minimum points. **Omit if not needed — do NOT set to `undefined`.** |
| `maxPoints`          | `number`              | Maximum points. **Omit if not needed — do NOT set to `undefined`.** |
| `strictMinMaxPoints` | `boolean`             | Enforce during drawing vs. only on confirm.                         |

### `restrictions`

**At least one restriction is required.** Each is keyed with a `type`:

| Type             | Key Properties                   | Description                      |
| :--------------- | :------------------------------- | :------------------------------- |
| `'plane'`        | `origin`, `vector_u`, `vector_v` | Constrain to plane. Hosts snaps. |
| `'point'`        | `point`, `radius`                | Snap to a 3D point.              |
| `'line'`         | `point1`, `point2`, `radius`     | Snap to a line segment.          |
| `'geometry'`     | `nodes` or `nameFilter`          | Snap to existing scene geometry. |
| `'camera_plane'` | —                                | Constrain to camera plane.       |

Common base: `type`, `id`, `priority`, `createHelperObjects`, `hideable`, `rotation`.

**Plane-specific:** also has `gridSnapRestriction`, `angularSnapRestriction`, `axisSnapRestriction`
(nested snap sub-restrictions — NOT top-level types).

### `visualization`

`distanceMultiplicationFactor`, `pointLabels`, `distanceLabels`, `points` (material), `lines` (material).

### `keyBindings`

`insert`, `delete`, `confirm`, `cancel`, `undo`, `redo`.

### `general`

| Property        | Type      | Description                                       |
| :-------------- | :-------- | :------------------------------------------------ |
| `autoStart`     | `boolean` | Start drawing immediately when no initial points. |
| `autoUpdate`    | `boolean` | Auto-trigger `onUpdate` on every geometry change. |
| `closeOnUpdate` | `boolean` | Close tool after `onUpdate`.                      |
| `displayUnit`   | `string`  | Unit label (e.g. `'mm'`, `'cm'`).                 |

### `controls`

Drawing controls settings (extensible). Passed through to the drawing tools SDK.

### `activeMode` and `prompt`

| Property       | Type     | Description                                                 |
| :------------- | :------- | :---------------------------------------------------------- |
| `activeMode`   | `string` | `"activeOnStart"` to auto-activate the drawing tool on load |
| `prompt`       | `object` | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

**Use ALL defined settings.** When constructing the `settings` object for `createDrawingTools`,
include every section that is present in `param.settings`: `geometry`, `restrictions`,
`visualization`, `keyBindings`, `general`, and `controls`.

---

## IDrawingToolsApi Methods

| Method                               | Description                               |
| :----------------------------------- | :---------------------------------------- |
| `addPoint(index, position?)`         | Insert a point.                           |
| `removePoint(index)`                 | Remove a point.                           |
| `movePoint(index, position, ...)`    | Move a point.                             |
| `addRestriction(properties, token?)` | Add restriction at runtime.               |
| `removeRestriction(id)`              | Remove restriction.                       |
| `update()`                           | Trigger update, returns `{ pointsData }`. |
| `cancel()`                           | Cancel drawing.                           |
| `close()`                            | Close and dispose.                        |
| `pause()` / `continue()`             | Suspend/resume interactions.              |
| `undo()` / `redo()`                  | Undo/redo.                                |
| `canUndo()` / `canRedo()`            | Check availability.                       |

### How Drawing Ends

**1. Confirm (`update()`)** — Fires `onUpdate` with `pointsData`. Validates min/maxPoints.
With `autoUpdate: true`, fires on every geometry change.

**2. Cancel (`cancel()`)** — Fires `onCancel`. Tool is closed and disposed.

**3. Close (`close()`)** — Programmatic cleanup. No callbacks fire.

### Common Patterns

```ts
// Auto-update (RECOMMENDED): immediate feedback on every change
const settings = { general: { autoUpdate: true, closeOnUpdate: false } };

// Manual confirm: user clicks "Apply" to submit
const settings2 = { general: { autoUpdate: false, closeOnUpdate: false } };

// One-shot: close after confirm
const settings3 = { general: { autoUpdate: false, closeOnUpdate: true } };

// React cleanup
useEffect(() => {
  const api = createDrawingTools(viewport, callbacks, settings);
  return () => api.close();
}, []);
```

### Drawing Tools Events

| Event                               | Fires when               |
| :---------------------------------- | :----------------------- |
| `drawing_tools.added`               | Point added.             |
| `drawing_tools.removed`             | Point removed.           |
| `drawing_tools.moved`               | Point moved.             |
| `drawing_tools.selected`            | Point selected.          |
| `drawing_tools.drag.start/move/end` | Point drag lifecycle.    |
| `drawing_tools.finish`              | Drawing confirmed.       |
| `drawing_tools.cancel`              | Drawing cancelled.       |
| `drawing_tools.geometry.changed`    | Any geometry change.     |
| `drawing_tools.minimumPoints`       | Min point count reached. |
| `drawing_tools.maximumPoints`       | Max point count reached. |

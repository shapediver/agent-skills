# DragManager — Drag Objects in 3D

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

## `param.settings` Reference

When `isDraggingParameterApi(param)` is `true`, `param.settings` at runtime has the
structure `{ type: "dragging", props: { ... } }`. The properties below are under
`settings.props`. Always extract them first:

```ts
const settings = param.settings?.props ?? param.settings;
```

The extracted `settings` object may contain:

| Property                 | Type                          | Default     | Description                                                      |
| :----------------------- | :---------------------------- | :---------- | :--------------------------------------------------------------- |
| `draggingColor`          | `string` or effect definition | `"#0d44f0"` | Color/effect of objects while being dragged                      |
| `availableColor`         | `string` or effect definition | `"#ffffff"` | Color/effect highlighting draggable objects before interaction   |
| `hoverColor`             | `string` or effect definition | `"#00ff78"` | Color/effect on hover                                            |
| `hover`                  | `boolean`                     | `true`      | Enable/disable hover effect                                      |
| `objects`                | `array`                       | —           | Array of draggable object definitions (see below)                |
| `objects[].nameFilter`   | `string`                      | —           | Name filter targeting specific scene nodes                       |
| `objects[].restrictions` | `string[]`                    | —           | IDs of restrictions to apply to this object                      |
| `objects[].dragOrigin`   | `[x, y, z]`                   | —           | Origin point for dragging                                        |
| `objects[].dragAnchors`  | `array`                       | —           | `{ id, position: [x,y,z], rotation?: { angle, axis } }`          |
| `restrictions`           | `array`                       | —           | Restriction definitions (plane, geometry, etc.)                  |
| `activeMode`             | `string`                      | —           | `"activeOnStart"` to auto-activate on load                       |
| `prompt`                 | `object`                      | —           | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

**Use ALL defined settings.** If a setting is present in the extracted `settings`, apply it.

## Create DragManager

The `DragManager` and `HoverManager` constructors take a `componentId` string (for
scoping — see [interactions-selection.md](interactions-selection.md) § Component ID)
and an optional interaction effect as the second argument. The same `componentId`
must be passed to `addInteractionData` when marking nodes. Use the parameter ID as
the `componentId`.

```ts
import {
  InteractionData,
  DragManager,
  HoverManager,
  CameraPlaneConstraint,
  PlaneConstraint,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";
import {
  isDraggingParameterApi,
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
} from "@shapediver/viewer";

const dragParam = Object.values(session.parameters).find(
  isDraggingParameterApi,
);
const settings = dragParam?.settings?.props ?? dragParam?.settings;
const componentId = dragParam.id;

// App Builder default: purple outline for dragged objects
const draggingEffect = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: BlendFunction.ALPHA,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#9e27d8",
    kernelSize: KernelSize.LARGE,
    visibleEdgeColor: "#9e27d8",
    xRay: true,
  },
};

const dragManager = new DragManager(componentId, draggingEffect);
interactionEngine.addInteractionManager(dragManager);

// Add hover feedback — only skip if settings.hover is explicitly false
if (settings?.hover !== false) {
  const hoverEffect = {
    type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
    properties: {
      blendFunction: BlendFunction.ALPHA,
      blur: true,
      edgeStrength: 10,
      hiddenEdgeColor: "#ffffff",
      kernelSize: KernelSize.LARGE,
      visibleEdgeColor: "#ffffff",
    },
  };
  const hoverManager = new HoverManager(componentId, hoverEffect);
  interactionEngine.addInteractionManager(hoverManager);
}
```

If the extracted `settings` provides `draggingColor` / `hoverColor`, use those values instead.
For simple use cases, `MaterialStandardData` also works as the effect argument.

CDN: `new SDVInteractions.DragManager(componentId, effect)`,
`new SDVInteractions.HoverManager(componentId, effect)`.

## Mark Nodes as Draggable

**Always use `addInteractionData(node, settings, componentId)` to mark nodes.**
See [interactions-selection.md](interactions-selection.md) § Component ID for why
`componentId` is required.

### Per-Object Setup (`settings.objects`)

When `settings.objects` is defined, each object has:

| Property       | Type        | Description                                                            |
| :------------- | :---------- | :--------------------------------------------------------------------- |
| `nameFilter`   | `string`    | Single name filter string targeting specific scene nodes               |
| `restrictions` | `string[]`  | IDs referencing entries in top-level `settings.restrictions`           |
| `dragOrigin`   | `[x, y, z]` | The origin point for the drag interaction                              |
| `dragAnchors`  | `array`     | Anchor points: `{ id, position: [x,y,z], rotation?: { angle, axis } }` |

Iterate over each object to find matching nodes and pass per-object properties
(`dragOrigin`, `dragAnchors`) to `addInteractionData`:

```ts
import {
  convertUserDefinedNameFilters,
  gatherNodesForPattern,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";

// Build outputId → outputName mapping
const outputIdsToNames = {};
Object.entries(session.outputs).forEach(([id, out]) => {
  outputIdsToNames[id] = out.name;
});

for (const obj of settings.objects) {
  const patterns = convertUserDefinedNameFilters(
    [obj.nameFilter],
    outputIdsToNames,
  );

  for (const [outputId, outputPatterns] of Object.entries(patterns)) {
    const outputRef = session.outputs[outputId];
    if (!outputRef?.node) continue;

    const available = {};
    for (const pattern of outputPatterns) {
      if (pattern.length === 0) {
        available[outputRef.node.id] = { node: outputRef.node };
      } else {
        for (const child of outputRef.node.children) {
          gatherNodesForPattern(child, pattern, outputRef.name, available, 0);
        }
      }
    }

    Object.values(available).forEach(({ node }) => {
      addInteractionData(
        node,
        {
          drag: true,
          hover: settings.hover !== false,
          dragOrigin: obj.dragOrigin, // [x, y, z] or undefined
          dragAnchors: obj.dragAnchors, // array or undefined
        },
        componentId,
      );
    });
  }
}
```

### Without Objects (Fallback)

When `settings.objects` is **not defined** (or empty), make all geometry draggable:

```ts
addInteractionData(
  session.node,
  { drag: true, hover: settings?.hover !== false },
  componentId,
);
```

## Drag Restrictions

**At least one restriction is required** — without a restriction, the DragManager doesn't
know how to constrain movement and dragging does nothing.

See [restrictions.md](restrictions.md) for restriction types, geometry restriction
node resolution, per-object matching patterns, and the drag-specific DRAG_START/DRAG_END
restriction application flow.

## Drag Event Value Format

The `DRAG_END` event provides the transformation matrix and the restriction/anchor used.
Build the parameter value from this:

```ts
addListener(EVENTTYPE_INTERACTION.DRAG_END, async (e) => {
  if (e.manager.id !== componentId) return;
  dragParam.value = JSON.stringify({
    objects: [
      {
        name: e.node.name,
        transformation: Array.from(e.matrix), // 16-element flat matrix
        restrictionId: e.restriction?.id,
        dragAnchorId: e.dragAnchor?.id,
      },
    ],
  });
  await session.customize();
});
```

## Re-Marking Nodes After Output Updates

When parameters change (e.g., shelf count), the backend regenerates geometry and output
nodes are replaced. The `InteractionData` previously attached to old nodes is lost.
**You must re-mark nodes after every output update.**

The App Builder uses `output.updateCallback` (called with `(newNode, oldNode)`) to
clean up old InteractionData and re-apply it to new nodes. For CDN / plain HTML usage,
listen for `EVENTTYPE_OUTPUT.OUTPUT_UPDATED` events instead:

```ts
import { addListener, EVENTTYPE_OUTPUT } from "@shapediver/viewer";

// Debounce to avoid marking stale nodes during rapid output updates
let markTimer = null;
addListener(EVENTTYPE_OUTPUT.OUTPUT_UPDATED, () => {
  clearTimeout(markTimer);
  markTimer = setTimeout(() => markDraggableNodes(), 150);
});
```

**Why debounce:** A single `customize()` call may fire multiple `OUTPUT_UPDATED` events
(one per output). Without debouncing, `markDraggableNodes()` runs against intermediate
states where some output nodes are already replaced but others are stale.

## Accumulating Drag Transforms

Each `DRAG_END` event provides a single transformation. When the user drags multiple
objects before confirming, **accumulate** the transforms:

```ts
let accumulatedDraggedObjects = [];

addListener(EVENTTYPE_INTERACTION.DRAG_END, async (e) => {
  if (e.manager.id !== componentId) return;
  e.manager.removeRestrictions();

  // Apply the drag matrix to the node's local transforms
  e.node.transformations.push({
    id: "SD_drag_matrix",
    matrix: e.matrix,
  });
  e.node.updateVersion();

  // Accumulate for later commit
  const existing = accumulatedDraggedObjects.find(
    (o) => o.name === e.node.name,
  );
  if (existing) {
    existing.transformation = Array.from(e.matrix);
    existing.restrictionId = e.restriction?.id;
    existing.dragAnchorId = e.dragAnchor?.id;
  } else {
    accumulatedDraggedObjects.push({
      name: e.node.name,
      transformation: Array.from(e.matrix),
      restrictionId: e.restriction?.id,
      dragAnchorId: e.dragAnchor?.id,
    });
  }

  // Send accumulated state to the backend
  await commitDragToBackend();
});
```

### Accept / Reject Pattern

When using accept/reject mode, send accumulated objects on "Accept" and clear local
transforms on "Reject":

```ts
function clearDragState() {
  // Remove local transform overrides from all nodes
  for (const out of Object.values(session.outputs)) {
    if (!out.node) continue;
    out.node.traverse((n) => {
      n.transformations = n.transformations.filter(
        (t) => t.id !== "SD_drag_matrix",
      );
      n.updateVersion();
    });
  }
  accumulatedDraggedObjects = [];
}
```

## Dragging from Dynamic Parameters

Dragging settings often come from **dynamic parameters** defined in the AppBuilder
output JSON rather than from real Grasshopper parameters. See
[dynamic-parameters.md](dynamic-parameters.md) for how dynamic parameters work.

When implementing dragging with the Viewer API (not App Builder), you can read
the drag settings directly from the AppBuilder output:

```ts
function getDragSettings() {
  const abOutput = session.getOutputByName("AppBuilder")[0];
  const raw = abOutput?.content?.[0]?.data;
  if (!raw) return null;
  const json = typeof raw === "string" ? JSON.parse(raw) : raw;
  const dragParam = json.parameters?.find(
    (p) => p.settings?.type === "dragging",
  );
  if (!dragParam) return null;
  return dragParam.settings?.props ?? dragParam.settings;
}
```

The returned `settings` object has the same structure as documented in the
`param.settings` reference above (`objects`, `restrictions`, `hover`, etc.).

## Gotchas

- Always use `isDraggingParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`. This causes the fallback to mark the entire model,
  making it turn grey on hover.
- **Always pass `componentId`** to both `new DragManager(componentId, effect)` and
  `addInteractionData(node, settings, componentId)`. Without matching values,
  dragging will not work.
- **Restrictions** — see [restrictions.md](restrictions.md) for restriction types,
  dynamic DRAG_START application, and default fallback behavior.
- `dragOrigin` and `dragAnchors` are per-object properties passed to `addInteractionData`
  — they control where the drag starts and provide snap points during dragging.
- When the extracted `settings.objects` is defined, iterate over it to set up per-object name
  filters, restrictions, drag origins, and drag anchors.
- When the extracted `settings.restrictions` is defined, see [restrictions.md](restrictions.md)
  for how to build the lookup map and resolve restriction IDs on DRAG_START events.
- **Always add a HoverManager** alongside DragManager unless `settings.hover` is explicitly
  `false`. Without hover feedback, users have no indication that geometry is draggable.
- When the extracted `settings.nameFilter` or per-object `nameFilter` is defined, use the library's
  name filter utilities to target specific nodes — see [name-filters.md](name-filters.md).
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.
- **`addInteractionData` marks nodes at depth, not the output root.** The function traverses
  the output node's children using `gatherNodesForPattern` and adds `InteractionData` to the
  deepest matching nodes. The `IntersectionManager` singleton uses these leaf-level nodes
  (which have `GeometryData` + `convertedObject` for Three.js raycasting) to perform hit
  tests. It rebuilds its node catalog on `VIEWPORT_UPDATED` events.
- **Debounce `markDraggableNodes()` after output updates.** A single `customize()` call
  fires multiple `OUTPUT_UPDATED` events. Running the marking function on each event
  creates a race condition where you mark nodes from a stale output that's immediately
  replaced. Debounce with ~150ms.
- **Sending drag values for dynamic parameters:** When dragging is defined as a dynamic
  parameter in the AppBuilder output, send the accumulated drag value via the `AppBuilder`
  STRING input parameter, not via the dynamic parameter ID directly. See
  [dynamic-parameters.md](dynamic-parameters.md).

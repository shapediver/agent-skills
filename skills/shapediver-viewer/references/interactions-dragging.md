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

### Restriction Types

Restrictions are defined in `settings.restrictions` as an array. Each restriction has
an `id`, a `type`, and type-specific properties:

| Type            | Properties                                                  | Description                                                      |
| :-------------- | :---------------------------------------------------------- | :--------------------------------------------------------------- |
| `"plane"`       | `origin: [x,y,z]`, `vector_u: [x,y,z]`, `vector_v: [x,y,z]` | Constrain to a plane defined by origin and two direction vectors |
| `"cameraPlane"` | (none required)                                             | Constrain to the plane facing the camera                         |
| `"line"`        | `origin: [x,y,z]`, `direction: [x,y,z]`                     | Constrain to a line                                              |
| `"point"`       | `position: [x,y,z]`                                         | Constrain to a fixed point                                       |
| `"geometry"`    | `nameFilter: string[]`                                      | Constrain to geometry surfaces matched by name filter            |

### How the App Builder Applies Restrictions

Restrictions are applied **dynamically on DRAG_START**, not at setup time. The App Builder:

1. On `DRAG_START` event: identifies which object the dragged node belongs to (by matching
   against each object's nameFilter patterns)
2. Looks up the matching object's `restrictions` array (IDs, e.g., `["plane-1"]`)
3. Resolves each ID to the restriction definition from `settings.restrictions`
4. Calls `dragManager.addRestriction(restriction)` for each resolved restriction
5. If NO restrictions match any object, adds a **default plane restriction**:
   `{ type: "plane", id: "default", origin: [0,0,0], vector_u: [1,0,0], vector_v: [0,1,0] }`
6. On `DRAG_END` event: calls `dragManager.removeRestrictions()` to clear all

```ts
import {
  addListener,
  removeListener,
  EVENTTYPE_INTERACTION,
} from "@shapediver/viewer";
import {
  matchNodesWithPatterns,
  convertUserDefinedNameFilters,
  RESTRICTION_TYPE,
} from "@shapediver/viewer.features.interaction";

// Pre-convert per-object patterns for matching
const convertedObjects = settings.objects.map((obj) => {
  const patterns = convertUserDefinedNameFilters(
    [obj.nameFilter],
    outputIdsToNames,
  );
  return {
    patterns,
    restrictions: obj.restrictions ?? [],
  };
});

// Convert settings.restrictions array to a lookup map by ID
const restrictionMap = {};
for (const r of settings.restrictions ?? []) {
  restrictionMap[r.id] = r;
}

const tokenDragStart = addListener(EVENTTYPE_INTERACTION.DRAG_START, (e) => {
  // Only handle events from our DragManager
  if (e.manager.id !== componentId) return;
  const dragged = [e.node];

  let addedRestrictions = false;
  for (const obj of convertedObjects) {
    for (const [outputId, patterns] of Object.entries(obj.patterns)) {
      const matched = matchNodesWithPatterns(patterns, dragged);
      if (matched.length > 0 && obj.restrictions.length > 0) {
        obj.restrictions.forEach((restrictionId) => {
          const restriction = restrictionMap[restrictionId];
          if (restriction) {
            e.manager.addRestriction(restriction);
            addedRestrictions = true;
          }
        });
      }
    }
  }

  // Fallback: default XY plane if no object-specific restrictions matched
  if (!addedRestrictions) {
    e.manager.addRestriction({
      type: RESTRICTION_TYPE.PLANE,
      id: "default",
      origin: [0, 0, 0],
      vector_u: [1, 0, 0],
      vector_v: [0, 1, 0],
    });
  }

  // Trigger initial move so restrictions take effect
  e.manager.onMove(e.event, e.ray, []);
});

const tokenDragEnd = addListener(EVENTTYPE_INTERACTION.DRAG_END, (e) => {
  if (e.manager.id !== componentId) return;
  // Clear all restrictions after drag ends
  e.manager.removeRestrictions();
});

// Cleanup: removeListener(tokenDragStart); removeListener(tokenDragEnd);
```

CDN: `SDVInteractions.matchNodesWithPatterns(...)`, `SDVInteractions.RESTRICTION_TYPE`.

### Simple Case (No `settings.objects`)

When no per-object restrictions are defined, add a fallback constraint at setup time:

```ts
// Camera-plane constraint (object follows mouse on screen plane)
dragManager.addDragConstraint(new CameraPlaneConstraint());

// OR fixed plane constraint (e.g., XY plane at origin)
// dragManager.addDragConstraint(new PlaneConstraint([0, 0, 1], [0, 0, 0]));
```

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

## Gotchas

- Always use `isDraggingParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`. This causes the fallback to mark the entire model,
  making it turn grey on hover.
- **Always pass `componentId`** to both `new DragManager(componentId, effect)` and
  `addInteractionData(node, settings, componentId)`. Without matching values,
  dragging will not work.
- **Restrictions are applied dynamically on DRAG_START**, not at setup time. The App Builder
  adds them on `DRAG_START` by matching the dragged node against object patterns, and
  removes them on `DRAG_END` with `dragManager.removeRestrictions()`.
- If no restrictions are defined and no objects match, the App Builder falls back to a
  default XY plane restriction: `{ type: "plane", origin: [0,0,0], vector_u: [1,0,0], vector_v: [0,1,0] }`.
- `dragOrigin` and `dragAnchors` are per-object properties passed to `addInteractionData`
  — they control where the drag starts and provide snap points during dragging.
- When the extracted `settings.objects` is defined, iterate over it to set up per-object name
  filters, restrictions, drag origins, and drag anchors.
- When the extracted `settings.restrictions` is defined, build a lookup map by ID and
  resolve restriction IDs from each object on DRAG_START events.
- **Always add a HoverManager** alongside DragManager unless `settings.hover` is explicitly
  `false`. Without hover feedback, users have no indication that geometry is draggable.
- When the extracted `settings.nameFilter` or per-object `nameFilter` is defined, use the library's
  name filter utilities to target specific nodes — see [name-filters.md](name-filters.md).
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.

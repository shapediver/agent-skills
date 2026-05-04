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

| Property                        | Type                          | Default      | Description                                              |
| :------------------------------ | :---------------------------- | :----------- | :------------------------------------------------------- |
| `draggingColor`                 | `string` or effect definition | `"#00ff00"`  | Color/effect of objects while being dragged              |
| `availableColor`                | `string` or effect definition | —            | Color/effect highlighting draggable objects before interaction |
| `hoverColor`                    | `string` or effect definition | —            | Color/effect on hover                                    |
| `hover`                         | `boolean`      | `true`       | Enable/disable hover effect                              |
| `objects`                       | `array`        | —            | Array of draggable object definitions (see below)        |
| `objects[].nameFilter`          | `string`       | —            | Name filter targeting specific scene nodes               |
| `objects[].restrictions`        | `string[]`     | —            | IDs of restrictions to apply to this object              |
| `objects[].dragOrigin`          | `[x, y, z]`    | —            | Origin point for dragging                                |
| `objects[].dragAnchors`         | `array`        | —            | `{ id, position: [x,y,z], rotation?: { angle, axis } }` |
| `restrictions`                  | `array`        | —            | Restriction definitions (plane, geometry, etc.)          |
| `activeMode`                    | `string`       | —            | `"activeOnStart"` to auto-activate on load               |
| `prompt`                        | `object`       | —            | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

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
    blendFunction: 27, // BlendFunction.ALPHA
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#9e27d8",
    kernelSize: 2, // KernelSize.LARGE
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
      blendFunction: 27,
      blur: true,
      edgeStrength: 10,
      hiddenEdgeColor: "#ffffff",
      kernelSize: 2,
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

When `settings.objects` is defined, iterate over each object to set up per-object
name filters, drag origins, and drag anchors. Each object defines a `nameFilter`
(a single string per object, not an array), optional `restrictions` (IDs referencing
entries in `settings.restrictions`), and optional `dragOrigin` and `dragAnchors`.
See [name-filters.md](name-filters.md) for the full workflow.

```ts
if (settings?.objects && settings.objects.length > 0) {
  for (const obj of settings.objects) {
    // Use nameFilter to find matching nodes
    const patterns = convertUserDefinedNameFilters(
      [obj.nameFilter],
      outputIdsToNamesMapping,
    );
    for (const [outputId, pattern] of Object.entries(patterns)) {
      const nodes = gatherNodesForPattern(session, outputId, pattern);
      for (const node of nodes) {
        addInteractionData(
          node,
          {
            drag: true,
            hover: settings.hover !== false,
            dragOrigin: obj.dragOrigin,
            dragAnchors: obj.dragAnchors,
          },
          componentId,
        );
      }
    }
  }
}
```

When `settings.objects` is **not defined** (or empty), make all geometry draggable:

```ts
addInteractionData(
  session.node,
  { drag: true, hover: settings?.hover !== false },
  componentId,
);
```

## Add Drag Constraints

**At least one constraint is required** — without a constraint, dragging does nothing.

When the extracted `settings.restrictions` is defined, use it to configure constraints. Each
restriction has a `type` (e.g., `"plane"`, `"geometry"`, `"cameraPlane"`, `"line"`,
`"point"`) and type-specific properties. When the extracted `settings.objects` is defined, each
object can reference restriction IDs via `objects[].restrictions`.

```ts
// If settings define restrictions, use them:
if (settings?.restrictions) {
  for (const r of settings.restrictions) {
    if (r.type === "plane") {
      dragManager.addDragConstraint(
        new PlaneConstraint(r.normal ?? [0, 0, 1], r.origin ?? [0, 0, 0]),
      );
    }
    // Handle other restriction types as needed
  }
} else {
  // Fallback: Camera-plane constraint (object follows mouse on screen plane)
  dragManager.addDragConstraint(new CameraPlaneConstraint());
}

// Option B: Fixed plane constraint (e.g., XY plane at origin)
// dragManager.addDragConstraint(new PlaneConstraint([0, 0, 1], [0, 0, 0]));
```

## Combining with Other Managers

Multiple interaction types can be active simultaneously on the same nodes:

```ts
addInteractionData(
  session.node,
  { select: true, hover: true, drag: true },
  componentId,
);
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
- Forgetting to add a constraint is the most common mistake — dragging will silently fail.
- `CameraPlaneConstraint` is the easiest to set up. Use `PlaneConstraint` when dragging should be restricted to a specific surface.
- When the extracted `settings.objects` is defined, iterate over it to set up per-object name
  filters, restrictions, drag origins, and drag anchors.
- When the extracted `settings.restrictions` is defined, use it to configure drag constraints
  instead of hardcoding fallback constraints.
- **Always add a HoverManager** alongside DragManager unless `settings.hover` is explicitly
  `false`. Without hover feedback, users have no indication that geometry is draggable.
- When the extracted `settings.nameFilter` or per-object `nameFilter` is defined, use the library's
  name filter utilities to target specific nodes — see [name-filters.md](name-filters.md).
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.

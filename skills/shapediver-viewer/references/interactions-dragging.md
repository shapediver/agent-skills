# DragManager — Drag Objects in 3D

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

## `param.settings` Reference

When `isDraggingParameterApi(param)` is `true`, `param.settings` may contain:

| Property                        | Type           | Default      | Description                                              |
| :------------------------------ | :------------- | :----------- | :------------------------------------------------------- |
| `draggingColor`                 | `string` (hex) | `"#00ff00"`  | Color of objects while being dragged                     |
| `availableColor`                | `string` (hex) | —            | Color highlighting draggable objects before interaction   |
| `hoverColor`                    | `string` (hex) | —            | Color on hover                                           |
| `hover`                         | `boolean`      | `true`       | Enable/disable hover effect                              |
| `objects`                       | `array`        | —            | Array of draggable object definitions (see below)        |
| `objects[].nameFilter`          | `string`       | —            | Name filter targeting specific scene nodes               |
| `objects[].restrictions`        | `string[]`     | —            | IDs of restrictions to apply to this object              |
| `objects[].dragOrigin`          | `[x, y, z]`    | —            | Origin point for dragging                                |
| `objects[].dragAnchors`         | `array`        | —            | `{ id, position: [x,y,z], rotation?: { angle, axis } }` |
| `restrictions`                  | `array`        | —            | Restriction definitions (plane, geometry, etc.)          |
| `activeMode`                    | `string`       | —            | `"activeOnStart"` to auto-activate on load               |
| `prompt`                        | `object`       | —            | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

**Use ALL defined settings.** If a setting is present in `param.settings`, apply it.

## Create DragManager

```ts
import {
  InteractionData,
  DragManager,
  HoverManager,
  CameraPlaneConstraint,
  PlaneConstraint,
} from "@shapediver/viewer.features.interaction";
import {
  isDraggingParameterApi,
  MaterialStandardData,
} from "@shapediver/viewer";

const dragParam = Object.values(session.parameters).find(
  isDraggingParameterApi,
);
const settings = dragParam?.settings;

const dragManager = new DragManager();
dragManager.effectMaterial = new MaterialStandardData({
  color: settings?.draggingColor ?? "#00ff00",
});
interactionEngine.addInteractionManager(dragManager);

// Add hover feedback — only skip if settings.hover is explicitly false
if (settings?.hover !== false) {
  const hoverManager = new HoverManager();
  hoverManager.effectMaterial = new MaterialStandardData({
    color: settings?.hoverColor ?? "#0000ff",
  });
  interactionEngine.addInteractionManager(hoverManager);
}
```

CDN: `new SDVInteractions.DragManager()`, `new SDVInteractions.HoverManager()`.

## Mark Nodes as Draggable

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
        node.data.push(
          new InteractionData({
            drag: true,
            hover: settings.hover !== false,
            dragOrigin: obj.dragOrigin,
            dragAnchors: obj.dragAnchors,
          }),
        );
        node.updateVersion();
      }
    }
  }
}
```

When `settings.objects` is **not defined** (or empty), make all geometry draggable:

```ts
session.node.data.push(
  new InteractionData({ drag: true, hover: settings?.hover !== false }),
);
session.node.updateVersion();
```

## Add Drag Constraints

**At least one constraint is required** — without a constraint, dragging does nothing.

When `param.settings.restrictions` is defined, use it to configure constraints. Each
restriction has a `type` (e.g., `"plane"`, `"geometry"`, `"cameraPlane"`, `"line"`,
`"point"`) and type-specific properties. When `param.settings.objects` is defined, each
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

Multiple managers can be active simultaneously on the same nodes:

```ts
for (const o in session.outputs) {
  session.outputs[o].node!.data.push(
    new InteractionData({ select: true, hover: true, drag: true }),
  );
  session.outputs[o].node!.updateVersion();
}
```

## Gotchas

- Always use `isDraggingParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
- Forgetting to add a constraint is the most common mistake — dragging will silently fail.
- `CameraPlaneConstraint` is the easiest to set up. Use `PlaneConstraint` when dragging should be restricted to a specific surface.
- When `param.settings.objects` is defined, iterate over it to set up per-object name
  filters, restrictions, drag origins, and drag anchors.
- When `param.settings.restrictions` is defined, use it to configure drag constraints
  instead of hardcoding fallback constraints.
- **Always add a HoverManager** alongside DragManager unless `settings.hover` is explicitly
  `false`. Without hover feedback, users have no indication that geometry is draggable.
- When `param.settings.nameFilter` or per-object `nameFilter` is defined, use the library's
  name filter utilities to target specific nodes — see [name-filters.md](name-filters.md).

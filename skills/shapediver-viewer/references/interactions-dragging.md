# DragManager — Drag Objects in 3D

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

## Create DragManager

````ts
import {
  InteractionData,
  DragManager,
  CameraPlaneConstraint,
  PlaneConstraint,
} from "@shapediver/viewer.features.interaction";
import {
  isDraggingParameterApi,
  MaterialStandardData,
} from "@shapediver/viewer";

```ts
const dragParam = Object.values(session.parameters).find(
  isDraggingParameterApi,
);
const dragManager = new DragManager();
dragManager.effectMaterial = new MaterialStandardData({
  color: dragParam?.settings?.draggingColor ?? "#00ff00",
});
interactionEngine.addInteractionManager(dragManager);
````

CDN: `new SDVInteractions.DragManager()`.

## Mark Nodes as Draggable

When `nameFilter` is defined in `param.settings`, use it to target specific nodes.
See [name-filters.md](name-filters.md) for the full workflow. For dragging,
each object in `param.settings.objects` has its own `nameFilter` (a single string per
object, not an array).

When `nameFilter` is **not defined** (or empty), make all geometry draggable:

```ts
session.node.data.push(new InteractionData({ drag: true }));
session.node.updateVersion();
```

## Add Drag Constraints

**At least one constraint is required** — without a constraint, dragging does nothing.

```ts
// Option A: Camera-plane constraint (object follows mouse on screen plane)
dragManager.addDragConstraint(new CameraPlaneConstraint());

// Option B: Fixed plane constraint (e.g., XY plane at origin)
dragManager.addDragConstraint(new PlaneConstraint([0, 0, 1], [0, 0, 0]));
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
- When `param.settings.nameFilter` or per-object `nameFilter` is defined, use the library's
  name filter utilities to target specific nodes — see [name-filters.md](name-filters.md).

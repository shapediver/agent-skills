# RectangleTransform — 2D Planar Gizmo

A 2D gizmo for planar manipulation of objects (translate and scale on a defined plane).

**Does NOT require InteractionEngine.** Uses `@shapediver/viewer.features.transformation-tools`.

## Setup

```ts
import { RectangleTransform } from "@shapediver/viewer.features.transformation-tools";
```

CDN: `SDVTransformationTools.RectangleTransform`.

## Create RectangleTransform

```ts
const rectangleTransform = new RectangleTransform(viewport, nodes, {
  plane: { origin: [0, 0, 0], vector_u: [1, 0, 0], vector_v: [0, 1, 0] },
});
```

CDN: `new SDVTransformationTools.RectangleTransform(viewport, nodes, opts)`.

## Parameters

| Property         | Type       | Description                           |
| :--------------- | :--------- | :------------------------------------ |
| `plane.origin`   | `number[]` | Center point of the constraint plane. |
| `plane.vector_u` | `number[]` | First direction vector of the plane.  |
| `plane.vector_v` | `number[]` | Second direction vector of the plane. |

## Gotchas

- The `plane` option is required — it defines the 2D surface on which the transform operates.
- `nodes` = array of scene tree nodes to attach the gizmo to, typically from `session.outputs[id].node`.
- Use `GumballTransform` instead when the user needs full 3D translate/rotate/scale.

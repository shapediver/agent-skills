# GumballTransform — 3D Translate/Rotate/Scale Gizmo

A 3D gizmo that lets users translate, rotate, and scale objects interactively.

**Does NOT require InteractionEngine.** Uses `@shapediver/viewer.features.transformation-tools`.

## Setup

```ts
import { GumballTransform } from "@shapediver/viewer.features.transformation-tools";
import {
  addListener,
  EVENTTYPE_TRANSFORMATION_TOOLS,
  isGumballTransformParameterApi,
} from "@shapediver/viewer";
```

CDN: `SDVTransformationTools.GumballTransform`.

## Create GumballTransform

```ts
const gumballParam = Object.values(session.parameters).find(
  isGumballTransformParameterApi,
);

// `nodes` = array of scene tree nodes to attach the gizmo to
const gumball = new GumballTransform(viewport, nodes);
```

CDN: `new SDVTransformationTools.GumballTransform(viewport, nodes)`.

## Listen for Transform Changes

```ts
addListener(EVENTTYPE_TRANSFORMATION_TOOLS.MATRIX_CHANGED, async (e) => {
  if (gumballParam) {
    gumballParam.value = JSON.stringify({
      names: e.nodes.map((n) => n.name),
      transformations: e.transformations,
    });
    await session.customize();
  }
});
```

## Gotchas

- Always use `isGumballTransformParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
- The `nodes` array determines which objects get the gizmo. Typically sourced from `session.outputs[id].node`.
- The `MATRIX_CHANGED` event fires on every gizmo interaction — call `session.customize()` to send the transformation to the backend.

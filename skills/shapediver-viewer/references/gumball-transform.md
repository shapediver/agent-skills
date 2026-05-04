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

// `nodes` = array of scene tree nodes to attach the gizmo to.
// Use `getNodesByName` to find nodes matching `nameFilter` patterns:
import { getNodesByName } from "@shapediver/viewer.features.interaction";
const nodesAndNames = getNodesByName([session], selectedNodeNames);
const nodes = nodesAndNames.map((n) => n.node);

const gumball = new GumballTransform(viewport, nodes);
```

CDN: `SDVInteractions.getNodesByName(...)`, `new SDVTransformationTools.GumballTransform(viewport, nodes)`.

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
- The `nodes` array determines which objects get the gizmo. Use `getNodesByName` from
  `@shapediver/viewer.features.interaction` to find nodes matching the `nameFilter`
  patterns — see [name-filters.md](name-filters.md).
- The gumball typically works with selection: the user selects a node first, then
  the gumball gizmo is attached to the selected node(s).
- Each object in `param.settings.objects` has its own `nameFilter` (a single string per
  object) and optional `restrictions`.
- The `MATRIX_CHANGED` event fires on every gizmo interaction — call `session.customize()` to send the transformation to the backend.

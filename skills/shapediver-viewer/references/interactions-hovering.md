# HoverManager — Visual Feedback on Mouse Hover

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

**When used with selection, do NOT set up HoverManager separately.** The selection
reference already includes HoverManager setup. This file is for hover-only use cases
(rare). For selection + hover, follow [interactions-selection.md](interactions-selection.md).

## Create HoverManager

The `HoverManager` constructor takes a `componentId` string (for scoping — see
[interactions-selection.md](interactions-selection.md) § Component ID) and an optional
interaction effect as the second argument. Use the parameter ID as the `componentId`.

```ts
import {
  InteractionData,
  HoverManager,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";
import {
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
} from "@shapediver/viewer";

const componentId = hoverParam.id; // or any unique identifier

// App Builder default: white outline effect
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
```

For simple use cases, a `MaterialStandardData` color also works:

```ts
import { MaterialStandardData } from "@shapediver/viewer";

const hoverEffect = new MaterialStandardData({ color: "#0000ff" });
const hoverManager = new HoverManager(componentId, hoverEffect);
interactionEngine.addInteractionManager(hoverManager);
```

CDN: `new SDVInteractions.HoverManager(componentId, effect)`.

## Mark Nodes as Hoverable

Use `addInteractionData` with the same `componentId` to mark nodes:

```ts
addInteractionData(session.node, { hover: true }, componentId);
```

Or for per-output marking:

```ts
for (const o in session.outputs) {
  const node = session.outputs[o].node;
  if (node) addInteractionData(node, { hover: true }, componentId);
}
```

## Gotchas

- Hover events fire on **every mouse move** over a hoverable node. Avoid expensive operations (API calls, heavy DOM updates) in hover handlers.
- **Always pass `componentId`** to both `new HoverManager(componentId, effect)` and
  `addInteractionData(node, settings, componentId)`. Without matching values, hover
  will not work.
- Combine with SelectManager/DragManager by passing multiple flags:
  `addInteractionData(node, { hover: true, select: true }, componentId)`.
- Hovering respects the same `nameFilter` as the interaction it is combined with —
  see [name-filters.md](name-filters.md).
- **Per-output nodes are replaced on every `customize()` call.** If using per-output
  InteractionData, re-apply via `output.updateCallback`. See
  [interactions-selection.md](interactions-selection.md) § Mark Nodes.

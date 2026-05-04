# HoverManager — Visual Feedback on Mouse Hover

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

**When used with selection, do NOT set up HoverManager separately.** The selection
reference already includes HoverManager setup. This file is for hover-only use cases
(rare). For selection + hover, follow [interactions-selection.md](interactions-selection.md).

## Create HoverManager

```ts
import {
  InteractionData,
  HoverManager,
} from "@shapediver/viewer.features.interaction";
import { MaterialStandardData } from "@shapediver/viewer";

const hoverManager = new HoverManager();
hoverManager.effectMaterial = new MaterialStandardData({ color: "#0000ff" });
interactionEngine.addInteractionManager(hoverManager);
```

CDN: `new SDVInteractions.HoverManager()`.

## Mark Nodes as Hoverable

```ts
for (const o in session.outputs) {
  session.outputs[o].node!.data.push(new InteractionData({ hover: true }));
  session.outputs[o].node!.updateVersion();
}
```

## Gotchas

- Hover events fire on **every mouse move** over a hoverable node. Avoid expensive operations (API calls, heavy DOM updates) in hover handlers.
- `effectMaterial` is optional — if omitted, hover has no visual highlight.
- Combine with SelectManager/DragManager by passing multiple flags: `new InteractionData({ hover: true, select: true })`.
- Hovering respects the same `nameFilter` as the interaction it is combined with —
  see [name-filters.md](name-filters.md).
- **Per-output nodes are replaced on every `customize()` call.** If using per-output
  InteractionData, re-apply via `output.updateCallback`. See
  [interactions-selection.md](interactions-selection.md) § Mark Nodes.

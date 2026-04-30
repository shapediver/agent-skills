# HoverManager — Visual Feedback on Mouse Hover

Requires an `InteractionEngine` instance (one per viewport). See
[interactions-selection.md](interactions-selection.md) § Setup for `InteractionEngine` creation.

## Create HoverManager

````ts
import { InteractionData, HoverManager } from "@shapediver/viewer.features.interaction";
import { MaterialStandardData } from "@shapediver/viewer";

```ts
const hoverManager = new HoverManager();
hoverManager.effectMaterial = new MaterialStandardData({ color: "#0000ff" });
interactionEngine.addInteractionManager(hoverManager);
````

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

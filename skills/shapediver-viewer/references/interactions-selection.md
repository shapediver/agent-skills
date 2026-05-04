# SelectManager — Click-to-Select Interaction

Requires an `InteractionEngine` instance (one per viewport).

## Setup

```ts
import {
  InteractionEngine,
  InteractionData,
  SelectManager,
} from "@shapediver/viewer.features.interaction";
import {
  addListener,
  EVENTTYPE,
  MaterialStandardData,
  isSelectionParameterApi,
} from "@shapediver/viewer";

// Create engine once per viewport
const interactionEngine = new InteractionEngine(viewport);
```

CDN: `new SDVInteractions.InteractionEngine(viewport)`.

## Create SelectManager

```ts
const selectionParam = Object.values(session.parameters).find(
  isSelectionParameterApi,
);
const selectManager = new SelectManager();
selectManager.effectMaterial = new MaterialStandardData({
  color: selectionParam?.settings?.selectionColor ?? "#ffff00",
});
interactionEngine.addInteractionManager(selectManager);
```

CDN: `new SDVInteractions.SelectManager()`.

## Mark Nodes as Selectable

When `nameFilter` is defined in `param.settings`, use it to target specific nodes.
See [name-filters.md](name-filters.md) for the full workflow using `convertUserDefinedNameFilters`,
`gatherNodesForPattern`, and `addInteractionData`.

When `nameFilter` is **not defined** (or empty), make all geometry interactive:

```ts
// All outputs at once
session.node.data.push(new InteractionData({ select: true }));
session.node.updateVersion();

// Or per-output
for (const o in session.outputs) {
  session.outputs[o].node!.data.push(new InteractionData({ select: true }));
  session.outputs[o].node!.updateVersion();
}
```

## Listen for Selection Events

```ts
addListener(EVENTTYPE.INTERACTION.SELECT_ON, async (e) => {
  if (selectionParam) {
    selectionParam.value = JSON.stringify({ names: [e.node.name] });
    await session.customize();
  }
});

addListener(EVENTTYPE.INTERACTION.SELECT_OFF, (e) => {
  console.log("Deselected:", e.node.name);
});
```

## Gotchas

- Always use `isSelectionParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
- `effectMaterial` is optional — if omitted, selection has no visual highlight.
- Selection works on scene tree nodes, not mesh faces. Granularity depends on how the Grasshopper model outputs geometry.
- When `param.settings.nameFilter` is defined, use the library's name filter utilities
  to target specific nodes — see [name-filters.md](name-filters.md).

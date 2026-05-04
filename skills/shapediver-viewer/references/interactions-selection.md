# SelectManager — Click-to-Select Interaction

Requires an `InteractionEngine` instance (one per viewport).

## Setup

```ts
import {
  InteractionEngine,
  InteractionData,
  SelectManager,
  HoverManager,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";
import {
  addListener,
  removeListener,
  EVENTTYPE,
  MaterialStandardData,
  isSelectionParameterApi,
} from "@shapediver/viewer";

// Create engine once per viewport
const interactionEngine = new InteractionEngine(viewport);
```

CDN: `new SDVInteractions.InteractionEngine(viewport)`.

## Create SelectManager and HoverManager

**Always create a HoverManager alongside SelectManager.** Users expect visual feedback
when hovering over selectable geometry. Without it, the UI feels broken because there
is no indication that elements are interactive. This is how the ShapeDiver App Builder
implements selection — hover is always enabled.

```ts
const selectionParam = Object.values(session.parameters).find(
  isSelectionParameterApi,
);

// Selection highlight (on click)
const selectManager = new SelectManager();
selectManager.effectMaterial = new MaterialStandardData({
  color: selectionParam?.settings?.selectionColor ?? "#ffff00",
});
interactionEngine.addInteractionManager(selectManager);

// Hover highlight (on mouse move) — ALWAYS add this with selection
const hoverManager = new HoverManager();
hoverManager.effectMaterial = new MaterialStandardData({
  color: selectionParam?.settings?.hoverColor ?? "#0000ff",
});
interactionEngine.addInteractionManager(hoverManager);
```

CDN: `new SDVInteractions.SelectManager()`, `new SDVInteractions.HoverManager()`.

## Mark Nodes as Selectable and Hoverable

When `nameFilter` is defined in `param.settings`, use it to target specific nodes.
See [name-filters.md](name-filters.md) for the full workflow using `convertUserDefinedNameFilters`,
`gatherNodesForPattern`, and `addInteractionData`.

When `nameFilter` is **not defined** (or empty), make all geometry interactive using
**one** of the approaches below.

### Recommended: Mark the session root node

Pushing `InteractionData` to `session.node` makes **all** output geometry selectable
and hoverable. This is the preferred approach because **`session.node` persists across
`customize()` calls** — you set it once and it survives all parameter updates.

```ts
session.node.data.push(new InteractionData({ select: true, hover: true }));
session.node.updateVersion();
```

### Alternative: Mark individual output nodes

Use this only when you need **selective interactivity** (e.g., only some outputs should
be selectable). **⚠️ Output nodes are replaced on every `customize()` call.** Any
`InteractionData` pushed onto output nodes is **destroyed** when the scene updates.
You **must** re-apply after each customization using `output.updateCallback`:

```ts
function markOutputsInteractive() {
  for (const o in session.outputs) {
    const output = session.outputs[o];
    if (!output.node) continue;
    output.node.data.push(new InteractionData({ select: true, hover: true }));
    output.node.updateVersion();

    // Re-apply when node is replaced by customize()
    output.updateCallback = (newNode) => {
      if (!newNode) return;
      newNode.data.push(new InteractionData({ select: true, hover: true }));
      newNode.updateVersion();
    };
  }
}

markOutputsInteractive();
```

**Why this matters:** The SELECT_ON handler calls `session.customize()`, which replaces
output nodes. Without re-applying `InteractionData` via `updateCallback`, **selection
stops working after the first click**.

## Listen for Selection Events

Store the tokens returned by `addListener` — you need them for cleanup.

**Both `SELECT_ON` and `SELECT_OFF` must update the parameter value.** If you only handle
`SELECT_ON`, deselecting a node leaves stale data on the backend.

```ts
const selectToken = addListener(EVENTTYPE.INTERACTION.SELECT_ON, async (e) => {
  if (selectionParam) {
    selectionParam.value = JSON.stringify({ names: [e.node.name] });
    await session.customize();
  }
});

const deselectToken = addListener(
  EVENTTYPE.INTERACTION.SELECT_OFF,
  async (e) => {
    if (selectionParam) {
      selectionParam.value = JSON.stringify({ names: [] });
      await session.customize();
    }
  },
);
```

## Teardown / Cleanup

For multi-step UIs, dynamic configurators, or switching between different selection
parameters, you must fully tear down the previous selection state before setting up
a new one.

```ts
function teardownSelection(tokens, selectMgr, hoverMgr) {
  // 1. Remove event listeners
  for (const t of tokens) removeListener(t);

  // 2. Deselect all nodes before removing managers
  if (selectMgr) selectMgr.deselect();

  // 3. Remove interaction managers from engine
  if (selectMgr) interactionEngine.removeInteractionManager(selectMgr);
  if (hoverMgr) interactionEngine.removeInteractionManager(hoverMgr);

  // 4. Clear InteractionData from the session root node
  session.node.data = session.node.data.filter(
    (d) => !(d instanceof InteractionData),
  );
  session.node.updateVersion();

  // 5. If per-output was used, also clear output callbacks
  for (const o in session.outputs) {
    session.outputs[o].updateCallback = null;
  }
}
```

CDN: Use `SDVInteractions.InteractionData` for the `instanceof` check.

## Multiple Selection Parameters

When a model has multiple selection parameters (e.g., one per floor), activate only one
at a time. Tear down the previous one before setting up the next:

```ts
let activeTokens = [];
let activeSelectMgr = null;
let activeHoverMgr = null;

async function activateSelectionParam(selParamId) {
  // Tear down previous
  teardownSelection(activeTokens, activeSelectMgr, activeHoverMgr);

  const selParam = session.parameters[selParamId];
  if (!selParam || !isSelectionParameterApi(selParam)) return;

  // Set up new managers
  activeSelectMgr = new SelectManager();
  activeSelectMgr.effectMaterial = new MaterialStandardData({
    color: selParam.settings?.selectionColor ?? "#ffff00",
  });
  interactionEngine.addInteractionManager(activeSelectMgr);

  activeHoverMgr = new HoverManager();
  activeHoverMgr.effectMaterial = new MaterialStandardData({
    color: selParam.settings?.hoverColor ?? "#0000ff",
  });
  interactionEngine.addInteractionManager(activeHoverMgr);

  // Mark root selectable + hoverable (persists across customize)
  session.node.data.push(new InteractionData({ select: true, hover: true }));
  session.node.updateVersion();

  // Listen for events — store tokens for cleanup
  activeTokens = [
    addListener(EVENTTYPE.INTERACTION.SELECT_ON, async (e) => {
      selParam.value = JSON.stringify({ names: [e.node.name] });
      await session.customize();
    }),
    addListener(EVENTTYPE.INTERACTION.SELECT_OFF, async (e) => {
      selParam.value = JSON.stringify({ names: [] });
      await session.customize();
    }),
  ];
}
```

## Gotchas

- Always use `isSelectionParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
- `effectMaterial` is optional — if omitted, selection/hover has no visual highlight.
- Selection works on scene tree nodes, not mesh faces. Granularity depends on how the Grasshopper model outputs geometry.
- **Always add a HoverManager** alongside SelectManager. Without hover feedback, users
  have no indication that geometry is interactive.
- **Prefer `session.node`** over per-output for `InteractionData`. It persists across
  `customize()` calls. Per-output nodes are replaced on every customization —
  InteractionData is lost unless you use `output.updateCallback` to re-apply it.
- **Store `addListener` tokens** and call `removeListener(token)` during cleanup. Leaked
  listeners cause duplicate event handling and stale closures.
- **Handle `SELECT_OFF`** by clearing the parameter value and calling `customize()`.
  If you only handle `SELECT_ON`, deselecting a node doesn't update the model.
- When `param.settings.nameFilter` is defined, use the library's name filter utilities
  to target specific nodes — see [name-filters.md](name-filters.md).
- When using name filters with `addInteractionData`, pass a `componentId` string to
  scope the interaction data. This prevents interference when multiple selection
  parameters coexist on the same model.

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

## Component ID — Scoping Managers to InteractionData

Every `SelectManager` and `HoverManager` must be created with a **`componentId`**
string. The same `componentId` must be passed to `addInteractionData` when marking
nodes. This binds the managers to the interaction data:

- `addInteractionData(node, settings, componentId)` internally creates `InteractionData`
  with `restrictedManagers: [componentId]`.
- Managers created with `new SelectManager(componentId, ...)` only interact with nodes
  whose `InteractionData.restrictedManagers` includes that `componentId`.

**This is how the ShapeDiver App Builder prevents multiple interaction parameters from
interfering with each other.** Without matching `componentId` values, managers cannot
see the interaction data, and selection will not work.

Use the selection parameter's ID as the `componentId` — this naturally gives each
selection parameter its own scope.

## Create SelectManager and HoverManager

**Always create a HoverManager alongside SelectManager.** Users expect visual feedback
when hovering over selectable geometry. Without it, the UI feels broken because there
is no indication that elements are interactive. This is how the ShapeDiver App Builder
implements selection — hover is always enabled.

### Interaction Effects

The `SelectManager` and `HoverManager` constructors accept an optional **interaction
effect** as the second argument. Effects can be:

1. **A `MaterialStandardData` instance** — simple color override on the geometry.
2. **A post-processing outline effect definition** — an outline drawn around the
   geometry (this is what the App Builder uses by default).

The App Builder defaults (recommended):

```ts
import { POST_PROCESSING_EFFECT_TYPE } from "@shapediver/viewer";
// or: const POST_PROCESSING_EFFECT_TYPE = SDV.POST_PROCESSING_EFFECT_TYPE;

// Blue outline for selected objects
const selectionEffect = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: 27, // BlendFunction.ALPHA
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#0d44f0",
    kernelSize: 2, // KernelSize.LARGE
    visibleEdgeColor: "#0d44f0",
  },
};

// White outline for hovered objects
const hoverEffect = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: 27,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#ffffff",
    kernelSize: 2,
    visibleEdgeColor: "#ffffff",
  },
};

// White pulsing outline for available (selectable) objects
const availableEffect = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: 27,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#ffffff",
    kernelSize: 2,
    pulseSpeed: 0.5,
    visibleEdgeColor: "#ffffff",
  },
};
```

If `param.settings` provides `selectionColor` / `hoverColor` / `availableColor`, use
those values instead — they may be hex color strings (→ `MaterialStandardData`) or
full effect definitions.

For simple use cases, `MaterialStandardData` still works:

```ts
const selectionEffect = new MaterialStandardData({
  color: settings?.selectionColor ?? "#ffff00",
});
```

### Creating the Managers

```ts
const selectionParam = Object.values(session.parameters).find(
  isSelectionParameterApi,
);

// ⚠️ IMPORTANT: At runtime, param.settings has a nested structure:
//   { type: "selection", props: { nameFilter, maximumSelection, ... } }
// The actual properties are under settings.props, NOT directly on settings.
// Use this extraction pattern to handle both cases:
const settings = selectionParam?.settings?.props ?? selectionParam?.settings;

// Use the parameter ID as the componentId for scoping
const componentId = selectionParam.id;

// Selection highlight (on click)
const selectManager = new SelectManager(componentId, selectionEffect);
if (settings?.maximumSelection != null) {
  selectManager.maximumSelection = settings.maximumSelection;
}
if (settings?.minimumSelection != null) {
  selectManager.minimumSelection = settings.minimumSelection;
}
if (settings?.deselectOnEmpty != null) {
  selectManager.deselectOnEmpty = settings.deselectOnEmpty;
}
interactionEngine.addInteractionManager(selectManager);

// Hover highlight (on mouse move) — ALWAYS add this with selection
// Only skip if settings.hover is explicitly false
if (settings?.hover !== false) {
  const hoverManager = new HoverManager(componentId, hoverEffect);
  interactionEngine.addInteractionManager(hoverManager);
}
```

CDN: `new SDVInteractions.SelectManager(componentId, effect)`,
`new SDVInteractions.HoverManager(componentId, effect)`.

## `param.settings` Reference

When `isSelectionParameterApi(param)` is `true`, `param.settings` at runtime has the
structure `{ type: "selection", props: { ... } }`. The properties below are under
`settings.props`. Always extract them first:

```ts
const settings = param.settings?.props ?? param.settings;
```

The extracted `settings` object may contain:

| Property           | Type                          | Default     | Description                                                                       |
| :----------------- | :---------------------------- | :---------- | :-------------------------------------------------------------------------------- |
| `selectionColor`   | `string` or effect definition | `"#ffff00"` | Color/effect of selected objects                                                  |
| `availableColor`   | `string` or effect definition | —           | Color/effect highlighting selectable objects before interaction                   |
| `hoverColor`       | `string` or effect definition | `"#0000ff"` | Color/effect on hover                                                             |
| `nameFilter`       | `string[]`                    | —           | Filters which scene nodes are selectable (see [name-filters.md](name-filters.md)) |
| `minimumSelection` | `number`                      | `1`         | Minimum objects that must be selected                                             |
| `maximumSelection` | `number`                      | `1`         | Maximum objects that can be selected                                              |
| `hover`            | `boolean`                     | `true`      | Enable/disable hover effect                                                       |
| `deselectOnEmpty`  | `boolean`                     | `false`     | Deselect all when clicking empty space                                            |
| `activeMode`       | `string`                      | —           | `"activeOnStart"` to auto-activate on load                                        |
| `prompt`           | `object`                      | —           | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides                  |

**Use ALL defined settings.** If a setting is present in `param.settings`, apply it.
Fallback defaults are shown above for when a setting is not defined.

## Mark Nodes as Selectable and Hoverable

**Always use `addInteractionData(node, settings, componentId)` to mark nodes.**
This creates `InteractionData` with `restrictedManagers: [componentId]`, ensuring
only managers created with the same `componentId` can interact with those nodes.
Do NOT manually push `new InteractionData()` — it bypasses the scoping mechanism
and causes cross-contamination when multiple selection parameters coexist.

When `nameFilter` is defined in `param.settings`, use it to target specific nodes.
See [name-filters.md](name-filters.md) for the full workflow using `convertUserDefinedNameFilters`,
`gatherNodesForPattern`, and `addInteractionData`.

When `nameFilter` is **not defined** (or empty), make all geometry interactive using
**one** of the approaches below.

### Recommended: Mark the session root node

Using `addInteractionData` on `session.node` makes **all** output geometry selectable
and hoverable. This is the preferred approach because **`session.node` persists across
`customize()` calls** — you set it once and it survives all parameter updates.

```ts
addInteractionData(session.node, { select: true, hover: true }, componentId);
```

### Alternative: Mark individual output nodes

Use this only when you need **selective interactivity** (e.g., only some outputs should
be selectable). **⚠️ Output nodes are replaced on every `customize()` call.** Any
`InteractionData` on output nodes is **destroyed** when the scene updates.
You **must** re-apply after each customization using `output.updateCallback`:

```ts
function markOutputsInteractive() {
  for (const o in session.outputs) {
    const output = session.outputs[o];
    if (!output.node) continue;
    addInteractionData(output.node, { select: true, hover: true }, componentId);

    // Re-apply when node is replaced by customize()
    output.updateCallback = (newNode, oldNode) => {
      // Clean up old node's interaction data
      if (oldNode) {
        oldNode.traverse((n) => {
          for (const data of [...n.data]) {
            if (
              data instanceof InteractionData &&
              data.restrictedManagers.includes(componentId)
            ) {
              n.removeData(data);
              n.updateVersion();
            }
          }
        });
      }
      // Mark new node
      if (newNode) {
        addInteractionData(newNode, { select: true, hover: true }, componentId);
      }
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
function teardownSelection(tokens, selectMgr, hoverMgr, componentId) {
  // 1. Remove event listeners
  for (const t of tokens) removeListener(t);

  // 2. Deselect all nodes before removing managers
  if (selectMgr) selectMgr.deselect();

  // 3. Remove interaction managers from engine
  if (selectMgr) interactionEngine.removeInteractionManager(selectMgr);
  if (hoverMgr) interactionEngine.removeInteractionManager(hoverMgr);

  // 4. Remove InteractionData scoped to this componentId from the session root
  for (const data of [...session.node.data]) {
    if (
      data instanceof InteractionData &&
      data.restrictedManagers.includes(componentId)
    ) {
      session.node.removeData(data);
      session.node.updateVersion();
    }
  }

  // 5. If per-output was used, clear output callbacks and their InteractionData
  for (const o in session.outputs) {
    const output = session.outputs[o];
    output.updateCallback = null;
    if (output.node) {
      output.node.traverse((n) => {
        for (const d of [...n.data]) {
          if (
            d instanceof InteractionData &&
            d.restrictedManagers.includes(componentId)
          ) {
            n.removeData(d);
            n.updateVersion();
          }
        }
      });
    }
  }
}
```

**Use `node.removeData(data)` — not manual splice.** The `removeData` method is the
proper API for removing data entries from scene tree nodes.

CDN: Use `SDVInteractions.InteractionData` for the `instanceof` check.

## Multiple Selection Parameters

When a model has multiple selection parameters (e.g., one per floor), activate only one
at a time. Tear down the previous one before setting up the next.

**The `componentId` scoping is critical here.** Each selection parameter gets its own
`componentId` (use the parameter ID). When you tear down one parameter's managers and
set up new ones for a different parameter, the old `InteractionData` (scoped to the
old `componentId`) is invisible to the new managers (scoped to the new `componentId`).
This prevents cross-contamination between steps — e.g., ground floor nodes won't
respond to the first floor's managers.

```ts
let activeTokens = [];
let activeSelectMgr = null;
let activeHoverMgr = null;
let activeComponentId = null;

async function activateSelectionParam(selParamId) {
  // Tear down previous
  teardownSelection(
    activeTokens,
    activeSelectMgr,
    activeHoverMgr,
    activeComponentId,
  );

  const selParam = session.parameters[selParamId];
  if (!selParam || !isSelectionParameterApi(selParam)) return;

  // Use the parameter ID as the componentId
  const componentId = selParamId;
  activeComponentId = componentId;

  // Extract props — at runtime settings is { type, props: { ... } }
  const settings = selParam.settings?.props ?? selParam.settings;

  // Set up new managers with componentId for scoping
  activeSelectMgr = new SelectManager(componentId, selectionEffect);
  if (settings?.maximumSelection != null)
    activeSelectMgr.maximumSelection = settings.maximumSelection;
  if (settings?.minimumSelection != null)
    activeSelectMgr.minimumSelection = settings.minimumSelection;
  if (settings?.deselectOnEmpty != null)
    activeSelectMgr.deselectOnEmpty = settings.deselectOnEmpty;
  interactionEngine.addInteractionManager(activeSelectMgr);

  if (settings?.hover !== false) {
    activeHoverMgr = new HoverManager(componentId, hoverEffect);
    interactionEngine.addInteractionManager(activeHoverMgr);
  }

  // Mark nodes — use addInteractionData with the same componentId
  if (settings?.nameFilter?.length) {
    // Name filter path — see name-filters.md for full pattern
    // ... gather nodes via convertUserDefinedNameFilters + gatherNodesForPattern ...
    // For each matched node:
    //   addInteractionData(node, { select: true, hover: true }, componentId);
    // Plus set up output.updateCallback for re-apply after customize()
  } else {
    // No filter — mark session root (persists across customize)
    addInteractionData(
      session.node,
      { select: true, hover: true },
      componentId,
    );
  }

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

## Highlighting Available (Selectable) Nodes

To show which nodes are selectable before the user interacts, use the SelectManager's
`interactionEffectUtils` to apply an available effect:

```ts
// After gathering matched nodes via name filter:
const availableEffectTokens = new Map();
matchedNodes.forEach((node) => {
  const token = selectManager.interactionEffectUtils.applyInteractionEffect(
    node,
    availableEffect, // e.g., white pulsing outline — see Interaction Effects above
  );
  availableEffectTokens.set(node, token);
});

// Clean up when tearing down or when nodes are replaced:
availableEffectTokens.forEach((token, node) => {
  selectManager.interactionEffectUtils.removeInteractionEffect(node, token);
});
```

The App Builder applies the available effect to all matched nodes that are not currently
selected, and removes it when a node is selected or when the output nodes are replaced.

## Gotchas

- Always use `isSelectionParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
- Selection works on scene tree nodes, not mesh faces. Granularity depends on how the Grasshopper model outputs geometry.
- **Always add a HoverManager** alongside SelectManager. Without hover feedback, users
  have no indication that geometry is interactive.
- **Always pass `componentId`** to both `new SelectManager(componentId, effect)` and
  `addInteractionData(node, settings, componentId)`. Without matching `componentId`
  values, managers cannot see the interaction data and selection will not work.
  This is the #1 cause of "selection doesn't work" bugs.
- **Never use `new InteractionData()` directly** when `addInteractionData` is available.
  Manual `InteractionData` creation bypasses `restrictedManagers` scoping, causing
  cross-contamination when multiple selection parameters coexist on the same model.
- **Use `node.removeData(data)`** for cleanup — not manual array splice. The
  `removeData` method is the proper API. Filter by
  `data.restrictedManagers.includes(componentId)` to remove only data from a specific
  interaction parameter.
- **Always extract settings props before use:**
  `const settings = param.settings?.props ?? param.settings;`
  At runtime, `param.settings` has structure `{ type: "selection", props: { ... } }`.
  Reading `param.settings.nameFilter` directly returns `undefined`, which causes the
  fallback to mark the entire `session.node` as interactive — **this makes the entire
  model turn grey on hover** because the hover effect applies to all geometry at once.
- **Prefer `session.node`** over per-output for `InteractionData` when no `nameFilter`
  is defined. It persists across `customize()` calls. Per-output nodes are replaced
  on every customization — InteractionData is lost unless you use
  `output.updateCallback` to re-apply it.
- **Store `addListener` tokens** and call `removeListener(token)` during cleanup. Leaked
  listeners cause duplicate event handling and stale closures.
- **Handle `SELECT_OFF`** by clearing the parameter value and calling `customize()`.
  If you only handle `SELECT_ON`, deselecting a node doesn't update the model.
- When `param.settings.nameFilter` is defined, use the library's name filter utilities
  to target specific nodes — see [name-filters.md](name-filters.md).
- **Interaction effect types:** `selectionColor`, `hoverColor`, and `availableColor` in
  `param.settings` can be hex color strings (→ `MaterialStandardData`) or full
  post-processing effect definitions (→ outline effects). The App Builder defaults to
  outline effects. If `param.settings` provides them, use them as-is; otherwise, use
  outline effects for a polished look or `MaterialStandardData` for simplicity.

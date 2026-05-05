# SelectManager — Click-to-Select Interaction

Requires an `InteractionEngine` instance (one per viewport).

**Selection is the foundation for gumball and rectangle transforms.** In the App Builder,
both [gumball-transform.md](gumball-transform.md) and
[rectangle-transform.md](rectangle-transform.md) internally use the same selection
infrastructure (`useSelection` hook) to let users pick nodes before attaching the
transform gizmo. The `SelectManager` / `MultiSelectManager` setup, `componentId`
scoping, and event handling described here apply to all three interaction types.

## Setup

```ts
import {
  InteractionEngine,
  InteractionData,
  SelectManager,
  MultiSelectManager,
  HoverManager,
  addInteractionData,
  convertUserDefinedNameFilters,
  gatherNodesForPattern,
  matchNodesWithPatterns,
  checkNodeNameMatch,
} from "@shapediver/viewer.features.interaction";
import type { ITreeNode } from "@shapediver/viewer.shared.node-tree";
import {
  addListener,
  removeListener,
  EVENTTYPE,
  MaterialStandardData,
  isSelectionParameterApi,
  type IOutlineEffectDefinition,
} from "@shapediver/viewer";

// Create engine once per viewport
const interactionEngine = new InteractionEngine(viewport);
```

CDN: `new SDVInteractions.InteractionEngine(viewport)`,
`new SDVInteractions.MultiSelectManager(componentId, effect, min, max)`.

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
import {
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
} from "@shapediver/viewer";
// CDN: const { POST_PROCESSING_EFFECT_TYPE, BlendFunction, KernelSize } = SDV;

// Blue outline for selected objects
const selectionEffect: IOutlineEffectDefinition = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: BlendFunction.ALPHA,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#0d44f0",
    kernelSize: KernelSize.LARGE,
    visibleEdgeColor: "#0d44f0",
  },
};

// White outline for hovered objects
const hoverEffect: IOutlineEffectDefinition = {
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

// White pulsing outline for available (selectable) objects
const availableEffect: IOutlineEffectDefinition = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: BlendFunction.ALPHA,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#ffffff",
    kernelSize: KernelSize.LARGE,
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

**Use `MultiSelectManager` when `maximumSelection > 1`.** The App Builder determines
which manager to use with this logic:

```ts
const selectMultiple =
  settings.minimumSelection !== undefined &&
  settings.maximumSelection !== undefined &&
  settings.minimumSelection <= settings.maximumSelection &&
  settings.maximumSelection > 1;
```

When `selectMultiple` is `true`, use `MultiSelectManager` — it takes `minimumSelection`
and `maximumSelection` as constructor arguments. When `false`, use `SelectManager`.

```ts
import {
  InteractionEngine,
  InteractionData,
  SelectManager,
  MultiSelectManager,
  HoverManager,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";

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

const minimumSelection = settings?.minimumSelection ?? 1;
const maximumSelection = settings?.maximumSelection ?? 1;

// Determine whether to use multi-select
const selectMultiple =
  minimumSelection <= maximumSelection && maximumSelection > 1;

let selectManager;
if (selectMultiple) {
  // MultiSelectManager: min/max passed as constructor args (3rd and 4th)
  selectManager = new MultiSelectManager(
    componentId,
    selectionEffect,
    minimumSelection,
    maximumSelection,
  );
} else {
  // Single SelectManager: min/max set as properties
  selectManager = new SelectManager(componentId, selectionEffect);
}
if (settings?.deselectOnEmpty != null) {
  selectManager.deselectOnEmpty = settings.deselectOnEmpty;
}
const selectMgrToken = interactionEngine.addInteractionManager(selectManager);

// Hover highlight (on mouse move) — ALWAYS add this with selection
// Only skip if settings.hover is explicitly false
let hoverMgrToken;
if (settings?.hover !== false) {
  const hoverManager = new HoverManager(componentId, hoverEffect);
  hoverMgrToken = interactionEngine.addInteractionManager(hoverManager);
}
```

CDN: `new SDVInteractions.SelectManager(componentId, effect)`,
`new SDVInteractions.MultiSelectManager(componentId, effect, min, max)`,
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
| `selectionColor`   | `string` or effect definition | `"#0d44f0"` | Color/effect of selected objects                                                  |
| `availableColor`   | `string` or effect definition | `"#ffffff"` | Color/effect highlighting selectable objects before interaction                   |
| `hoverColor`       | `string` or effect definition | `"#00ff78"` | Color/effect on hover                                                             |
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
      // Clean up old node — deselect first, THEN remove InteractionData
      // (must happen while nodes are still live in the scene)
      if (oldNode) {
        oldNode.traverse((n) => {
          for (const data of [...n.data]) {
            if (
              data instanceof InteractionData &&
              data.restrictedManagers.includes(componentId)
            ) {
              // Deselect before removing data so the outline effect is
              // properly released while the node reference is still valid
              if (data.interactionStates?.select === true) {
                selectManager.deselect(n);
              }
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

## Node Name Format — `matchNodesWithPatterns`

**⚠️ CRITICAL: Do NOT use `e.node.name` directly as the selection parameter value.**

`e.node.name` returns only the leaf node name (e.g., `"Wall_1"`), but the Grasshopper
model expects **full dot-separated names** including the output prefix (e.g.,
`"Walls.Wall_1"`). The App Builder uses `matchNodesWithPatterns()` to resolve the
correct names.

`matchNodesWithPatterns` takes the output patterns (from `convertUserDefinedNameFilters`)
and an array of selected nodes, and returns the matching dot-separated name strings.

```ts
import {
  convertUserDefinedNameFilters,
  matchNodesWithPatterns,
} from "@shapediver/viewer.features.interaction";

// Build output patterns once during setup
const outputIdsToNames = {};
Object.entries(session.outputs).forEach(([id, out]) => {
  outputIdsToNames[id] = out.name;
});
const outputPatterns = convertUserDefinedNameFilters(
  nameFilter, // string[] from extracted settings.nameFilter
  outputIdsToNames,
);

// In event handlers, resolve node(s) to their full dot-separated names:
function getSelectedNames(nodes) {
  const names = [];
  for (const outputId in outputPatterns) {
    names.push(...matchNodesWithPatterns(outputPatterns[outputId], nodes));
  }
  return names;
}

// Single: getSelectedNames([e.node])  → ["Walls.Wall_1"]
// Multi:  getSelectedNames(e.nodes)   → ["Walls.Wall_1", "Walls.Wall_2"]
```

CDN: `SDVInteractions.convertUserDefinedNameFilters(...)`,
`SDVInteractions.matchNodesWithPatterns(...)`.

**When `nameFilter` is not defined**, `e.node.name` is acceptable as a fallback since
there are no output-scoped patterns to match against. However, using
`matchNodesWithPatterns` is always correct and preferred.

## Listen for Selection Events

Store the tokens returned by `addListener` — you need them for cleanup.

**Always filter events by `componentId`:** Selection events are global — every
`SelectManager` in the scene fires them. Use `e.manager.id !== componentId` to ignore
events from other managers. Without this guard, multiple selection parameters
interfere with each other.

### Single Selection (`maximumSelection` ≤ 1)

When using `SelectManager`, listen for `SELECT_ON` and `SELECT_OFF`. The event
provides `e.node` (a single node).

**Both `SELECT_ON` and `SELECT_OFF` must update the parameter value.** If you only handle
`SELECT_ON`, deselecting a node leaves stale data on the backend.

```ts
const selectToken = addListener(EVENTTYPE.INTERACTION.SELECT_ON, async (e) => {
  // Ignore events from other managers
  if (e.manager.id !== componentId) return;
  if (selectionParam) {
    const names = getSelectedNames([e.node]);
    selectionParam.value = JSON.stringify({ names });
    await session.customize();
    // Restore highlight on new nodes (see "Restoring Selection" below)
    restoreSelection(session, componentId, selectManager, names);
  }
});

const deselectToken = addListener(
  EVENTTYPE.INTERACTION.SELECT_OFF,
  async (e) => {
    if (e.manager.id !== componentId) return;
    if (selectionParam) {
      selectionParam.value = JSON.stringify({ names: [] });
      await session.customize();
    }
  },
);
```

### Multi-Selection (`maximumSelection` > 1)

When using `MultiSelectManager`, listen for `MULTI_SELECT_ON` and `MULTI_SELECT_OFF`
instead. These events provide `e.nodes` — the **full array of currently selected
nodes** (not just the added/removed node). The `MultiSelectManager` internally tracks
which nodes are selected and enforces the min/max constraints.

```ts
const multiSelectOnToken = addListener(
  EVENTTYPE.INTERACTION.MULTI_SELECT_ON,
  async (e) => {
    if (e.manager.id !== componentId) return;
    if (selectionParam) {
      const names = getSelectedNames(e.nodes);
      selectionParam.value = JSON.stringify({ names });
      // See "Acceptance Logic" below — you may defer customize()
      await session.customize();
      restoreSelection(session, componentId, selectManager, names);
    }
  },
);

const multiSelectOffToken = addListener(
  EVENTTYPE.INTERACTION.MULTI_SELECT_OFF,
  async (e) => {
    if (e.manager.id !== componentId) return;
    if (selectionParam) {
      const names = getSelectedNames(e.nodes);
      selectionParam.value = JSON.stringify({ names });
      await session.customize();
      restoreSelection(session, componentId, selectManager, names);
    }
  },
);
```

**Do NOT listen for `SELECT_ON`/`SELECT_OFF` when using `MultiSelectManager`.** Multi-
selection uses its own event types. Mixing them causes duplicate or missing updates.

## Restoring Selection After Computation

`session.customize()` replaces output nodes. The `SelectManager` still holds a
reference to the old (now-dead) node, so the selection outline disappears even
though the parameter value is correct. The App Builder solves this by
**re-selecting the matching nodes on the new geometry** after each computation.

Use `checkNodeNameMatch` to find new nodes by their dot-separated names, then
call `selectManager.select()` to re-apply the outline.

```ts
import {
  InteractionData,
  checkNodeNameMatch,
} from "@shapediver/viewer.features.interaction";

function restoreSelection(session, componentId, selectMgr, selectedNames) {
  if (!selectMgr || !session) return;

  for (const outputId in session.outputs) {
    const outputNode = session.outputs[outputId]?.node;
    if (!outputNode) continue;

    // Deselect all nodes scoped to this componentId
    outputNode.traverse((n) => {
      for (const d of n.data) {
        if (
          d instanceof InteractionData &&
          d.restrictedManagers.includes(componentId)
        ) {
          selectMgr.deselect(n);
        }
      }
    });

    // Re-select nodes that match the stored names
    const outputName = session.outputs[outputId].name;
    selectedNames.forEach((name) => {
      const parts = name.split(".");
      if (parts[0] !== outputName) return;
      const matchName = parts.slice(1).join(".");

      outputNode.traverse((n) => {
        if (checkNodeNameMatch(n, matchName)) {
          const hasData = n.data.some(
            (d) =>
              d instanceof InteractionData &&
              d.restrictedManagers.includes(componentId),
          );
          if (hasData) {
            selectMgr.select({ distance: 1, point: [0, 0, 0], node: n });
          }
        }
      });
    });
  }
}
```

CDN: `SDVInteractions.InteractionData`, `SDVInteractions.checkNodeNameMatch(...)`.

Call `restoreSelection()` in two places:

1. **After `await session.customize()`** in every selection event handler.
2. **Inside `output.updateCallback`** after marking new nodes with `addInteractionData`,
   so the highlight is restored when nodes are replaced by other parameter changes.

### Acceptance Logic — When to Call `customize()`

The App Builder does not always call `customize()` immediately on every selection event.
It uses an **acceptance pattern** based on `minimumSelection` and `maximumSelection`:

```ts
const acceptable =
  selectedNodeNames.length >= minimumSelection &&
  selectedNodeNames.length <= maximumSelection;

// Auto-accept when the result is unambiguous:
// - min === max: there's exactly one valid count (e.g., "select exactly 3")
// - min === 0 && max === 1: single optional selection
const acceptImmediately =
  (minimumSelection === maximumSelection ||
    (minimumSelection === 0 && maximumSelection === 1)) &&
  acceptable;
```

**When `acceptImmediately` is true**, call `customize()` as soon as the constraint is
met. The selection is submitted automatically without user confirmation.

**When `acceptImmediately` is false** (e.g., "select between 2 and 5 objects"), the user
needs a way to **confirm** or **cancel** their selection:

- Show a **Confirm** button, enabled only when `acceptable` is `true`.
- Show a **Cancel** button that resets to the previous value.
- Display a prompt like `"Select between ${minimumSelection} and ${maximumSelection} objects"` or `"Select ${minimumSelection} object(s)"` when min === max.
- Do NOT call `customize()` on every `MULTI_SELECT_ON`/`MULTI_SELECT_OFF` — accumulate
  the names locally and only submit when the user clicks Confirm.

```ts
// Example: track selected names locally, submit on confirm
let selectedNames = [];

const multiSelectOnToken = addListener(
  EVENTTYPE.INTERACTION.MULTI_SELECT_ON,
  (e) => {
    if (e.manager.id !== componentId) return;
    selectedNames = getSelectedNames(e.nodes);
    updateUI(selectedNames); // Update counter / enable confirm button
  },
);

const multiSelectOffToken = addListener(
  EVENTTYPE.INTERACTION.MULTI_SELECT_OFF,
  (e) => {
    if (e.manager.id !== componentId) return;
    selectedNames = getSelectedNames(e.nodes);
    updateUI(selectedNames);
  },
);

// Called when user clicks Confirm
async function confirmSelection() {
  selectionParam.value = JSON.stringify({ names: selectedNames });
  await session.customize();
}

// Called when user clicks Cancel
function cancelSelection() {
  // Reset to previous value
  selectedNames = JSON.parse(selectionParam.value || '{"names":[]}').names;
  selectManager.deselectAll(); // MultiSelectManager has deselectAll()
}
```

**For simple use cases** where you don't need a confirm/cancel UI, calling `customize()`
on every event is acceptable — but be aware that each call triggers a model recomputation.

## Teardown / Cleanup

For multi-step UIs, dynamic configurators, or switching between different selection
parameters, you must fully tear down the previous selection state before setting up
a new one.

```ts
function teardownSelection(
  listenerTokens,
  selectMgr,
  hoverMgr,
  selectMgrToken,
  hoverMgrToken,
  componentId,
) {
  // 1. Remove event listeners
  for (const t of listenerTokens) removeListener(t);

  // 2. Deselect all nodes before removing managers
  if (selectMgr) {
    if (selectMgr instanceof MultiSelectManager) {
      selectMgr.deselectAll();
    } else {
      selectMgr.deselect();
    }
  }

  // 3. Remove interaction managers from engine (pass the token, not the manager)
  if (selectMgrToken)
    interactionEngine.removeInteractionManager(selectMgrToken);
  if (hoverMgrToken) interactionEngine.removeInteractionManager(hoverMgrToken);

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
let activeListenerTokens = [];
let activeSelectMgr = null;
let activeHoverMgr = null;
let activeSelectMgrToken = null;
let activeHoverMgrToken = null;
let activeComponentId = null;

async function activateSelectionParam(selParamId) {
  // Tear down previous
  teardownSelection(
    activeListenerTokens,
    activeSelectMgr,
    activeHoverMgr,
    activeSelectMgrToken,
    activeHoverMgrToken,
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
  const minimumSelection = settings?.minimumSelection ?? 1;
  const maximumSelection = settings?.maximumSelection ?? 1;
  const selectMultiple =
    minimumSelection <= maximumSelection && maximumSelection > 1;

  if (selectMultiple) {
    activeSelectMgr = new MultiSelectManager(
      componentId,
      selectionEffect,
      minimumSelection,
      maximumSelection,
    );
  } else {
    activeSelectMgr = new SelectManager(componentId, selectionEffect);
  }
  if (settings?.deselectOnEmpty != null)
    activeSelectMgr.deselectOnEmpty = settings.deselectOnEmpty;
  activeSelectMgrToken =
    interactionEngine.addInteractionManager(activeSelectMgr);

  if (settings?.hover !== false) {
    activeHoverMgr = new HoverManager(componentId, hoverEffect);
    activeHoverMgrToken =
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

  // Build output patterns for name resolution
  const outputIdsToNames = {};
  Object.entries(session.outputs).forEach(([id, out]) => {
    outputIdsToNames[id] = out.name;
  });
  const nameFilter = settings?.nameFilter ?? [];
  const outputPatterns = nameFilter.length
    ? convertUserDefinedNameFilters(nameFilter, outputIdsToNames)
    : null;

  function getNames(nodes) {
    if (!outputPatterns) return nodes.map((n) => n.name);
    const names = [];
    for (const outputId in outputPatterns) {
      names.push(...matchNodesWithPatterns(outputPatterns[outputId], nodes));
    }
    return names;
  }

  // Listen for events — store tokens for cleanup
  // Use the correct event types based on single vs multi-select
  if (selectMultiple) {
    activeListenerTokens = [
      addListener(EVENTTYPE.INTERACTION.MULTI_SELECT_ON, async (e) => {
        if (e.manager.id !== componentId) return;
        const names = getNames(e.nodes);
        selParam.value = JSON.stringify({ names });
        await session.customize();
        restoreSelection(session, componentId, activeSelectMgr, names);
      }),
      addListener(EVENTTYPE.INTERACTION.MULTI_SELECT_OFF, async (e) => {
        if (e.manager.id !== componentId) return;
        const names = getNames(e.nodes);
        selParam.value = JSON.stringify({ names });
        await session.customize();
        restoreSelection(session, componentId, activeSelectMgr, names);
      }),
    ];
  } else {
    activeListenerTokens = [
      addListener(EVENTTYPE.INTERACTION.SELECT_ON, async (e) => {
        if (e.manager.id !== componentId) return;
        const names = getNames([e.node]);
        selParam.value = JSON.stringify({ names });
        await session.customize();
        restoreSelection(session, componentId, activeSelectMgr, names);
      }),
      addListener(EVENTTYPE.INTERACTION.SELECT_OFF, async (e) => {
        if (e.manager.id !== componentId) return;
        selParam.value = JSON.stringify({ names: [] });
        await session.customize();
      }),
    ];
  }
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
- **Use `MultiSelectManager` when `maximumSelection > 1`.** Using `SelectManager` with
  multi-selection settings will not work correctly — `SelectManager` only tracks one
  selected node at a time. The `MultiSelectManager` constructor takes min/max as its
  3rd and 4th arguments and fires `MULTI_SELECT_ON`/`MULTI_SELECT_OFF` events (with
  `e.nodes` array) instead of `SELECT_ON`/`SELECT_OFF` (with `e.node` single).
- **`MultiSelectManager.deselectAll()`** clears all selections. `SelectManager` uses
  `.deselect()` instead. Use the correct method based on the manager type during
  teardown.

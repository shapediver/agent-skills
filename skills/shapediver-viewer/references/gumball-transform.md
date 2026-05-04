# GumballTransform — 3D Translate/Rotate/Scale Gizmo

A 3D gizmo that lets users translate, rotate, and scale objects interactively.

**Does NOT require InteractionEngine.** Uses `@shapediver/viewer.features.transformation-tools`.

## `param.settings` Reference

When `isGumballTransformParameterApi(param)` is `true`, `param.settings` at runtime has
the structure `{ type: "gumballTransform", props: { ... } }`. The properties below are
under `settings.props`. Always extract them first:

```ts
const settings = param.settings?.props ?? param.settings;
```

The extracted `settings` object may contain:

| Property                        | Type                          | Default      | Description                                              |
| :------------------------------ | :---------------------------- | :----------- | :------------------------------------------------------- |
| `selectionColor`                | `string` or effect definition | `"#ffff00"`  | Color/effect of selected objects                         |
| `availableColor`                | `string` or effect definition | —            | Color/effect highlighting available objects before interaction |
| `hoverColor`                    | `string` or effect definition | `"#0000ff"`  | Color/effect on hover                                    |
| `nameFilter`                    | `string[]`     | —            | Filters which scene nodes are selectable                 |
| `hover`                         | `boolean`      | `true`       | Enable/disable hover effect                              |
| `minimumSelection`              | `number`       | `0`          | Minimum objects to select                                |
| `maximumSelection`              | `number`       | `Infinity`   | Maximum objects to select                                |
| `deselectOnEmpty`               | `boolean`      | `false`      | Deselect all when clicking empty space                   |
| `objects`                       | `array`        | —            | Object definitions with `nameFilter`, `restrictions`, `dragOrigin`, `dragAnchors` |
| `restrictions`                  | `array`        | —            | Restriction definitions (plane, geometry, etc.)          |
| `activeMode`                    | `string`       | —            | `"activeOnStart"` to auto-activate on load               |
| `prompt`                        | `object`       | —            | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

**Use ALL defined settings.** The gumball combines selection (to pick nodes) with the
transform gizmo. Apply selection settings (`selectionColor`, `hoverColor`, `minimumSelection`,
`maximumSelection`, `deselectOnEmpty`, `hover`) when setting up the SelectManager, and
use `restrictions` and `objects` when configuring the gumball itself.

**Name filter merging:** The App Builder merges `nameFilter` from BOTH the top-level
`settings.nameFilter` array AND each `settings.objects[].nameFilter` string into a
single combined name filter for selection. This ensures all relevant nodes are selectable.

**Per-object restrictions:** When `settings.objects` is defined, each object may reference
restriction IDs via `objects[].restrictions`. These IDs map to entries in
`settings.restrictions`. When creating the gumball for a selected node, the App Builder
matches the node against each object's `nameFilter` to determine which restrictions apply.

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

The gumball typically works with selection: the user selects nodes first, then the
gumball gizmo is attached to the selected node(s). Set up a SelectManager using the
gumball parameter's selection-related settings.

**All managers and `addInteractionData` calls must use the same `componentId`.**
Use the parameter ID. See [interactions-selection.md](interactions-selection.md) § Component ID.

```ts
const gumballParam = Object.values(session.parameters).find(
  isGumballTransformParameterApi,
);
const settings = gumballParam?.settings?.props ?? gumballParam?.settings;
const componentId = gumballParam.id;

// Merge nameFilter from top-level AND from each objects[].nameFilter
const mergedNameFilter = [
  ...(settings?.nameFilter ?? []),
  ...(settings?.objects?.map((obj) => obj.nameFilter).filter(Boolean) ?? []),
];

// Set up selection for picking nodes (uses gumball's selection settings)
const interactionEngine = new InteractionEngine(viewport);

// App Builder default effects (or use settings values if provided)
const selectionEffect = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: 27,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#0d44f0",
    kernelSize: 2,
    visibleEdgeColor: "#0d44f0",
  },
};
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

// Hover feedback — only skip if settings.hover is explicitly false
if (settings?.hover !== false) {
  const hoverManager = new HoverManager(componentId, hoverEffect);
  interactionEngine.addInteractionManager(hoverManager);
}

// Mark nodes using addInteractionData with componentId
// (use mergedNameFilter with convertUserDefinedNameFilters + gatherNodesForPattern
//  or mark session.node if no filter)
addInteractionData(session.node, { select: true, hover: true }, componentId);

// `nodes` = array of scene tree nodes to attach the gizmo to.
// Use `getNodesByName` to find nodes matching `nameFilter` patterns:
import { getNodesByName } from "@shapediver/viewer.features.interaction";
const nodesAndNames = getNodesByName([session], selectedNodeNames);
const nodes = nodesAndNames.map((n) => n.node);

// Pass settings (including restrictions) to the GumballTransform constructor.
// The 4th argument is the componentId — required for proper scoping.
// Per-object restrictions: match selected nodes against objects[].nameFilter
// to determine which restriction IDs apply, then resolve them from settings.restrictions.
const gumball = new GumballTransform(viewport, nodes, settings, componentId);
```

CDN: `SDVInteractions.getNodesByName(...)`,
`new SDVTransformationTools.GumballTransform(viewport, nodes, settings, componentId)`.

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
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`.
- **Always pass `componentId`** to `SelectManager`, `HoverManager`, `addInteractionData`,
  and `GumballTransform` (4th constructor arg). Without matching values, interaction
  will not work.
- The `nodes` array determines which objects get the gizmo. Use `getNodesByName` from
  `@shapediver/viewer.features.interaction` to find nodes matching the `nameFilter`
  patterns — see [name-filters.md](name-filters.md).
- **Merge name filters:** Combine `settings.nameFilter` (top-level array) with each
  `settings.objects[].nameFilter` (string per object) into a single array for selection setup.
- **Per-object restrictions:** Each object in `settings.objects` may reference restriction
  IDs that map to entries in `settings.restrictions`. When a node is selected, match it
  against each object's `nameFilter` to find the applicable restriction IDs, then resolve
  those to restriction definitions.
- **Pass `settings` to `GumballTransform`** constructor as the third argument — it uses
  `restrictions` and per-object configuration internally.
- The gumball typically works with selection: the user selects a node first, then
  the gumball gizmo is attached to the selected node(s).
- The `MATRIX_CHANGED` event fires on every gizmo interaction — call `session.customize()` to send the transformation to the backend.
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.

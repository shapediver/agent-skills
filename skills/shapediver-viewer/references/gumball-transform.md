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

| Property                 | Type                          | Default     | Description                                                                  |
| :----------------------- | :---------------------------- | :---------- | :--------------------------------------------------------------------------- |
| `selectionColor`         | `string` or effect definition | `"#0d44f0"` | Color/effect of selected objects                                             |
| `availableColor`         | `string` or effect definition | `"#ffffff"` | Color/effect highlighting available objects before interaction               |
| `hoverColor`             | `string` or effect definition | `"#00ff78"` | Color/effect on hover                                                        |
| `nameFilter`             | `string[]`                    | —           | Filters which scene nodes are selectable                                     |
| `hover`                  | `boolean`                     | `true`      | Enable/disable hover effect                                                  |
| `minimumSelection`       | `number`                      | `0`         | Minimum objects to select                                                    |
| `maximumSelection`       | `number`                      | `Infinity`  | Maximum objects to select                                                    |
| `deselectOnEmpty`        | `boolean`                     | `false`     | Deselect all when clicking empty space                                       |
| `enableTranslation`      | `boolean`                     | `true`      | Enable/disable translation (move) handles                                    |
| `enableTranslationAxes`  | `object`                      | —           | `{ x?, y?, z?, xy?, yz?, xz? }` — enable/disable individual translation axes |
| `enableRotation`         | `boolean`                     | `true`      | Enable/disable rotation handles                                              |
| `enableRotationAxes`     | `object`                      | —           | `{ x?, y?, z?, xy?, yz?, xz? }` — enable/disable individual rotation axes    |
| `enableScaling`          | `boolean`                     | `false`     | Enable/disable scale handles                                                 |
| `enableScalingAxes`      | `object`                      | —           | `{ x?, y?, z?, xy?, yz?, xz? }` — enable/disable individual scale axes       |
| `scale`                  | `number`                      | `0.005`     | Gizmo size — divides the scene bounding sphere to compute actual size        |
| `space`                  | `"local" \| "world"`          | `"local"`   | Coordinate space for the gizmo. Scaling not available in `"world"` space     |
| `objects`                | `array`                       | —           | Object definitions with `nameFilter` and `restrictions`                      |
| `objects[].nameFilter`   | `string`                      | —           | Name filter targeting specific scene nodes                                   |
| `objects[].restrictions` | `string[]`                    | —           | IDs of restrictions to apply to this object                                  |
| `restrictions`           | `array`                       | —           | Restriction definitions (plane, geometry, etc.)                              |
| `activeMode`             | `string`                      | —           | `"activeOnStart"` to auto-activate on load                                   |
| `prompt`                 | `object`                      | —           | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides             |

**Use ALL defined settings.** The gumball combines selection (to pick nodes) with the
transform gizmo. Apply selection settings (`selectionColor`, `hoverColor`, `minimumSelection`,
`maximumSelection`, `deselectOnEmpty`, `hover`) when setting up the SelectManager, and
use `restrictions`, `objects`, and the gumball-specific axis/mode settings when configuring
the gumball itself. The `enable*` and `enable*Axes` properties, `scale`, and `space` are
passed through `settings` to the `GumballTransform` constructor.

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
  InteractionEngine,
  InteractionData,
  SelectManager,
  MultiSelectManager,
  HoverManager,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";
import {
  addListener,
  EVENTTYPE,
  EVENTTYPE_TRANSFORMATION_TOOLS,
  isGumballTransformParameterApi,
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
} from "@shapediver/viewer";
```

CDN: `SDVTransformationTools.GumballTransform`,
`SDVInteractions.MultiSelectManager`.

## Create GumballTransform

The gumball works with selection: the user selects nodes first, then the gumball gizmo
is attached to the selected node(s). **The App Builder's gumball internally uses the
same `useSelection` hook** as regular selection parameters — it creates selection
settings from the gumball's props and delegates to the selection infrastructure.

**Gumball defaults:** `minimumSelection: 0`, `maximumSelection: Infinity`. Because
`maximumSelection > 1`, the App Builder **always uses `MultiSelectManager`** for gumball
transforms. This means gumball selection fires `MULTI_SELECT_ON`/`MULTI_SELECT_OFF`
events (with `e.nodes` array), not `SELECT_ON`/`SELECT_OFF`.

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
    blendFunction: BlendFunction.ALPHA,
    blur: true,
    edgeStrength: 10,
    hiddenEdgeColor: "#0d44f0",
    kernelSize: KernelSize.LARGE,
    visibleEdgeColor: "#0d44f0",
  },
};
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

const minimumSelection = settings?.minimumSelection ?? 0;
const maximumSelection = settings?.maximumSelection ?? Infinity;

// Gumball always uses MultiSelectManager (maximumSelection defaults to Infinity)
const selectMultiple =
  minimumSelection <= maximumSelection && maximumSelection > 1;

let selectManager;
if (selectMultiple) {
  selectManager = new MultiSelectManager(
    componentId,
    selectionEffect,
    minimumSelection,
    maximumSelection,
  );
} else {
  selectManager = new SelectManager(componentId, selectionEffect);
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

// Auto-select if only one node is available (App Builder behavior)
// When only a single node matches the name filter, select it automatically.
```

See [interactions-selection.md](interactions-selection.md) § Creating the Managers for the
full `MultiSelectManager` vs `SelectManager` decision logic.

### Restrictions

See [restrictions.md](restrictions.md) for restriction types, geometry restriction
node resolution, and per-object restriction matching patterns.

When creating the gumball for a selected node, resolve per-object restrictions
and pass them to the constructor:

```ts
const gumball = new GumballTransform(
  viewport,
  nodes,
  { ...settings, restrictions: restrictionsToUse },
  componentId,
);

// IMPORTANT: call gumball.close() when destroying or recreating the gumball
// (e.g., when selection changes or on teardown)
```

CDN: `new SDVTransformationTools.GumballTransform(viewport, nodes, settings, componentId)`.

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

## Gumball from Dynamic Parameters

Gumball transform settings can come from **dynamic parameters** defined in the AppBuilder
output JSON rather than from real Grasshopper parameters. See
[dynamic-parameters.md](dynamic-parameters.md) for the full pattern.

When using dynamic parameters, read the gumball settings from the AppBuilder output
and send transform values back via the `AppBuilder` STRING parameter instead of
setting the parameter value directly.

## Gotchas

- Always use `isGumballTransformParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`.
- **Always pass `componentId`** to `SelectManager`/`MultiSelectManager`, `HoverManager`,
  `addInteractionData`, and `GumballTransform` (4th constructor arg). Without matching
  values, interaction will not work.
- **Use `MultiSelectManager` for gumball selection.** The gumball defaults to
  `maximumSelection: Infinity`, which means `maximumSelection > 1` → always use
  `MultiSelectManager`. Listen for `MULTI_SELECT_ON`/`MULTI_SELECT_OFF` events (with
  `e.nodes` array), not `SELECT_ON`/`SELECT_OFF`. See
  [interactions-selection.md](interactions-selection.md) § Creating the Managers.
- The `nodes` array determines which objects get the gizmo. Use `getNodesByName` from
  `@shapediver/viewer.features.interaction` to find nodes matching the `nameFilter`
  patterns — see [name-filters.md](name-filters.md).
- **Merge name filters:** Combine `settings.nameFilter` (top-level array) with each
  `settings.objects[].nameFilter` (string per object) into a single array for selection setup.
- **Per-object restrictions** — see [restrictions.md](restrictions.md) for the full
  matching and resolution pattern.
- **Call `gumball.close()`** when the gumball is no longer needed (on selection change,
  component teardown, or before creating a new gumball instance). Failure to close causes
  stale gizmos in the viewport.
- **Pass `settings` to `GumballTransform`** constructor as the third argument — it uses
  `restrictions` and per-object configuration internally.
- The gumball typically works with selection: the user selects a node first, then
  the gumball gizmo is attached to the selected node(s).
- The `MATRIX_CHANGED` event fires on every gizmo interaction — call `session.customize()` to send the transformation to the backend.
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.
- **Restrictions** — see [restrictions.md](restrictions.md) for restriction types,
  geometry restriction node resolution, and per-object matching.

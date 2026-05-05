# RectangleTransform — 2D Planar Gizmo

A 2D gizmo for planar manipulation of objects (translate and scale on a defined plane).

**Does NOT require InteractionEngine.** Uses `@shapediver/viewer.features.transformation-tools`.

## `param.settings` Reference

When `isRectangleTransformParameterApi(param)` is `true`, `param.settings` at runtime has
the structure `{ type: "rectangleTransform", props: { ... } }`. The properties below are
under `settings.props`. Always extract them first:

```ts
const settings = param.settings?.props ?? param.settings;
```

The extracted `settings` object may contain:

| Property                 | Type                          | Default     | Description                                                                                                                      |
| :----------------------- | :---------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `selectionColor`         | `string` or effect definition | `"#0d44f0"` | Color/effect of selected objects                                                                                                 |
| `availableColor`         | `string` or effect definition | `"#ffffff"` | Color/effect highlighting available objects before interaction                                                                   |
| `hoverColor`             | `string` or effect definition | `"#00ff78"` | Color/effect on hover                                                                                                            |
| `nameFilter`             | `string[]`                    | —           | Filters which scene nodes are selectable                                                                                         |
| `hover`                  | `boolean`                     | `true`      | Enable/disable hover effect                                                                                                      |
| `minimumSelection`       | `number`                      | `0`         | Minimum objects to select                                                                                                        |
| `maximumSelection`       | `number`                      | `1`         | Maximum objects to select                                                                                                        |
| `deselectOnEmpty`        | `boolean`                     | `false`     | Deselect all when clicking empty space                                                                                           |
| `enableTranslation`      | `boolean`                     | `true`      | Enable/disable translation                                                                                                       |
| `enableRotation`         | `boolean`                     | `true`      | Enable/disable rotation                                                                                                          |
| `enableScaling`          | `boolean`                     | `true`      | Enable/disable scaling                                                                                                           |
| `corners`                | `object`                      | —           | `{ bottomLeft?, bottomRight?, topRight?, topLeft? }` — disable specific corner handles (disabled handles are visible but locked) |
| `edgeControls`           | `object`                      | —           | `{ top?, bottom?, left?, right? }` — disable specific edge handles (disabled handles are visible but locked)                     |
| `rotation`               | `object`                      | —           | `{ step?, stepThreshold?, min?, max? }` — rotation snapping and range constraints (angles in degrees)                            |
| `objects`                | `array`                       | —           | Object definitions with `nameFilter` and `restrictions`                                                                          |
| `objects[].nameFilter`   | `string`                      | —           | Name filter targeting specific scene nodes                                                                                       |
| `objects[].restrictions` | `string[]`                    | —           | IDs of restrictions to apply to this object                                                                                      |
| `restrictions`           | `array`                       | —           | Restriction definitions (plane, geometry, etc.)                                                                                  |
| `plane`                  | `object`                      | —           | `{ origin, vector_u, vector_v }` — defines the transform plane                                                                   |
| `activeMode`             | `string`                      | —           | `"activeOnStart"` to auto-activate on load                                                                                       |
| `prompt`                 | `object`                      | —           | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides                                                                 |

**Use ALL defined settings.** The rectangle transform combines selection (to pick nodes)
with the 2D gizmo. Apply selection settings when setting up the SelectManager, use
`plane` from settings for the transform plane, and apply `restrictions`, `objects`,
and the rectangle-specific `enable*`, `corners`, `edgeControls`, and `rotation` settings
as configured.

**Name filter merging:** Like the gumball, merge `nameFilter` from BOTH the top-level
`settings.nameFilter` array AND each `settings.objects[].nameFilter` string into a
single combined name filter for selection. This ensures all relevant nodes are selectable.

**Per-object restrictions:** Each object in `settings.objects` may reference restriction
IDs via `objects[].restrictions`. These IDs map to entries in `settings.restrictions`.
When creating the rectangle transform for a selected node, match the node against each
object's `nameFilter` to determine which restrictions apply.

## Setup

```ts
import { RectangleTransform } from "@shapediver/viewer.features.transformation-tools";
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
  isRectangleTransformParameterApi,
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
} from "@shapediver/viewer";
```

CDN: `SDVTransformationTools.RectangleTransform`,
`SDVInteractions.MultiSelectManager`.

## Create RectangleTransform

Like the gumball, the rectangle transform internally uses the same selection
infrastructure. **The App Builder's rectangle transform calls `useSelection` internally**
with selection settings derived from the rectangle transform parameter's props.

**Rectangle defaults:** `minimumSelection: 0`, `maximumSelection: 1`. With
`maximumSelection` = 1, the App Builder uses a regular `SelectManager` (single select).
If `maximumSelection > 1`, it uses `MultiSelectManager` instead.

**All managers and `addInteractionData` calls must use the same `componentId`.**
Use the parameter ID. See [interactions-selection.md](interactions-selection.md) § Component ID.

```ts
const rectParam = Object.values(session.parameters).find(
  isRectangleTransformParameterApi,
);
const settings = rectParam?.settings?.props ?? rectParam?.settings;
const componentId = rectParam.id;

// Merge nameFilter from top-level AND from each objects[].nameFilter
const mergedNameFilter = [
  ...(settings?.nameFilter ?? []),
  ...(settings?.objects?.map((obj) => obj.nameFilter).filter(Boolean) ?? []),
];

// Set up selection for picking nodes
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
const maximumSelection = settings?.maximumSelection ?? 1;

// Determine whether to use multi-select
// Default maximumSelection is 1 → single select. If overridden > 1 → multi-select.
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
addInteractionData(session.node, { select: true, hover: true }, componentId);

// Auto-select if only one node is available (App Builder behavior)
// When only a single node matches the name filter, select it automatically.
```

See [interactions-selection.md](interactions-selection.md) § Creating the Managers for the
full `MultiSelectManager` vs `SelectManager` decision logic.

### Deactivating Selection When Maximum Is Reached

The App Builder deactivates selection once `maximumSelection` is reached. This prevents
the user from clicking additional nodes when the limit has been hit:

```ts
// Track whether max selections reached
let maxReached = false;

function onSelectionChanged(selectedNames) {
  if (maximumSelection !== Infinity) {
    maxReached = selectedNames.length >= maximumSelection;
  }
  // When maxReached is true, disable further selection interaction
  // (e.g., remove interaction managers or skip addInteractionData)
}
```

This is especially relevant for rectangle transforms where the default `maximumSelection`
is 1 — after the user selects a single object, selection is deactivated and the
rectangle transform gizmo takes over.

### Plane Conversion

The `settings.plane` defines the 2D surface. The App Builder converts it to the
format expected by `RectangleTransform`, with defaults for missing values:

```ts
import { RESTRICTION_TYPE } from "@shapediver/viewer.features.interaction";

const plane = {
  type: RESTRICTION_TYPE.PLANE,
  origin: settings?.plane?.origin ?? [0, 0, 0],
  vector_u: settings?.plane?.vector_u ?? [1, 0, 0],
  vector_v: settings?.plane?.vector_v ?? [0, 1, 0],
};
```

CDN: `SDVInteractions.RESTRICTION_TYPE`.

### Restrictions

See [restrictions.md](restrictions.md) for restriction types, geometry restriction
node resolution, and per-object restriction matching patterns.

When creating the rectangle transform for a selected node, resolve per-object
restrictions and pass them along with the plane:

```ts
const rectangleTransform = new RectangleTransform(
  viewport,
  nodes,
  { ...settings, plane, restrictions: restrictionsToUse },
  componentId,
);

// IMPORTANT: call rectangleTransform.close() when destroying or recreating
// (e.g., when selection changes or on teardown)
```

CDN: `new SDVTransformationTools.RectangleTransform(viewport, nodes, settings, componentId)`.

## Plane Parameters

| Property         | Type       | Description                           |
| :--------------- | :--------- | :------------------------------------ |
| `plane.origin`   | `number[]` | Center point of the constraint plane. |
| `plane.vector_u` | `number[]` | First direction vector of the plane.  |
| `plane.vector_v` | `number[]` | Second direction vector of the plane. |

## Rectangle Transform from Dynamic Parameters

Rectangle transform settings can come from **dynamic parameters** defined in the AppBuilder
output JSON rather than from real Grasshopper parameters. See
[dynamic-parameters.md](dynamic-parameters.md) for the full pattern.

When using dynamic parameters, read the rectangle transform settings from the AppBuilder
output and send transform values back via the `AppBuilder` STRING parameter instead of
setting the parameter value directly.

## Gotchas

- Always use `isRectangleTransformParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`.
- **Always pass `componentId`** to `SelectManager`/`MultiSelectManager`, `HoverManager`,
  `addInteractionData`, and `RectangleTransform` (4th constructor arg). Without matching
  values, interaction will not work.
- **Use the correct select manager type.** Rectangle defaults to `maximumSelection: 1`
  → `SelectManager` (single select). If `maximumSelection > 1`, use `MultiSelectManager`
  and listen for `MULTI_SELECT_ON`/`MULTI_SELECT_OFF` events instead of
  `SELECT_ON`/`SELECT_OFF`. See
  [interactions-selection.md](interactions-selection.md) § Creating the Managers.
- The `plane` option is required — use `settings.plane` if defined, otherwise provide defaults.
  It defines the 2D surface on which the transform operates. Convert it to the format with
  `type: RESTRICTION_TYPE.PLANE`.
- `nodes` = array of scene tree nodes to attach the gizmo to. Use `getNodesByName` from
  `@shapediver/viewer.features.interaction` to find nodes matching the `nameFilter`
  patterns — see [name-filters.md](name-filters.md).
- **Merge name filters:** Combine `settings.nameFilter` (top-level array) with each
  `settings.objects[].nameFilter` (string per object) into a single array for selection setup.
- **Per-object restrictions** — see [restrictions.md](restrictions.md) for the full
  matching and resolution pattern.
- **Call `rectangleTransform.close()`** when the transform is no longer needed (on selection
  change, component teardown, or before creating a new instance). Failure to close causes
  stale gizmos in the viewport.
- **Pass `settings` to `RectangleTransform`** constructor as the third argument — it uses
  `plane`, `restrictions`, and per-object configuration internally.
- Apply all selection-related settings (`selectionColor`, `hoverColor`, `minimumSelection`,
  `maximumSelection`, `deselectOnEmpty`, `hover`) when setting up the SelectManager.
- Use `GumballTransform` instead when the user needs full 3D translate/rotate/scale.
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.
- **Restrictions** — see [restrictions.md](restrictions.md) for restriction types,
  geometry restriction node resolution, and per-object matching.

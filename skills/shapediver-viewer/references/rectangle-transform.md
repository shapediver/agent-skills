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

| Property                        | Type                          | Default      | Description                                              |
| :------------------------------ | :---------------------------- | :----------- | :------------------------------------------------------- |
| `selectionColor`                | `string` or effect definition | `"#ffff00"`  | Color/effect of selected objects                         |
| `availableColor`                | `string` or effect definition | —            | Color/effect highlighting available objects before interaction |
| `hoverColor`                    | `string` or effect definition | `"#0000ff"`  | Color/effect on hover                                    |
| `nameFilter`                    | `string[]`     | —            | Filters which scene nodes are selectable                 |
| `hover`                         | `boolean`      | `true`       | Enable/disable hover effect                              |
| `minimumSelection`              | `number`       | `0`          | Minimum objects to select                                |
| `maximumSelection`              | `number`       | `1`          | Maximum objects to select                                |
| `deselectOnEmpty`               | `boolean`      | `false`      | Deselect all when clicking empty space                   |
| `objects`                       | `array`        | —            | Object definitions with `nameFilter`, `restrictions`, `dragOrigin`, `dragAnchors` |
| `restrictions`                  | `array`        | —            | Restriction definitions (plane, geometry, etc.)          |
| `plane`                         | `object`       | —            | `{ origin, vector_u, vector_v }` — defines the transform plane |
| `activeMode`                    | `string`       | —            | `"activeOnStart"` to auto-activate on load               |
| `prompt`                        | `object`       | —            | `{ activeTitle, activeText, inactiveTitle }` — UI text overrides |

**Use ALL defined settings.** The rectangle transform combines selection (to pick nodes)
with the 2D gizmo. Apply selection settings when setting up the SelectManager, use
`plane` from settings for the transform plane, and apply `restrictions` and `objects`
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
```

CDN: `SDVTransformationTools.RectangleTransform`.

## Create RectangleTransform

Like the gumball, the rectangle transform typically works with selection. Set up a
SelectManager using the parameter's selection-related settings.

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
addInteractionData(session.node, { select: true, hover: true }, componentId);

// Use plane from settings if defined, otherwise use defaults
const plane = settings?.plane ?? {
  origin: [0, 0, 0],
  vector_u: [1, 0, 0],
  vector_v: [0, 1, 0],
};

// Pass settings (including plane and restrictions) to the RectangleTransform constructor.
// The 4th argument is the componentId — required for proper scoping.
// Per-object restrictions: match selected nodes against objects[].nameFilter
// to determine which restriction IDs apply, then resolve them from settings.restrictions.
const rectangleTransform = new RectangleTransform(viewport, nodes, settings, componentId);
```

CDN: `new SDVTransformationTools.RectangleTransform(viewport, nodes, settings, componentId)`.

## Plane Parameters

| Property         | Type       | Description                           |
| :--------------- | :--------- | :------------------------------------ |
| `plane.origin`   | `number[]` | Center point of the constraint plane. |
| `plane.vector_u` | `number[]` | First direction vector of the plane.  |
| `plane.vector_v` | `number[]` | Second direction vector of the plane. |

## Gotchas

- Always use `isRectangleTransformParameterApi(param)` type guard before accessing `param.settings` (Rule 6).
  Then extract props: `const settings = param.settings?.props ?? param.settings;`
  **Reading `param.settings.nameFilter` directly returns `undefined`** at runtime because
  settings are nested under `props`.
- **Always pass `componentId`** to `SelectManager`, `HoverManager`, `addInteractionData`,
  and `RectangleTransform` (4th constructor arg). Without matching values, interaction
  will not work.
- The `plane` option is required — use `settings.plane` if defined, otherwise provide a default.
  It defines the 2D surface on which the transform operates.
- `nodes` = array of scene tree nodes to attach the gizmo to. Use `getNodesByName` from
  `@shapediver/viewer.features.interaction` to find nodes matching the `nameFilter`
  patterns — see [name-filters.md](name-filters.md).
- **Merge name filters:** Combine `settings.nameFilter` (top-level array) with each
  `settings.objects[].nameFilter` (string per object) into a single array for selection setup.
- **Per-object restrictions:** Each object in `settings.objects` may reference restriction
  IDs that map to entries in `settings.restrictions`. When a node is selected, match it
  against each object's `nameFilter` to find the applicable restriction IDs, then resolve
  those to restriction definitions.
- **Pass `settings` to `RectangleTransform`** constructor as the third argument — it uses
  `plane`, `restrictions`, and per-object configuration internally.
- Apply all selection-related settings (`selectionColor`, `hoverColor`, `minimumSelection`,
  `maximumSelection`, `deselectOnEmpty`, `hover`) when setting up the SelectManager.
- Use `GumballTransform` instead when the user needs full 3D translate/rotate/scale.
- **Never use `new InteractionData()` directly** — use `addInteractionData` for proper
  `componentId` scoping.

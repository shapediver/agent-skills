# Restrictions — Transform & Drag Constraints

Restrictions constrain how objects can be transformed. The same restriction types are
shared across **dragging**, **gumball**, and **rectangle transforms**.

## Restriction Types

Restrictions are defined in `settings.restrictions` as an array. Each restriction has
an `id`, a `type`, and type-specific properties:

| `type`          | Description                                                                 | Properties                                                    |
| :-------------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------ |
| `"plane"`       | Constrain movement to a 2D plane                                            | `origin`, `vector_u`, `vector_v`                              |
| `"cameraPlane"` | Constrain movement to a plane perpendicular to the camera                   | `origin` (optional)                                           |
| `"line"`        | Constrain movement along a line                                             | `origin`, `vector`                                            |
| `"point"`       | Lock to a single point (no movement)                                        | `origin`                                                      |
| `"geometry"`    | Constrain to the surface of scene geometry (requires node resolution)       | `nameFilter` (pattern to find constraint geometry nodes)      |

### Restriction Definition Format

```ts
// Plane restriction
{ id: "r1", type: "plane", origin: [0,0,0], vector_u: [1,0,0], vector_v: [0,1,0] }

// Line restriction
{ id: "r2", type: "line", origin: [0,0,0], vector: [0,0,1] }

// Geometry restriction — requires node resolution before use
{ id: "r3", type: "geometry", nameFilter: "constraintSurface*" }
```

### Default Fallback Restriction

When no restrictions match any object, the App Builder adds a default XY plane restriction:

```ts
import { RESTRICTION_TYPE } from "@shapediver/viewer.features.interaction";

const defaultRestriction = {
  type: RESTRICTION_TYPE.PLANE,
  id: "default",
  origin: [0, 0, 0],
  vector_u: [1, 0, 0],
  vector_v: [0, 1, 0],
};
```

CDN: `SDVInteractions.RESTRICTION_TYPE`.

## Geometry Restriction Node Resolution

`"geometry"` restrictions reference scene nodes by `nameFilter`. Before passing them
to the transform constructor, resolve the name filter to actual nodes:

```ts
import {
  convertUserDefinedNameFilters,
  gatherNodesForPattern,
} from "@shapediver/viewer.features.interaction";

function resolveGeometryRestriction(restriction) {
  if (restriction.type !== "geometry" || !restriction.nameFilter) {
    return restriction; // non-geometry restrictions pass through unchanged
  }

  // Convert the nameFilter to patterns
  const patterns = convertUserDefinedNameFilters(
    [restriction.nameFilter],
    outputIdsToNames,
  );

  // Gather matching nodes from the scene tree
  const nodes = [];
  for (const [, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      nodes.push(...gatherNodesForPattern(session.node, pattern));
    }
  }

  // Return a resolved copy with actual node references
  return { ...restriction, nodes };
}

// Apply to all restrictions before passing to the transform
const resolvedRestrictions = {};
for (const [id, r] of Object.entries(restrictionsToUse ?? {})) {
  resolvedRestrictions[id] = resolveGeometryRestriction(r);
}
```

CDN: `SDVInteractions.convertUserDefinedNameFilters(...)`,
`SDVInteractions.gatherNodesForPattern(...)`.

## Per-Object Restriction Matching

Each object in `settings.objects` may reference restriction IDs via
`objects[].restrictions`. These IDs map to entries in `settings.restrictions`.

### Setup: Build Lookup Structures

```ts
import {
  matchNodesWithPatterns,
  convertUserDefinedNameFilters,
  getNodesByName,
} from "@shapediver/viewer.features.interaction";

// Build outputId → outputName mapping
const outputIdsToNames = {};
Object.entries(session.outputs).forEach(([id, out]) => {
  outputIdsToNames[id] = out.name;
});

// Pre-convert each object's nameFilter into patterns
const convertedObjects = (settings?.objects ?? []).map((obj) => ({
  patterns: convertUserDefinedNameFilters([obj.nameFilter], outputIdsToNames),
  restrictions: obj.restrictions ?? [],
}));

// Convert settings.restrictions array to a lookup map by ID
const restrictionMap = {};
for (const r of settings?.restrictions ?? []) {
  restrictionMap[r.id] = r;
}
```

CDN: `SDVInteractions.matchNodesWithPatterns(...)`,
`SDVInteractions.convertUserDefinedNameFilters(...)`,
`SDVInteractions.getNodesByName(...)`.

### Gumball & Rectangle Transform: Resolve on Selection

For gumball and rectangle transforms, per-object restrictions are resolved when a
node is selected. Only applies when **exactly 1 node** is selected.

```ts
function resolvePerObjectRestrictions(nodes) {
  if (nodes.length !== 1 || !settings?.restrictions?.length) return undefined;

  const resolved = {};
  for (const obj of convertedObjects) {
    for (const [, patterns] of Object.entries(obj.patterns)) {
      const matched = matchNodesWithPatterns(patterns, [nodes[0].node]);
      if (matched.length > 0) {
        obj.restrictions.forEach((restrictionId) => {
          const restriction = restrictionMap[restrictionId];
          if (restriction) resolved[restrictionId] = restriction;
        });
      }
    }
  }
  return Object.keys(resolved).length > 0 ? resolved : undefined;
}
```

### Dragging: Apply Dynamically on DRAG_START

For dragging, restrictions are applied **dynamically on DRAG_START**, not at setup time:

1. On `DRAG_START`: match the dragged node against each object's nameFilter patterns
2. Look up the matching object's `restrictions` array (IDs)
3. Resolve each ID to the restriction definition from `settings.restrictions`
4. Call `dragManager.addRestriction(restriction)` for each resolved restriction
5. If NO restrictions match, add the default plane restriction (see above)
6. On `DRAG_END`: call `dragManager.removeRestrictions()` to clear all

```ts
import {
  addListener,
  removeListener,
  EVENTTYPE_INTERACTION,
} from "@shapediver/viewer";

const tokenDragStart = addListener(EVENTTYPE_INTERACTION.DRAG_START, (e) => {
  if (e.manager.id !== componentId) return;
  const dragged = [e.node];

  let addedRestrictions = false;
  for (const obj of convertedObjects) {
    for (const [outputId, patterns] of Object.entries(obj.patterns)) {
      const matched = matchNodesWithPatterns(patterns, dragged);
      if (matched.length > 0 && obj.restrictions.length > 0) {
        obj.restrictions.forEach((restrictionId) => {
          const restriction = restrictionMap[restrictionId];
          if (restriction) {
            e.manager.addRestriction(restriction);
            addedRestrictions = true;
          }
        });
      }
    }
  }

  // Fallback: default XY plane if no object-specific restrictions matched
  if (!addedRestrictions) {
    e.manager.addRestriction({
      type: RESTRICTION_TYPE.PLANE,
      id: "default",
      origin: [0, 0, 0],
      vector_u: [1, 0, 0],
      vector_v: [0, 1, 0],
    });
  }

  // Trigger initial move so restrictions take effect
  e.manager.onMove(e.event, e.ray, []);
});

const tokenDragEnd = addListener(EVENTTYPE_INTERACTION.DRAG_END, (e) => {
  if (e.manager.id !== componentId) return;
  e.manager.removeRestrictions();
});

// Cleanup: removeListener(tokenDragStart); removeListener(tokenDragEnd);
```

## Simple Case (No `settings.objects`)

When no per-object restrictions are defined, add a fallback constraint at setup time:

```ts
// Camera-plane constraint (object follows mouse on screen plane)
dragManager.addDragConstraint(new CameraPlaneConstraint());

// OR fixed plane constraint (e.g., XY plane at origin)
// dragManager.addDragConstraint(new PlaneConstraint([0, 0, 1], [0, 0, 0]));
```

## Gotchas

- **At least one restriction is required for dragging** — without a restriction, the
  DragManager doesn't know how to constrain movement and dragging does nothing.
- **Restrictions are applied dynamically on DRAG_START for dragging**, not at setup time.
  The App Builder adds them on `DRAG_START` by matching the dragged node against object
  patterns, and removes them on `DRAG_END` with `dragManager.removeRestrictions()`.
- **Per-object restrictions for gumball/rectangle are only resolved for single-node
  selection.** When exactly 1 node is selected, match it against each object's
  `nameFilter` patterns using `matchNodesWithPatterns`.
- **Resolve geometry restrictions before passing to transforms.** Geometry restrictions
  reference nodes by `nameFilter` — you must resolve them to actual scene tree nodes
  using `convertUserDefinedNameFilters` + `gatherNodesForPattern`.
- **Restrictions are shared across interaction types.** The same restriction types
  (`plane`, `cameraPlane`, `line`, `point`, `geometry`) work identically in dragging,
  gumball, and rectangle transforms.
- If no restrictions are defined and no objects match, the App Builder falls back to a
  default XY plane restriction.

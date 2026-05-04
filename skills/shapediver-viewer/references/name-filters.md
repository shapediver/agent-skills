# Name Filters — Targeting Nodes in the Scene Tree

The `nameFilter` property is an array of dot-separated pattern strings used to specify
which scene tree nodes an interaction feature should apply to. It is part of
`IGeneralInteractionParameterSettings` and inherited by all interaction parameter types
(selection, dragging, gumball transform, rectangle transform).

**When a model author configures an interaction parameter in Grasshopper, the `nameFilter`
is included in `param.settings.nameFilter`.** Always read it from there — do NOT hardcode
name filters.

---

## Pattern Syntax

Each entry in the `nameFilter` array is a **dot-separated string** with the following
structure:

```
<outputName>.<nodeName1>.<nodeName2>. ...
```

| Segment    | Description                                                          |
| :--------- | :------------------------------------------------------------------- |
| First part | The **output name** (matches the output's display name in the model) |
| Rest       | Hierarchical **node names** within that output's scene subtree       |

### Wildcards

The `*` character can be used as a wildcard:

- `*` as a **full segment** matches **any node name** at that level
- `*` within a segment matches **any substring** at that position (e.g., `Chair*` matches `Chair_1`, `ChairLeg`, etc.)

---

## How the Scene Tree Maps to Name Filters

The ShapeDiver viewer builds a scene tree from model outputs. The hierarchy is:

```
session.node
├── Output "Chairs"
│   ├── "Chair_1"
│   │   ├── "Seat"
│   │   └── "Leg"
│   └── "Chair_2"
│       ├── "Seat"
│       └── "Leg"
└── Output "Table"
    └── "TableTop"
```

Name filter patterns match against this hierarchy starting from the output name:

| Pattern               | Matches                                                               |
| :-------------------- | :-------------------------------------------------------------------- |
| `Chairs`              | The entire "Chairs" output node and its children                      |
| `Chairs.Chair_1`      | Only the "Chair_1" node under "Chairs"                                |
| `Chairs.Chair_1.Seat` | Only the "Seat" node inside "Chair_1"                                 |
| `Chairs.*.Seat`       | "Seat" nodes inside any direct child of "Chairs" (both chairs' seats) |
| `Chairs.Chair*`       | Any node under "Chairs" whose name starts with "Chair"                |
| `*`                   | All outputs (every top-level output node)                             |
| `*.*.Seat`            | Any "Seat" node two levels deep in any output                         |

---

## Library Utility Functions

The `@shapediver/viewer.features.interaction` package (CDN: `SDVInteractions`) exports
utility functions for converting and applying name filters. **Use these instead of writing
custom traversal code.**

| Function                        | Purpose                                                                              |
| :------------------------------ | :----------------------------------------------------------------------------------- |
| `convertUserDefinedNameFilters` | Converts `nameFilter` strings into `OutputNodeNameFilterPatterns` keyed by output ID |
| `gatherNodesForPattern`         | Traverses the scene tree and collects nodes matching a pattern                       |
| `addInteractionData`            | Adds `InteractionData` to a node with proper component scoping                       |
| `getNodesByName`                | Finds scene tree nodes across sessions by their dot-separated names                  |
| `checkNodeNameMatch`            | Checks if a single node matches a dot-separated name                                 |

---

## Using `nameFilter` with Interaction Features

The `nameFilter` controls which nodes are eligible for interaction. When present in
`param.settings`, use it to target specific nodes instead of making the entire session
node interactive.

### Reading `nameFilter` from Parameter Settings

```ts
import { isSelectionParameterApi } from "@shapediver/viewer";

const selectionParam = Object.values(session.parameters).find(
  isSelectionParameterApi,
);
if (selectionParam) {
  const nameFilter = selectionParam.settings?.nameFilter;
  // nameFilter is string[] | undefined
  // e.g., ["Chairs.Chair_1", "Chairs.Chair_2"]
}
```

The same pattern applies to all interaction parameter types:

- `isSelectionParameterApi(param)` → `param.settings.nameFilter`
- `isDraggingParameterApi(param)` → `param.settings.nameFilter`
- `isGumballTransformParameterApi(param)` → `param.settings.nameFilter`
- `isRectangleTransformParameterApi(param)` → `param.settings.nameFilter`

For dragging and gumball/rectangle transform, each object in `param.settings.objects` also
has its own `nameFilter` (a single string per object, not an array).

### Converting Name Filters to Patterns

Use `convertUserDefinedNameFilters` to convert the user-defined `nameFilter` strings
into patterns keyed by output ID. This maps the output name (first segment) to the
correct output ID.

```ts
import {
  convertUserDefinedNameFilters,
  gatherNodesForPattern,
  addInteractionData,
} from "@shapediver/viewer.features.interaction";

// Build an outputId → outputName mapping from the session
const outputIdsToNamesMapping = {};
Object.entries(session.outputs).forEach(([outputId, output]) => {
  outputIdsToNamesMapping[outputId] = output.name;
});

// Convert nameFilter strings into patterns grouped by output ID
const patterns = convertUserDefinedNameFilters(
  nameFilter, // string[] from param.settings.nameFilter
  outputIdsToNamesMapping,
);
// patterns: { [outputId]: NodeNameFilterPattern[] }
```

CDN: `SDVInteractions.convertUserDefinedNameFilters(...)`.

### Finding Nodes by Pattern

Use `gatherNodesForPattern` to traverse an output node's children and collect all
matching nodes:

```ts
for (const [outputId, outputPatterns] of Object.entries(patterns)) {
  const outputNode = session.outputs[outputId]?.node;
  if (!outputNode) continue;

  const availableNodes = {};
  for (const pattern of outputPatterns) {
    if (pattern.length === 0) {
      // Empty pattern = match the entire output node
      availableNodes[outputNode.id] = {
        node: outputNode,
        name: session.outputs[outputId].name,
      };
    } else {
      for (const child of outputNode.children) {
        gatherNodesForPattern(
          child,
          pattern,
          session.outputs[outputId].name,
          availableNodes,
          0, // start index
        );
      }
    }
  }

  // Add interaction data to each matched node
  Object.values(availableNodes).forEach(({ node }) => {
    addInteractionData(node, { select: true }, componentId);
  });
}
```

CDN: `SDVInteractions.gatherNodesForPattern(...)`, `SDVInteractions.addInteractionData(...)`.

### Finding Nodes by Name (for Restore / Gumball / Transform)

Use `getNodesByName` to find nodes across sessions by their dot-separated names
(e.g., when restoring selection state or creating a gumball on selected nodes):

```ts
import { getNodesByName } from "@shapediver/viewer.features.interaction";

// sessionApis = array of ISessionApi objects
const nodesAndNames = getNodesByName(sessionApis, selectedNodeNames);
// Returns: { node: ITreeNode, name: string }[]
```

CDN: `SDVInteractions.getNodesByName(...)`.

### Without `nameFilter` (Fallback)

When `nameFilter` is `undefined` or empty, apply `InteractionData` to the entire session
node. This makes all geometry interactive:

```ts
import { InteractionData } from "@shapediver/viewer.features.interaction";

session.node.data.push(new InteractionData({ select: true }));
session.node.updateVersion();
```

---

## Gotchas

- **Always read `nameFilter` from `param.settings`** — it is configured by the Grasshopper
  model author. Do not hardcode filter patterns.
- The first segment of each pattern is the **output name**, not a node name. Use
  `convertUserDefinedNameFilters` to resolve output names to output IDs.
- `*` matches a **single level** of the hierarchy, not multiple levels. `Chairs.*` matches
  direct children of "Chairs" but not grandchildren.
- Node names in the scene tree correspond to object names set via the ShapeDiver `name`
  attribute in Grasshopper (a reserved attribute).
- The same `nameFilter` mechanism is used across all interaction types — selection, dragging,
  gumball, rectangle transform, and restrictions.
- For dragging/gumball/rectangle, `param.settings.objects` contains per-object name filters
  (each a single string). Combine them with the top-level `nameFilter` array when needed.
- Use `addInteractionData` instead of manually pushing `new InteractionData()` — it handles
  component scoping (`restrictedManagers`) so multiple interaction parameters on the same
  model don't interfere with each other.

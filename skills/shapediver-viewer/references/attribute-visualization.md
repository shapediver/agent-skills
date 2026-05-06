# Attribute Visualization — Color-Code Geometry by Data

Visualize data attributes (analysis results, cost data, structural metrics) as color-coded
geometry overlays.

Uses `@shapediver/viewer.features.attribute-visualization` (NPM) or
`SDVAttributeVisualization` (CDN).

---

## What Are Attributes?

Attributes are **key-value pairs** that can be attached at every level of the
[scene tree](https://help.shapediver.com/doc/the-scene-tree). They are stored inside
[sdTF](https://github.com/shapediver/sdTF) data produced by the ShapeDiver Grasshopper
Plugin. The number and type of attributes does not have to be consistent across the scene
tree — they can be freely chosen by the model author.

Typical use cases: analysis results, cost data, structural metrics, material categories,
zone labels, or any custom per-geometry metadata the model author decides to expose.

Reference:

- Help page: <https://help.shapediver.com/doc/attribute-visualization>
- Full API docs: <https://viewer.shapediver.com/v3/latest/api/features/attribute-visualization/index.html>
- Interactive examples: <https://viewer.shapediver.com/v3/examples/index.html#attribute%20visualization>

---

## Prerequisites

- Set `loadSdtf: true` in session creation options.
- Use renderer type `RENDERER_TYPE.ATTRIBUTES`.

---

## Setup

```ts
import {
  AttributeVisualizationEngine,
  SDTF_TYPEHINT,
  ATTRIBUTE_VISUALIZATION,
} from "@shapediver/viewer.features.attribute-visualization";

const attrVizEngine = new AttributeVisualizationEngine(viewport);
```

CDN: `new SDVAttributeVisualization.AttributeVisualizationEngine(viewport)`.

---

## Configure Layers

```ts
attrVizEngine.layers["layerName"].opacity = 0.5;
attrVizEngine.layers["layerName"].color = "#ff0000";
attrVizEngine.updateLayers(attrVizEngine.layers);
```

---

## Define Attributes

```ts
attrVizEngine.updateAttributes([
  {
    key: "my_attribute",
    type: SDTF_TYPEHINT.STRING,
    visualization: ATTRIBUTE_VISUALIZATION.GREEN_WHITE_RED,
  },
]);
```

---

## Inspect Available Attributes

```ts
const overview = attrVizEngine.createSDTFOverview();
```

Returns a summary of all available attributes in the loaded sdTF data.

---

## Gotchas

- `loadSdtf: true` must be set when creating the session — it cannot be enabled after the
  fact. Without it, no attribute data is available.
- Layer names come from the model's sdTF data. Use `createSDTFOverview()` to discover
  available layers and attribute keys before configuring.
- The visualization palette (e.g., `GREEN_WHITE_RED`) maps attribute values to colors
  automatically. Choose a palette that matches the data semantics.

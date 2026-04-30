# Attribute Visualization — Color-Code Geometry by Data

Visualize data attributes (analysis results, cost data, structural metrics) as color-coded
geometry overlays.

Uses `@shapediver/viewer.features.attribute-visualization` (NPM) or
`SDVAttributeVisualization` (CDN).

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

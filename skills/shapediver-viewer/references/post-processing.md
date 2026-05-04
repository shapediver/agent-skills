# Post-Processing Effects

Post-processing applies visual effects to the rendered scene after initial drawing.
Access via `viewport.postProcessing` (`IPostProcessingApi`).

---

## Core API

### Add an effect

```ts
const token = viewport.postProcessing.addEffect({
  type: POST_PROCESSING_EFFECT_TYPE.BLOOM,
  properties: {
    intensity: 1.5,
    luminanceThreshold: 0.5,
  },
});
```

`addEffect()` returns a **token** (string) used to update, remove, or reference the effect.

### Update an effect

```ts
definition.properties.intensity = 3.0;
viewport.postProcessing.updateEffect(token, definition);
```

### Remove an effect

```ts
viewport.postProcessing.removeEffect(token);
```

### Remove all effects

```ts
for (const t in viewport.postProcessing.getEffectTokens())
  viewport.postProcessing.removeEffect(t);
```

### Get registered effect tokens

```ts
const tokens = viewport.postProcessing.getEffectTokens();
```

---

## Available Effects

All effect types are on the `POST_PROCESSING_EFFECT_TYPE` enum.

| Effect Type          | Enum Value                                         | Definition Interface                   |
| :------------------- | :------------------------------------------------- | :------------------------------------- |
| Bloom                | `POST_PROCESSING_EFFECT_TYPE.BLOOM`                | `IBloomEffectDefinition`               |
| Selective Bloom      | `POST_PROCESSING_EFFECT_TYPE.SELECTIVE_BLOOM`      | `ISelectiveBloomEffectDefinition`      |
| SSAO                 | `POST_PROCESSING_EFFECT_TYPE.SSAO`                 | `ISSAOEffectDefinition`                |
| HBAO                 | `POST_PROCESSING_EFFECT_TYPE.HBAO`                 | `IHBAOEffectDefinition`                |
| Depth of Field       | `POST_PROCESSING_EFFECT_TYPE.DEPTH_OF_FIELD`       | `IDepthOfFieldEffectDefinition`        |
| Outline              | `POST_PROCESSING_EFFECT_TYPE.OUTLINE`              | `IOutlineEffectDefinition`             |
| Vignette             | `POST_PROCESSING_EFFECT_TYPE.VIGNETTE`             | `IVignetteEffectDefinition`            |
| Chromatic Aberration | `POST_PROCESSING_EFFECT_TYPE.CHROMATIC_ABERRATION` | `IChromaticAberrationEffectDefinition` |
| Dot Screen           | `POST_PROCESSING_EFFECT_TYPE.DOT_SCREEN`           | `IDotScreenEffectDefinition`           |
| God Rays             | `POST_PROCESSING_EFFECT_TYPE.GOD_RAYS`             | `IGodRaysEffectDefinition`             |
| Grid                 | `POST_PROCESSING_EFFECT_TYPE.GRID`                 | `IGridEffectDefinition`                |
| Hue/Saturation       | `POST_PROCESSING_EFFECT_TYPE.HUE_SATURATION`       | `IHueSaturationEffectDefinition`       |
| Noise                | `POST_PROCESSING_EFFECT_TYPE.NOISE`                | `INoiseEffectDefinition`               |
| Pixelation           | `POST_PROCESSING_EFFECT_TYPE.PIXELATION`           | `IPixelationEffectDefinition`          |
| Scanline             | `POST_PROCESSING_EFFECT_TYPE.SCANLINE`             | `IScanlineEffectDefinition`            |
| Sepia                | `POST_PROCESSING_EFFECT_TYPE.SEPIA`                | `ISepiaEffectDefinition`               |
| Tilt Shift           | `POST_PROCESSING_EFFECT_TYPE.TILT_SHIFT`           | `ITiltShiftEffectDefinition`           |

All definition interfaces and the `POST_PROCESSING_EFFECT_TYPE` enum are exported from
`@shapediver/viewer` (NPM) or available as `SDV.POST_PROCESSING_EFFECT_TYPE` (CDN).

---

## Effect Properties Reference

### Bloom (`IBloomEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.BLOOM,
  properties: {
    blendFunction: BlendFunction.ADD,     // default: BlendFunction.ADD
    intensity: 1.0,                       // bloom intensity (default: 1.0)
    kernelSize: KernelSize.LARGE,         // blur kernel size (default: KernelSize.LARGE)
    luminanceSmoothing: 0.025,            // smoothness of luminance threshold [0,1] (default: 0.025)
    luminanceThreshold: 0.9,              // raise to mask darker elements [0,1] (default: 0.9)
    mipmapBlur: false,                    // enable mipmap blur (default: false)
  }
}
```

### Selective Bloom (`ISelectiveBloomEffectDefinition`)

Same properties as Bloom, plus:

- `ignoreBackground: true` — whether to ignore the background in bloom calculation (default: true)

After adding, use `viewport.postProcessing.selectiveBloomEffects[token].addSelection(node)`
to specify which scene nodes should bloom.

### SSAO (`ISSAOEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.SSAO,
  properties: {
    resolutionScale: 1,      // AO resolution scale (default: 1)
    spp: 8,                  // samples per pixel (default: 8)
    distance: 3,             // AO radius in world units (default: 3)
    distanceIntensity: 0.5,  // AO fade with distance (default: 0.5)
    intensity: 10,           // AO intensity via pow(ao, intensity) (default: 10)
    color: "#000000",        // AO color (default: black)
    iterations: 1,           // denoising iterations (default: 1)
    radius: 15,              // poisson disk radius (default: 15)
    rings: 4,                // poisson disk rings (default: 4)
    lumaPhi: 10,             // luma influence in denoising (default: 10)
    depthPhi: 2,             // depth influence in denoising (default: 2)
    normalPhi: 3.25,         // normal influence in denoising (default: 3.25)
    samples: 16,             // poisson disk samples (default: 16)
  }
}
```

### HBAO (`IHBAOEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.HBAO,
  properties: {
    intensity: 7,            // AO intensity (default: 7)
  }
}
```

### Depth of Field (`IDepthOfFieldEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.DEPTH_OF_FIELD,
  properties: {
    blendFunction: BlendFunction.NORMAL,  // default: BlendFunction.NORMAL
    bokehScale: 5.0,                      // scale of bokeh blur (default: 5.0)
    focusDistance: 0.0,                    // normalized focus distance [0,1] (default: 0.0)
    focusRange: 0.01,                     // focus range [0,1] (default: 0.01)
  }
}
```

### Outline (`IOutlineEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: BlendFunction.SCREEN,  // default: BlendFunction.SCREEN
    blur: false,                          // blur the outline (default: false)
    edgeStrength: 1,                      // edge strength (default: 1.0)
    hiddenEdgeColor: "#22090a",           // color of hidden edges (default: "#22090a")
    kernelSize: KernelSize.VERY_SMALL,    // blur kernel size (default: KernelSize.VERY_SMALL)
    multisampling: 0,                     // MSAA samples, requires WebGL 2 (default: 0)
    pulseSpeed: 0,                        // pulse animation speed, 0 = off (default: 0.0)
    visibleEdgeColor: "#ffffff",          // color of visible edges (default: "#ffffff")
    xRay: true,                           // show occluded parts (default: true)
  }
}
```

After adding, use `viewport.postProcessing.outlineEffects[token]` to manage selection:

- `.addSelection(node)` — add a scene tree node to the outline
- `.clearSelection()` — remove all nodes from the outline

### Vignette (`IVignetteEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.VIGNETTE,
  // properties are optional — defaults produce a standard vignette
}
```

### Hue/Saturation (`IHueSaturationEffectDefinition`)

```ts
{
  type: POST_PROCESSING_EFFECT_TYPE.HUE_SATURATION,
  properties: {
    saturation: -1,   // saturation adjustment (default: 0)
  }
}
```

---

## Imports (NPM)

```ts
import {
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
  // Type-specific definition interfaces:
  IBloomEffectDefinition,
  ISSAOEffectDefinition,
  IOutlineEffectDefinition,
  IDepthOfFieldEffectDefinition,
  // etc.
} from "@shapediver/viewer";
```

CDN: use `SDV.POST_PROCESSING_EFFECT_TYPE`, `SDV.BlendFunction`, `SDV.KernelSize`.

---

## CDN Example — Multiple Effects

```html
<canvas id="canvas" style="width:100%;height:100vh"></canvas>
<script
  src="https://viewer.shapediver.com/v3/latest/bundle.js"
  crossorigin="anonymous"
></script>
<script>
  (async () => {
    const viewport = await SDV.createViewport({
      id: "vp",
      canvas: document.getElementById("canvas"),
    });
    const session = await SDV.createSession({
      id: "session",
      ticket: "PASTE_YOUR_TICKET_HERE",
      modelViewUrl: "PASTE_YOUR_MODEL_VIEW_URL_HERE",
    });

    // Add bloom
    viewport.postProcessing.addEffect({
      type: SDV.POST_PROCESSING_EFFECT_TYPE.BLOOM,
      properties: { intensity: 1.5, luminanceThreshold: 0.5 },
    });

    // Add HBAO (ambient occlusion)
    viewport.postProcessing.addEffect({
      type: SDV.POST_PROCESSING_EFFECT_TYPE.HBAO,
      properties: { intensity: 7 },
    });

    // Add vignette
    viewport.postProcessing.addEffect({
      type: SDV.POST_PROCESSING_EFFECT_TYPE.VIGNETTE,
    });
  })();
</script>
```

---

## Outline with Interactions

Outline is commonly combined with selection interactions to highlight selected objects:

```ts
import {
  createViewport,
  createSession,
  addListener,
  POST_PROCESSING_EFFECT_TYPE,
  BlendFunction,
  KernelSize,
  EVENTTYPE,
  IOutlineEffectDefinition,
} from "@shapediver/viewer";
import {
  InteractionEngine,
  SelectManager,
  addInteractionData,
  IDragEvent,
} from "@shapediver/viewer.features.interaction";

const viewport = await createViewport({ id: "vp", canvas });
const session = await createSession({ id: "session", ticket, modelViewUrl });

// Add outline effect
const outlineDef: IOutlineEffectDefinition = {
  type: POST_PROCESSING_EFFECT_TYPE.OUTLINE,
  properties: {
    blendFunction: BlendFunction.ALPHA,
    blur: true,
    edgeStrength: 10,
    kernelSize: KernelSize.LARGE,
    visibleEdgeColor: "#ffffff",
    hiddenEdgeColor: "#ffffff",
    xRay: true,
  },
};
const outlineToken = viewport.postProcessing.addEffect(outlineDef);

// Set up selection with componentId scoping
const componentId = "outline-selection"; // unique identifier for this interaction
const engine = new InteractionEngine(viewport);
const selectManager = new SelectManager(componentId);
engine.addInteractionManager(selectManager);

for (const child of session.node.children) {
  addInteractionData(child, { select: true }, componentId);
}

// Highlight selected node with outline
addListener(EVENTTYPE.INTERACTION.SELECT_ON, (e) => {
  const event = e as IDragEvent;
  viewport.postProcessing.outlineEffects[outlineToken].clearSelection();
  viewport.postProcessing.outlineEffects[outlineToken].addSelection(event.node);
});
```

---

## Manual / Custom Post-Processing

For full control, enable manual mode and use the `postprocessing` library directly:

```ts
import { EffectPass, RenderPass } from "postprocessing";

viewport.postProcessing.manualPostProcessing = true;

const composer = viewport.postProcessing.effectComposer!;
const scene = viewport.threeJsCoreObjects.scene;
const camera = viewport.threeJsCoreObjects.camera;

composer.addPass(new RenderPass(scene, camera));
// Add any postprocessing library effect:
composer.addPass(new EffectPass(camera, myCustomEffect));
```

This disables the built-in effect pipeline and gives you direct access to the
[postprocessing](https://github.com/pmndrs/postprocessing) library's `EffectComposer`.

---

## Official Examples

- [Effect Preview](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effect_preview/example.html) — multiple built-in effects
- [Custom Effect](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/custom_effect/example.html) — custom shader effect
- [Direct Access](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/direct_access/example.html) — manual EffectComposer
- [Effects and Interaction](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects_and_interaction/example.html) — outline + selection
- [Remove Default Effect](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/remove_default_effect/example.html) — clear all effects
- Individual effects: [Bloom](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/bloom/example.html), [SSAO](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/ssao/example.html), [HBAO](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/hbao/example.html), [Depth of Field](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/depth_of_field/example.html), [Outline](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/outline/example.html), [Selective Bloom](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/selective_bloom/example.html), [Vignette](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/vignette/example.html), [Chromatic Aberration](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/chromatic_abberation/example.html), [Dot Screen](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/dot_screen/example.html), [God Rays](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/god_rays/example.html), [Grid](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/grid/example.html), [Hue/Saturation](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/hue_saturation/example.html), [Noise](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/noise/example.html), [Pixelation](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/pixelation/example.html), [Scanline](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/scanline/example.html), [Sepia](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/sepia/example.html), [Tilt Shift](https://viewer.shapediver.com/v3/examples/examples/viewport/post_processing/effects/tilt_shift/example.html)

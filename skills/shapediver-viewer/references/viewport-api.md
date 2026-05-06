# Viewport API (`IViewportApi`)

Create the viewport before the session so geometry renders immediately.

### Creation & Lifecycle

```ts
const viewport = await SDV.createViewport({
  id: "vp",
  canvas: canvasRef.current,
});
viewport.close(); // destroys WebGL context
```

- **`viewport.id`**: unique identifier (read-only).
- **`viewport.canvas`**: the canvas element (read-only).
- **`viewport.isBusy`**: `true` while processing (read-only).

### Camera

- **`viewport.camera`**: current `ICameraApi`.
- **`viewport.cameras`**: dictionary of all cameras.
- **`viewport.createPerspectiveCamera(id?)`** / **`viewport.createOrthographicCamera(id?)`**.
- **`viewport.createOrthographicCamera(id?)`**: create an orthographic camera. Set `camera.direction` to `ORTHOGRAPHIC_CAMERA_DIRECTION.TOP`, `.FRONT`, `.LEFT`, etc.
- **`viewport.assignCamera(id)`** / **`viewport.removeCamera(id)`**.
- **`camera.animate(keyframes, options?)`**: animate through `{ position, target }` keyframes. `options`: `{ duration: ms }`.
- **`camera.zoomTo(nodes?)`**: zoom to fit nodes or entire scene.
- **`camera.reset(duration?)`**: reset to default position/target.
- **`camera.defaultPosition`** / **`camera.defaultTarget`**: default camera values (read-only).
- **`camera.position`** / **`camera.target`**: current camera position/target (read/write).

#### Camera Restrictions

Restrict how end users can navigate the 3D scene. Common for configurators that
need a controlled viewing experience.

| Property                     | Type                                                                     | Description                                                 |
| :--------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------- |
| `camera.enableZoom`          | `boolean`                                                                | Enable/disable scroll-to-zoom (default: `true`)             |
| `camera.enableRotation`      | `boolean`                                                                | Enable/disable orbit rotation (default: `true`)             |
| `camera.enablePan`           | `boolean`                                                                | Enable/disable panning (default: `true`)                    |
| `camera.enableAutoRotation`  | `boolean`                                                                | Auto-rotate the camera around the target (default: `false`) |
| `camera.autoRotationSpeed`   | `number`                                                                 | Rotation speed when auto-rotation is enabled                |
| `camera.zoomRestriction`     | `{ minDistance?, maxDistance? }`                                         | Min/max zoom distances                                      |
| `camera.rotationRestriction` | `{ minPolarAngle?, maxPolarAngle?, minAzimuthAngle?, maxAzimuthAngle? }` | Orbit angle limits (radians)                                |

```ts
// Lock zoom range and vertical rotation
const camera = viewport.camera;
camera.enablePan = false;
camera.zoomRestriction = { minDistance: 50, maxDistance: 300 };
camera.rotationRestriction = {
  minPolarAngle: Math.PI / 6,
  maxPolarAngle: Math.PI / 2,
};
```

```ts
// Auto-rotate (turntable) for showcase / hero shots
camera.enableAutoRotation = true;
camera.autoRotationSpeed = 1.0;
```

```ts
// Switch between perspective and orthographic cameras
const orthoTop = viewport.createOrthographicCamera();
orthoTop.direction = SDV.ORTHOGRAPHIC_CAMERA_DIRECTION.TOP;
viewport.assignCamera(orthoTop.id); // switch to top view
viewport.assignCamera(viewport.cameras["default"].id); // switch back
```

### Environment & Appearance

- **`viewport.environmentMap`**: HDR map URL or preset from `ENVIRONMENT_MAP`.
- **`viewport.environmentMapAsBackground`** / **`viewport.environmentMapBlurriness`** / **`viewport.environmentMapIntensity`**.
- **`viewport.clearColor`** / **`viewport.clearAlpha`**: background color/alpha.
- **`viewport.gridVisibility`** / **`viewport.gridColor`**: grid display.
- **`viewport.groundPlaneVisibility`** / **`viewport.groundPlaneColor`** / **`viewport.groundPlaneShadowVisibility`**.

### Branding, Spinner & Visibility

- **`viewport.logo`**: set to `null` to remove the ShapeDiver logo, or set to a custom image URL.
- **`viewport.logoBackgroundColor`** / **`viewport.logoBackgroundOpacity`**: customize logo background.
- **`viewport.busyModeDisplay`**: controls the loading spinner appearance.
- **`viewport.show`** / **`viewport.hide`**: programmatically show/hide the viewport canvas overlay.

```ts
// Remove default logo
viewport.logo = null;

// Custom logo
viewport.logo = "https://example.com/my-logo.png";

// Transparent background
viewport.clearColor = "#ffffff";
viewport.clearAlpha = 0;

// Hide grid and ground plane
viewport.gridVisibility = false;
viewport.groundPlaneVisibility = false;
```

### Color Management

Colors in the viewer use linear color space internally. The `automaticColorAdjustment`
setting (default: enabled since v2.7.0) automatically converts hex/string colors from
sRGB to linear. When providing colors as numbers, they are assumed to already be linear.

- **`viewport.automaticColorAdjustment`**: `boolean` — auto-convert sRGB string colors to linear.
- **`viewport.textureEncoding`**: color space for `map` and `emissiveMap` textures.
- **`viewport.outputEncoding`**: color space for the final rendered output.

If colors from `<input type="color">` look different in the viewer, `automaticColorAdjustment`
handles this automatically. Only disable if you are providing pre-linearized colors.

### Lighting

- **`viewport.lights`** / **`viewport.shadows`** / **`viewport.softShadows`**: enable/disable.
- **`viewport.lightScene`** / **`viewport.lightScenes`**: current and all light scenes.
- **`viewport.createLightScene()`** / **`viewport.assignLightScene(id)`**: manage light scenes.
- Light scenes support ambient, directional, point, and spot lights.

### Screenshots

- **`viewport.getScreenshot(type?, quality?)`**: returns data URL (default `image/png`).
- **`viewport.getScreenshotAdvanced(type?, quality?, resolution?, camera?)`**: custom resolution.

### Three.js Access

- **`viewport.threeJsCoreObjects`**: `{ camera, renderer, scene }` — direct three.js objects.

### Raycasting

- **`viewport.pointerEventToRay(event)`**: converts PointerEvent to `{ origin, direction }`.
- **`viewport.raytraceScene(origin, direction, filterCriteria?)`**: sorted intersections.
- **`viewport.convert3Dto2D(point)`**: 3D → 2D coordinate conversion.

### Rendering & Resize

- **`viewport.maximumRenderingSize`** / **`viewport.automaticResizing`** / **`viewport.resize(w, h)`**.
- **`viewport.toneMapping`** / **`viewport.toneMappingExposure`**.
- **`viewport.pauseRendering()`** / **`viewport.continueRendering()`** / **`viewport.render()`**.

### AR (Augmented Reality)

- **`viewport.viewableInAR()`** / **`viewport.viewInAR(node?)`** / **`viewport.createArSessionLink(...)`**.
- See [AR docs](https://help.shapediver.com/doc/augmented-reality) for full reference.

### Scene Tree Updates

- **`viewport.update()`**: process pending scene tree changes.
- **`viewport.updateNode(node)`** / **`viewport.updateNodeTransformation(node)`**.
- **`viewport.updateEnvironmentGeometry()`**: reposition grid/ground to bounding box.

### Post-Processing

- **`viewport.postProcessing`**: access to `IPostProcessingApi`.
- Effects: Bloom, Depth of Field, SSAO, HBAO, Outline, Vignette, Selective Bloom, and more.
- See [post-processing.md](post-processing.md) for full API, all effect types with properties, and code examples.

# glTF Loader — Loading External glTFs

Reference: <https://help.shapediver.com/doc/gltf-loader>

ShapeDiver uses the [glTF format](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) to transfer geometric data between servers and the viewer. You can enrich the scene coming from Grasshopper with external glTF/glb assets using the `DataEngine` API.

## Loading External glTFs

Use `DataEngine.instance.loadContent()` to load an external glTF or glb file into the scene:

```ts
const dataEngine: DataEngine = DataEngine.instance;
dataEngine.loadContent({
  format: "gltf",
  href: "https://example.com/model.glb",
});
```

### CDN Usage

```html
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

    // Load an external glTF/glb
    const dataEngine = SDV.DataEngine.instance;
    dataEngine.loadContent({
      format: "gltf",
      href: "https://example.com/model.glb",
    });
  })();
</script>
```

### NPM Usage

```ts
import { DataEngine } from "@shapediver/viewer";

const dataEngine = DataEngine.instance;
dataEngine.loadContent({
  format: "gltf",
  href: "https://example.com/model.glb",
});
```

## API Reference

- [`DataEngine.loadContent()`](https://viewer.shapediver.com/v3/latest/api/classes/DataEngine.html#loadContent)

## glTF Preview Tool

To preview how a glTF will look in the ShapeDiver viewer, use: <https://viewer.shapediver.com/v3/latest/gltf/index.html>

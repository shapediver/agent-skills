# HTML Anchor Elements — Overlay UI on 3D Scene

Attach HTML elements (labels, images, custom content) to 3D positions. They follow the
projected 2D position as the camera moves.

Uses `@shapediver/viewer` (NPM) or `SDV` (CDN) — no extra packages needed.

---

## Text Label

```ts
import { HTMLElementAnchorTextData, IAnchorDataText } from "@shapediver/viewer";

const anchorText = new HTMLElementAnchorTextData({
  location: [-50, 0, 0],
  data: { color: "#ff0000", text: "Label Here" } as IAnchorDataText,
});
sceneTree.root.data.push(anchorText);
sceneTree.root.updateVersion();
```

CDN: `new SDV.HTMLElementAnchorTextData({ ... })`.

---

## Image Anchor

```ts
import {
  HTMLElementAnchorImageData,
  IAnchorDataImage,
} from "@shapediver/viewer";

const anchorImage = new HTMLElementAnchorImageData({
  location: [0, 50, 0],
  data: {
    alt: "an image",
    src: "./icon.png",
    width: 58,
    height: 28,
  } as IAnchorDataImage,
});
sceneTree.root.data.push(anchorImage);
sceneTree.root.updateVersion();
```

CDN: `new SDV.HTMLElementAnchorImageData({ ... })`.

---

## Custom Data Anchors

For fully custom HTML content (buttons, tooltips, complex UI), use custom data anchors.
See [HTML Anchor docs](https://help.shapediver.com/doc/html-elements).

---

## Gotchas

- Always call `sceneTree.root.updateVersion()` after pushing anchor data — without it, the
  anchors won't render.
- The `location` is in model coordinates (3D world space), not screen pixels.
- Anchors are overlaid on the canvas — they don't participate in 3D depth testing. They will
  always appear on top of the 3D scene.
- To remove an anchor, remove it from `sceneTree.root.data` and call `updateVersion()` again.

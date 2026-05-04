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

## Custom Data Anchors — Buttons, UI Controls, Custom HTML

Use `HTMLElementAnchorCustomData` for fully custom HTML attached to 3D positions.
This is the key tool for placing **UI elements** (buttons, controls, parameter widgets)
directly in the 3D scene, anchored to objects.

A custom anchor requires two callbacks:

- **`create`** — called once when the anchor is first rendered. Build your DOM elements here.
- **`update`** — called every render frame. Position the element and handle visibility.

### Basic Custom Button

```ts
import {
  HTMLElementAnchorData,
  HTMLElementAnchorCustomData,
  IHTMLElementAnchorUpdateProperties,
  sceneTree,
} from "@shapediver/viewer";

// Called once to create the HTML element
const create = (properties: {
  anchor: HTMLElementAnchorData;
  parent: HTMLDivElement;
}) => {
  const btn = document.createElement("button");
  btn.textContent = properties.anchor.data.btnText;
  btn.style.pointerEvents = "auto";
  btn.style.cursor = "pointer";
  btn.onclick = () => alert(properties.anchor.data.clickMsg);
  properties.parent.appendChild(btn);
};

// Called every frame to position the element
const update = (properties: IHTMLElementAnchorUpdateProperties) => {
  properties.htmlElement.style.display = properties.hidden ? "none" : "";
  const x = properties.container[0] - properties.htmlElement.offsetWidth / 2;
  const y = properties.container[1] - properties.htmlElement.offsetHeight / 2;
  properties.htmlElement.style.left = x / properties.scale[0] + "px";
  properties.htmlElement.style.top = y / properties.scale[1] + "px";
};

const anchor = new HTMLElementAnchorCustomData({
  location: [50, 0, 0],
  data: { btnText: "Click me", clickMsg: "Hello!" },
  create,
  update,
});
sceneTree.root.data.push(anchor);
sceneTree.root.updateVersion();
```

CDN: `new SDV.HTMLElementAnchorCustomData({ ... })`.

### In-Scene UI Controls (e.g., +/- buttons to change parameters)

Anchors can be placed relative to object bounding boxes and wired to parameter changes.
Use `output.updateCallback` to reposition anchors after each customization.

```ts
import {
  HTMLElementAnchorCustomData,
  IHTMLElementAnchorUpdateProperties,
  HTMLElementAnchorData,
  TreeNode,
  ITreeNode,
  sceneTree,
} from "@shapediver/viewer";
import { vec3 } from "gl-matrix";

// create / update callbacks (same pattern as above)
const create = (properties: {
  anchor: HTMLElementAnchorData;
  parent: HTMLDivElement;
}) => {
  const img = properties.anchor.data.image as HTMLImageElement;
  img.style.pointerEvents = properties.anchor.data.active ? "auto" : "none";
  img.style.opacity = properties.anchor.data.active ? "1" : "0.5";
  img.style.cursor = properties.anchor.data.active ? "pointer" : "not-allowed";
  if (properties.anchor.data.active) {
    img.onclick = properties.anchor.data.onclick;
  }
  properties.parent.appendChild(img);
};

const update = (properties: IHTMLElementAnchorUpdateProperties) => {
  properties.htmlElement.style.display = properties.hidden ? "none" : "";
  const x = properties.container[0] - properties.htmlElement.offsetWidth / 2;
  const y = properties.container[1] - properties.htmlElement.offsetHeight / 2;
  properties.htmlElement.style.left = x / properties.scale[0] + "px";
  properties.htmlElement.style.top = y / properties.scale[1] + "px";
};

// Setup: add +/- buttons anchored to bounding box edges
const lengthParam = session.getParameterByName("Length")[0];
const shelfOutput = session.getOutputByName("Shelf")[0];

const htmlNode = new TreeNode("htmlElements");
sceneTree.root.addChild(htmlNode);
sceneTree.root.updateVersion();

const plusImg = document.createElement("img");
plusImg.src = "./images/circle_add.svg";
plusImg.width = 35;
plusImg.height = 35;

const minusImg = document.createElement("img");
minusImg.src = "./images/circle_remove.svg";
minusImg.width = 35;
minusImg.height = 35;

const updateCallback = (newNode?: ITreeNode) => {
  if (!newNode) return;
  // Clear previous anchors
  while (htmlNode.data.length > 0) htmlNode.data.pop();

  const bb = newNode.boundingBox;
  const center = bb.boundingSphere.center;
  const offset = 5;

  // Plus button on the left
  htmlNode.data.push(
    new HTMLElementAnchorCustomData({
      location: vec3.fromValues(bb.min[0] - offset, center[1], center[2]),
      data: {
        image: plusImg,
        onclick: () => {
          lengthParam.value = (lengthParam.value as number) + 1;
          session.customize(undefined, undefined, true);
        },
        active: (lengthParam.value as number) < lengthParam.max!,
      },
      create,
      update,
    }),
  );

  // Minus button on the right
  htmlNode.data.push(
    new HTMLElementAnchorCustomData({
      location: vec3.fromValues(bb.max[0] + offset, center[1], center[2]),
      data: {
        image: minusImg,
        onclick: () => {
          lengthParam.value = (lengthParam.value as number) - 1;
          session.customize(undefined, undefined, true);
        },
        active: (lengthParam.value as number) > lengthParam.min!,
      },
      create,
      update,
    }),
  );

  htmlNode.updateVersion();
};

shelfOutput.updateCallback = updateCallback;
updateCallback(shelfOutput.node);
```

### Full Parameter UI Anchored to a 3D Object

You can anchor a complete parameter UI panel to a scene object. Create your controls
inside the `create` callback, then position the container in `update`.

```ts
const create = (properties: {
  anchor: HTMLElementAnchorData;
  parent: HTMLDivElement;
}) => {
  const uiDiv = document.createElement("div");
  uiDiv.style.position = "absolute";
  uiDiv.style.pointerEvents = "auto";
  // Build your UI controls here using properties.anchor.data.session
  // e.g., sliders, dropdowns, buttons
  createUi(properties.anchor.data.session, uiDiv);
  properties.parent.appendChild(uiDiv);
};

// Anchor to the top-right of an output's bounding box
const output = session.getOutputByName("Tower")[0];
output.updateCallback = (newNode?: ITreeNode) => {
  if (!newNode) return;
  while (htmlNode.data.length > 0) htmlNode.data.pop();

  const bb = newNode.boundingBox;
  const center = bb.boundingSphere.center;
  const offset = 5;

  htmlNode.data.push(
    new HTMLElementAnchorCustomData({
      location: vec3.fromValues(
        bb.max[0] + offset,
        center[1],
        bb.max[2] + offset,
      ),
      data: { session },
      create,
      update,
    }),
  );
  htmlNode.updateVersion();
};
output.updateCallback(output.node);
```

### Key Points for Custom Anchors

- **`data`** can be any object — it carries your custom payload (session reference, labels,
  images, callbacks, state flags) into the `create`/`update` callbacks.
- Set `pointerEvents = "auto"` on interactive elements — the anchor container defaults to
  `pointerEvents: none`.
- In `update`, use `properties.container` (the projected 2D position) and `properties.scale`
  (the CSS scale factor) to compute pixel coordinates.
- Use `properties.hidden` to hide anchors when behind the camera.
- Use `output.updateCallback` to re-create anchors after customization so they
  follow the updated geometry bounding box.
- Pass `waitForViewportUpdate = true` (third arg to `session.customize()`) when you
  need the updated bounding box before repositioning anchors.

---

## Additional Examples

More examples on the [viewer examples page — HTML Anchors section](https://viewer.shapediver.com/v3/examples/index.html#html%20anchors):

- **All Types** — text, image, and custom button anchors together
- **UI With Anchor** — full parameter UI panel attached to a 3D object
- **Size Change With Anchors** — +/- buttons to change a parameter, positioned at bounding box edges
- **Attributes With Anchor** — display attribute data via anchors

Official docs: [HTML Elements](https://help.shapediver.com/doc/html-elements)

---

## Gotchas

- Always call `sceneTree.root.updateVersion()` after pushing anchor data — without it, the
  anchors won't render.
- The `location` is in model coordinates (3D world space), not screen pixels.
- Anchors are overlaid on the canvas — they don't participate in 3D depth testing. They will
  always appear on top of the 3D scene.
- To remove an anchor, remove it from `sceneTree.root.data` and call `updateVersion()` again.

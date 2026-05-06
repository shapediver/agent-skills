# Augmented Reality (AR)

Reference: <https://help.shapediver.com/doc/augmented-reality-ar>

Display 3D models in the real world using AR on supported devices. The Viewer API provides
methods to check AR availability, launch AR directly, or generate a QR code link for
cross-device AR sessions.

## Basic Usage

Check if the device supports AR, then either launch directly or show a QR code:

```ts
const token = viewport.addFlag(FLAG_TYPE.BUSY_MODE);
if (viewport.viewableInAR()) {
  await viewport.viewInAR();
} else {
  const qr = await viewport.createArSessionLink(undefined, true);
  const image = new Image();
  image.src = qr;
  image.style.position = "absolute";
  image.style.bottom = "0%";
  document.body.appendChild(image);
}
viewport.removeFlag(token);
```

### Key Methods

| Method                                        | Description                                                                  |
| :-------------------------------------------- | :--------------------------------------------------------------------------- |
| `viewport.viewableInAR()`                     | Returns `true` if the current device supports AR                             |
| `viewport.viewInAR()`                         | Opens the current scene in AR on a supported device                          |
| `viewport.createArSessionLink(token?, asQR?)` | Creates an AR session link. Pass `true` for `asQR` to get a QR code data URL |

### Imports (CDN)

```html
<script
  src="https://viewer.shapediver.com/v3/latest/bundle.js"
  crossorigin="anonymous"
></script>
```

Use `SDV.FLAG_TYPE.BUSY_MODE` for the busy flag.

### Imports (NPM)

```ts
import { FLAG_TYPE } from "@shapediver/viewer";
```

## Scene Setup for AR

To get AR rendering close to the viewer rendering:

1. Use an HDR environment map, preferably one that looks close to the default area
   where you want to display AR models.
2. Set the texture and output encoding to `srgb` and enable the physically correct
   light setting.
3. Use as few lights as possible — lights are not used in AR, so they change the
   rendering result noticeably.

## Additional Examples

See the [viewer examples — augmented reality section](https://viewer.shapediver.com/v3/examples/index.html#augmented%20reality).

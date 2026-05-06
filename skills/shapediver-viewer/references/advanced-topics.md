# Advanced Topics — Environment, Multi-Model, Performance

---

## Development Environment & Security

### Domain Whitelisting

If you get HTTP 403 on session creation, the domain isn't whitelisted. Add it in the model's
Embedding Settings on the ShapeDiver platform:

- Include port for non-standard ports (e.g. `localhost:3000`)
- Subdomains must be added individually
- Local domains don't count toward domain limit

**LLM coding environments (Bolt, Replit, CodeSandbox, etc.):** The preview runs on a dynamic
subdomain. Add a wildcard entry `*.base-domain` (e.g. `*.webcontainer-api.io`). If the
platform doesn't allow it, post on the [ShapeDiver Forum](https://forum.shapediver.com/).

### JWT (Strong Authorization)

When enabled, use `session.setJwtToken()` and `session.refreshJwtToken` callback. See
[API Authorization docs](https://help.shapediver.com/doc/api-authorization).

### Testing Locally

Open via an HTTP server, not `file://`:

- `npx serve` or `python3 -m http.server 8080`

The `file://` protocol causes cosmetic browser warnings but doesn't affect API calls.

---

## Initial Parameters on Session Creation

Set parameter values in the `createSession` call to send them with the initial request,
avoiding a second round-trip. Useful when you know the starting configuration from a URL
parameter, saved state, or user preference.

```ts
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  initialParameterValues: {
    Length: 1500,
    "Material Color": "#00ff00",
  },
});
```

This sends the specified parameter values with the very first computation request. Without
this, the session loads with model defaults, and you'd need a second `customize()` call.

---

## Multiple Sessions & Multiple Viewports

### Multiple Sessions in One Viewport

Load two or more models into the same 3D scene. Each session manages its own parameters,
outputs, and exports independently. All sessions share the same viewport and camera.

```ts
const viewport = await SDV.createViewport({
  id: "vp",
  canvas: document.getElementById("canvas"),
});

const sessionA = await SDV.createSession({
  id: "model-A",
  ticket: TICKET_A,
  modelViewUrl: MODEL_VIEW_URL_A,
});

const sessionB = await SDV.createSession({
  id: "model-B",
  ticket: TICKET_B,
  modelViewUrl: MODEL_VIEW_URL_B,
});

// Each session has independent parameters
sessionA.getParameterByName("Length")[0].value = 10;
await sessionA.customize();

// Clean up both sessions
sessionA.close();
sessionB.close();
viewport.close();
```

### Multiple Viewports

Show the same model from different angles or with different rendering settings.
Each viewport needs its own canvas element and can have independent cameras,
post-processing, and environment settings.

```ts
const viewportFront = await SDV.createViewport({
  id: "front-view",
  canvas: document.getElementById("canvas-front"),
});

const viewportTop = await SDV.createViewport({
  id: "top-view",
  canvas: document.getElementById("canvas-top"),
});

// Set top viewport to orthographic top-down camera
const topCamera = viewportTop.createOrthographicCamera();
topCamera.direction = SDV.ORTHOGRAPHIC_CAMERA_DIRECTION.TOP;
viewportTop.assignCamera(topCamera.id);

const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
});
// Session geometry appears in all viewports automatically
```

---

## Progress Events

Track loading and customization progress for loading indicators and progress bars.

```ts
import { addListener, EVENTTYPE } from "@shapediver/viewer";

// Fires during initial model loading and customizations
addListener(EVENTTYPE.SESSION.SESSION_INITIAL_OUTPUTS_LOADED, (e) => {
  console.log("Initial outputs loaded");
  hideLoadingSpinner();
});

// Track when the viewport is busy (processing scene updates)
addListener(EVENTTYPE.VIEWPORT.BUSY_MODE_ON, () => {
  showBusyIndicator();
});

addListener(EVENTTYPE.VIEWPORT.BUSY_MODE_OFF, () => {
  hideBusyIndicator();
});

// Track customization lifecycle
addListener(EVENTTYPE.SESSION.SESSION_CUSTOMIZED, (e) => {
  console.log("Customization complete");
});
```

CDN: `SDV.addListener(SDV.EVENTTYPE.SESSION.SESSION_CUSTOMIZED, ...)`.

---

## Performance Tips

- **Batch parameter changes:** Set multiple `param.value` before calling `customize()` once.
  Each `customize()` is a server round-trip.
- **Debounce rapid changes:** For text inputs, commit on `onBlur` rather than every keystroke.
- **Use `cancelCustomization()`:** When the user changes a parameter while a previous
  customization is still in-flight, cancel the old one to avoid processing stale results.
- **`customizeParallel()` for preview:** Runs a computation without replacing the current
  scene. Useful for "what-if" previews or pre-caching.
- **`initialParameterValues`:** Set known starting values at session creation to skip the
  default-then-update round-trip.
- **Use `output.freeze = true`:** After material overrides, freeze the output to prevent
  server updates from resetting your local changes.
- **Pause rendering:** Use `viewport.pauseRendering()` during bulk scene tree operations,
  then `viewport.continueRendering()`.
- **Fixed CDN version:** Use a pinned version (e.g., `v3/2.20.0/bundle.js`) instead of
  `latest` in production to avoid unexpected changes.

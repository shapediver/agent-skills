# ShapeDiver Viewer — Troubleshooting Reference

This file covers advanced troubleshooting scenarios beyond the quick-reference
table in [advanced-patterns.md](advanced-patterns.md#troubleshooting--common-issues).
Check that table first for common errors.

---

## Session & Initialization Issues

### CORS / Domain Whitelisting

**Symptom:** HTTP 403 on `createSession()` or ticket validation.

**Root cause:** The domain serving your app is not whitelisted in the model's
embedding settings on the ShapeDiver platform.

**Fix:**

1. Go to your model on shapediver.com → Edit → Developers tab.
2. Add your domain (e.g., `localhost:3000`, `myapp.example.com`) to the allowed domains.
3. For backend/server use, use a **backend ticket** instead of an embedding ticket.

### Session Creation Fails Silently

**Symptom:** `createSession()` resolves but the viewport stays blank.

**Possible causes:**

- `automaticSceneUpdate` was set to `false` — geometry won't load until you
  call `session.customize()`.
- Canvas element not in the DOM when viewport was created (conditional rendering).
  The canvas must always be present.
- WebGL context lost due to too many active contexts (browser limit ~8–16).

### Multiple Sessions on One Viewport

Creating multiple sessions on the same viewport is supported. Each session adds
its geometry to the scene. Common pitfalls:

- Parameter Names can collide if both models have parameters with the same Name.
  Use `session.parameters` scoped to each session object.
- Closing one session removes only that session's geometry.
- If the viewport canvas is small or hidden, both models may be clipped.

---

## Parameter Issues

### File Parameter Upload Fails

**Symptom:** Error on `customize()` after setting a file parameter.

**Possible causes:**

- File exceeds the model's maximum upload size.
- MIME type not in `param.format` — check `param.format` for accepted types.
- `param.value` set to a string path instead of a `File` or `Blob` object.

### Parameter Validation

Always validate before committing:

```ts
const result = param.isValid(candidateValue, true); // throws descriptive error if invalid
```

Common validation failures:

- Int/Float out of `min`/`max` range.
- StringList index out of bounds (must be `"0"`, `"1"`, ...).
- Color missing `#` prefix or wrong length.

### Customize Shorthand vs param.value

Two ways to set parameters:

```ts
// 1. Shorthand — pass by name
await session.customize({ Length: 1500 });

// 2. Step-by-step — pass by param object
param.value = toSDValue(param, rawValue);
await session.customize();
```

If the shorthand doesn't work, verify the parameter name matches exactly
(case-sensitive, including spaces).

---

## Viewport & Rendering Issues

### Blank Canvas / No 3D Content

**Checklist:**

1. Canvas element exists in the DOM before `createViewport()`.
2. Canvas has non-zero width and height (CSS `width: 100%; height: 100vh`).
3. No JavaScript errors in console.
4. Model ticket and modelViewUrl are correct.
5. `automaticSceneUpdate` is not `false`.

### WebGL Context Lost

**Symptom:** Canvas goes black, console shows "WebGL context lost".

**Causes:**

- Too many WebGL contexts active (browser limit). Close unused viewports.
- GPU driver crash. Reduce model complexity or disable post-processing.
- React 18 Strict Mode creating double viewports in development.

**Fix for React Strict Mode:**

```ts
useEffect(() => {
  if (sessionRef.current) return; // Prevent double init
  sessionRef.current = true;
  // ... create viewport and session ...
}, []);
```

### Post-Processing Effects Not Showing

- Ensure `viewport.postProcessing` is enabled.
- Some effects require specific WebGL extensions. Check `viewport.webGLCapabilities`.
- Outline effects need `POST_PROCESSING_EFFECT_TYPE.OUTLINE` from `@shapediver/viewer`.

### Camera Not Responding

- Check if `viewport.camera.enableRotation`, `.enableZoom`, `.enablePan` are
  all `true` (they are by default).
- If restrictions are set (`zoomRestriction`, `rotationRestriction`), they may
  prevent certain movements.

---

## Interaction Issues

### Selection Not Working

**Checklist:**

1. `InteractionEngine` created for the viewport.
2. `InteractionData` added to the correct nodes (with matching `componentId`).
3. `SelectManager` created with the same `componentId`.
4. Nodes exist in the scene tree (output has loaded).

### Multiple Interactions Interfering

If you have multiple selection parameters, each must use a unique `componentId`.
Without `componentId` scoping, all managers respond to all interaction data.
See [interactions-selection.md](interactions-selection.md#simple-vs-component-scoped-constructor-styles).

### Hover Effect Not Showing

Always create a `HoverManager` alongside `SelectManager`. Without it, users
have no visual feedback that geometry is interactive.

---

## Export Issues

### Export Returns Empty Content

- Exports must be explicitly requested with `export.request()`.
- Simply accessing `session.exports` only gives you the export definition, not the file.
- After `request()`, the result `content` array contains download URLs.

### Export Download URL Expired

Export URLs are temporary. Download immediately after `request()` completes.
Don't store URLs for later use.

---

## Framework-Specific Issues

### Next.js / SSR

ShapeDiver Viewer requires browser APIs (`window`, `document`, WebGL).
Dynamic-import inside `useEffect`:

```ts
useEffect(() => {
  (async () => {
    const { createSession, createViewport } =
      await import("@shapediver/viewer");
    // ... init ...
  })();
}, []);
```

### React 18 Strict Mode

Development mode runs effects twice. Guard with a ref:

```ts
const initialized = useRef(false);
useEffect(() => {
  if (initialized.current) return;
  initialized.current = true;
  // ... init ...
}, []);
```

### CDN in React

Use the `loadShapeDiverCDN()` utility from
[advanced-patterns.md](advanced-patterns.md#pattern-k-cdn--react-dynamic-script-loading)
to dynamically load the bundle. Don't mix CDN `<script>` tags with React's
module system.

---

## Debugging Checklist

1. **Check console errors** — look for the exact error message.
2. **Validate parameters:** `param.isValid(value, true)` throws descriptive errors.
3. **Inspect session:** `Object.values(session.parameters)` for names, types, ranges.
4. **Check network tab** — look for failed API requests (403, 404, 429).
5. **Rate limiting (429):** Never commit on every `onChange`. Use `onMouseUp`/`onChangeEnd`.
6. **Add `crossorigin="anonymous"`** to CDN `<script>` tags to get real error messages
   instead of `"Script error"`.
7. **Test with a simple model** — rule out model-specific issues.
8. **Check ShapeDiver status:** https://status.shapediver.com/
9. **Forum:** https://forum.shapediver.com/
10. **Docs:** https://help.shapediver.com/doc/viewer

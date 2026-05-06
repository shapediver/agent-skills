# Advanced Patterns J–M, Troubleshooting & Debugging

---

## Pattern J: Viewport Screenshot

```tsx
function ScreenshotButton({ viewportRef }) {
  function handleScreenshot() {
    const vp = viewportRef.current;
    if (!vp) return;
    const dataUrl = vp.getScreenshot("image/png", 1);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "screenshot.png";
    link.click();
  }
  return <button onClick={handleScreenshot}>Take Screenshot</button>;
}
```

## Pattern K: CDN + React (Dynamic Script Loading)

### `loadShapeDiverCDN` utility — use verbatim, do NOT write your own:

```ts
const _sdvPromise: { current: Promise<void> | null } = { current: null };

export function loadShapeDiverCDN(version: string = "latest"): Promise<void> {
  if (_sdvPromise.current) return _sdvPromise.current;
  _sdvPromise.current = new Promise<void>((resolve, reject) => {
    if ((window as any).SDV) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://viewer.shapediver.com/v3/${version}/bundle.js`;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => {
      if ((window as any).SDV) resolve();
      else
        reject(
          new Error("ShapeDiver bundle loaded but window.SDV is undefined"),
        );
    };
    script.onerror = () =>
      reject(new Error("Failed to load ShapeDiver CDN bundle"));
    document.head.appendChild(script);
  });
  return _sdvPromise.current;
}
```

### CDN + React component:

```tsx
import React, { useEffect, useRef, useState } from "react";
import { loadShapeDiverCDN } from "./loadShapeDiverCDN";

export default function ShapeDiverCDNConfigurator({ ticket, modelViewUrl }) {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const viewportRef = useRef(null);
  const [params, setParams] = useState([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await loadShapeDiverCDN();
        if (!canvasRef.current || sessionRef.current) return;
        const SDV = (window as any).SDV;

        const viewport = await SDV.createViewport({
          id: "vp",
          canvas: canvasRef.current,
        });
        viewportRef.current = viewport;

        const session = await SDV.createSession({
          id: "session",
          ticket,
          modelViewUrl,
        });
        session.automaticSceneUpdate = true;

        if (!isMounted) {
          session.close();
          viewport.close();
          return;
        }

        sessionRef.current = session;
        setParams(
          Object.values(session.parameters)
            .filter((p: any) => !p.hidden)
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
        );
      } catch (e) {
        console.error("ShapeDiver init error:", e);
        if (isMounted) setError(getSDErrorMessage(e));
      }
    })();
    return () => {
      isMounted = false;
      sessionRef.current?.close();
      sessionRef.current = null;
      viewportRef.current?.close();
      viewportRef.current = null;
    };
  }, [ticket, modelViewUrl]);

  async function commitParam(id, rawValue) {
    const session = sessionRef.current;
    if (!session) return;
    const p = session.parameters[id];
    if (!p) return;
    try {
      p.value = toSDValue(p, rawValue);
      await session.customize();
      setError(null);
    } catch (e) {
      console.error("Customize error:", e);
      setError(getSDErrorMessage(e));
    }
  }

  if (error)
    return (
      <div style={{ color: "red", padding: 20 }}>
        <strong>Error:</strong> {error}
      </div>
    );

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <canvas ref={canvasRef} style={{ flex: 1 }} />
      <div style={{ width: 300 }}>
        {params.map((p: any) => (
          <ParamControl key={p.id} param={p} onCommit={commitParam} />
        ))}
      </div>
    </div>
  );
}
```

## Pattern L: Live Material Color Override (client-side, no server call)

Use `MaterialStandardData` to override output materials instantly on the client, bypassing
`session.customize()`. This is the correct pattern for "live preview without committing"
color pickers. See https://help.shapediver.com/doc/materials for background.

**Key facts:**

- `SDV.MaterialStandardData` / `MaterialStandardData` — the material class.
- `SDV.GeometryData` / `GeometryData` — present in node data alongside or inside geometry.
- **⚠️ Do NOT replace material objects with a fresh `new MaterialStandardData()`** — this
  discards all texture maps (`map`, `roughnessMap`, etc.) on the original material.
  Instead, **mutate the `color` property on the existing material objects in-place**.
- Two model types: **glTF 2.0 Display** (material embedded in geometry output) and
  **ShapeDiver Display** (separate material output). Mutating in-place works for both.
- `output.updateCallback = (newNode) => { ... }` — called every time the server sends new
  output data (after `session.customize()`). Register it to re-apply the color so it
  survives server updates.
- **Force re-render by calling `updateVersion()` at the leaf level:** call
  `material.updateVersion()` on each mutated `MaterialStandardData` and
  `data.updateVersion()` on each `GeometryData`. **Do NOT call `SDV.sceneTree.root.updateVersion()`** —
  it is not needed here and should not be used.
- **Do NOT apply the override on init** (set `liveColorHex = null` at startup).
  Only activate it after the user explicitly picks a color.
- When the user picks a Color List preset (server-side), set `liveColorHex = null`
  so the server's preset colour is not masked by the client override.

### CDN (plain HTML) — live color picker with staged server commit

```js
let liveColorHex = null; // null = no override; set on first picker input
const COLOR_OUTPUT_NAMES = ["Shelf", "Doors"]; // outputs to apply color to

// ── After session loads ──────────────────────────────────────────────────────

/**
 * Mutate `color` on every existing MaterialStandardData in a node tree.
 * Also calls updateVersion() on each GeometryData and its material so the
 * renderer picks up the change (geometry may be deeply nested).
 * Does NOT replace the material object — all maps and properties are preserved.
 */
function setColorOnMaterialsInNode(node, hex) {
  for (let i = 0; i < node.data.length; i++) {
    const d = node.data[i];
    if (d instanceof SDV.MaterialStandardData) {
      d.color = hex;
      if (typeof d.updateVersion === "function") d.updateVersion();
    } else if (
      d instanceof SDV.GeometryData &&
      d.material instanceof SDV.MaterialStandardData
    ) {
      d.material.color = hex;
      if (typeof d.material.updateVersion === "function")
        d.material.updateVersion();
      if (typeof d.updateVersion === "function") d.updateVersion();
    }
  }
  for (const child of node.children) setColorOnMaterialsInNode(child, hex);
}

function applyLiveColorToOutputs() {
  if (!session || !viewport || !liveColorHex) return;
  for (const name of COLOR_OUTPUT_NAMES) {
    for (const output of session.getOutputByName(name)) {
      if (output.node) {
        setColorOnMaterialsInNode(output.node, liveColorHex);
        output.node.updateVersion();
      }
    }
  }
  viewport.update();
}

// Register callbacks so the override survives server-triggered output updates
function registerMaterialUpdateCallbacks() {
  for (const name of COLOR_OUTPUT_NAMES) {
    for (const output of session.getOutputByName(name)) {
      output.updateCallback = (newNode) => {
        if (newNode && liveColorHex) {
          setColorOnMaterialsInNode(newNode, liveColorHex);
          newNode.updateVersion();
          viewport.update();
        }
      };
    }
  }
}
registerMaterialUpdateCallbacks(); // call once right after session loads

// ── Color picker "input" event — runs on every mouse move ────────────────────
colorPickerEl.addEventListener("input", (e) => {
  liveColorHex = e.target.value;
  applyLiveColorToOutputs(); // instant client-side update, no server call
  staged[PARAM_MATERIAL_COLOR] = e.target.value; // stage for later server commit
});

// ── Color preset dropdown — clear live override so server preset shows through
presetSelectEl.addEventListener("change", (e) => {
  staged[PARAM_COLOR_LIST] = e.target.value;
  liveColorHex = null;
});

// ── "Apply" button — commit staged values to server ──────────────────────────
async function commitStagedToServer() {
  for (const [id, val] of Object.entries(staged)) {
    const p = session.parameters[id];
    if (p) p.value = val;
  }
  Object.keys(staged).forEach((k) => delete staged[k]);
  await session.customize();
  // updateCallback will re-apply the color to the fresh output nodes
}
```

### NPM / React — same pattern, refs instead of module-level vars

```tsx
const liveColorHexRef = useRef<string | null>(null);

// In useEffect after session loads:
registerMaterialUpdateCallbacks(session, viewport, liveColorHexRef);

// Color picker handler — instant client-side update:
function handleColorInput(hex: string) {
  liveColorHexRef.current = hex;
  applyLiveColorToOutputs(session, viewport, liveColorHexRef.current);
  setStagedColor(hex); // stage for later server commit
}

// Preset dropdown — clear override so server preset shows through:
function handlePresetChange(index: string) {
  setStagedPreset(index);
  liveColorHexRef.current = null;
}

// On Apply — commit staged values to server:
async function commitColor() {
  const p = session.parameters[PARAM_MATERIAL_COLOR];
  p.value = stagedColor;
  await session.customize();
  // updateCallback re-applies liveColorHexRef.current to fresh output nodes
}
```

## Pattern M: File Upload Parameter

Upload files (images, 3D models, PDFs, etc.) via file parameters. The file is sent
to the backend as part of `customize()`. Use `param.format` to check accepted MIME types.

### React

```tsx
function FileUpload({ param, session }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      param.value = file; // File, Blob, or URL string
      await session.customize();
    } catch (err) {
      console.error("File upload error:", getSDErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  // Build accept string from param.format (e.g., ["image/png", "image/jpeg"])
  const accept = (param.format || []).join(",");

  return (
    <label>
      {param.displayname || param.name}:
      <input
        type="file"
        accept={accept || undefined}
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <span> Uploading...</span>}
    </label>
  );
}
```

### CDN / Plain HTML

```js
const fileInput = document.createElement("input");
fileInput.type = "file";
// Restrict to accepted types from param.format
fileInput.accept = (param.format || []).join(",");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  param.value = file;
  await session.customize();
});
```

### Screenshot as File Upload

Take a viewport screenshot and send it as a file parameter input:

```ts
const dataUrl = viewport.getScreenshot("image/png", 1);
const response = await fetch(dataUrl);
const blob = await response.blob();
const file = new File([blob], "screenshot.png", { type: "image/png" });

const fileParam = session.getParameterByName("Image")[0];
fileParam.value = file;
await session.customize();
```

---

## Troubleshooting & Common Issues

Always show the **exact error message** — don't paraphrase or summarize.

### Common Errors & Fixes

| Error / Symptom                                   | Cause                                               | Fix                                                                                        |
| :------------------------------------------------ | :-------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| HTTP 403 on session creation                      | Domain not whitelisted                              | Add domain in Embedding Settings on platform                                               |
| Model geometry never loads                        | `automaticSceneUpdate` set to `false`               | Set `session.automaticSceneUpdate = true` (it defaults to `true`)                          |
| Parameter changes don't update scene              | `customize()` not called                            | Call `await session.customize()` after `param.value`                                       |
| Parameter update silently fails                   | Incorrect value format                              | Use `toSDValue()`; check with `param.isValid(value, true)`                                 |
| Double viewport / WebGL context lost              | React 18 Strict Mode                                | Add `sessionRef.current` guard in `useEffect`; if still blank, remove `<React.StrictMode>` |
| Blank canvas in Next.js / SSR                     | Module imported at top level                        | Dynamic-import inside `useEffect`                                                          |
| `SDV is not defined`                              | Wrong CDN URL or load order                         | Use correct URL; for React CDN use `await loadShapeDiverCDN()`                             |
| `SDV3 is not defined`                             | Wrong global name                                   | The global is `SDV`, not `SDV3`                                                            |
| StringList shows wrong option                     | Using label instead of index                        | Option `value` must be numeric index as string                                             |
| Color picker shows wrong color                    | Not converting `0xRRGGBBAA`                         | Use `slice(2, 8)` — NOT `slice(-6)`.                                                       |
| Color picker doesn't update model                 | Using `onChange` or `onMouseUp`                     | Use Mantine `ColorInput` with `onChangeEnd`, or native DOM `change`.                       |
| Rate limit / 429                                  | `onChange` committing continuously                  | Never `onChange` to commit. See commit table.                                              |
| Slider commits wrong value                        | Stale closure                                       | Use `useRef`. See Pattern D.                                                               |
| Float slider imprecise                            | Not rounding to `decimalplaces`                     | `parseFloat(raw.toFixed(dp))`                                                              |
| Export returns no content                         | Not requested                                       | Call `export.request()` explicitly                                                         |
| `"Script error"` (no details)                     | Missing `crossorigin`                               | Add `crossorigin="anonymous"` to `<script>` tag                                            |
| Canvas ref not ready / blank viewport             | Canvas conditionally rendered                       | Canvas must ALWAYS be in the DOM. Use an overlay for loading.                              |
| `"maximum amount of points (undefined) exceeded"` | `maxPoints` set to `undefined`                      | Use conditional spread: `...(val != null && { maxPoints: val })`                           |
| Live color change shows nothing visually          | `updateVersion()` only on output node               | Also call `material.updateVersion()` + `data.updateVersion()` on each leaf `GeometryData`  |
| Color change removes texture maps                 | Replaced material with `new MaterialStandardData()` | Mutate `color` in-place on existing material — never replace the object                    |
| Color override lost after server update           | No `updateCallback` on output                       | Register `output.updateCallback` to re-apply the color after `session.customize()`         |

### Debugging Tips

- **Validate values:** `param.isValid(candidateValue, true)` throws descriptive errors.
- **Inspect parameters:** `Object.values(session.parameters)` — names, types, ranges, choices.
- **Inspect outputs/exports:** `Object.values(session.outputs)` / `Object.values(session.exports)`.
- **`"Script error"`:** Add `crossorigin="anonymous"` — real error will appear.
- **Do NOT invent explanations.** If you don't know what caused an error, ask the user for
  the actual message. Never fabricate explanations like "pointer event conflicts".
- **Docs:** https://help.shapediver.com/doc/viewer
- **Forum:** https://forum.shapediver.com/

# ShapeDiver Viewer V3 — Code Patterns & Parameter Formatting

Ready-to-use code patterns for all parameter types, exports, outputs, and common UI components.
Also includes the `toSDValue()` conversion function and parameter value formatting rules.

---

## Parameter Value Formatting

### Bool

```ts
param.value = true; // JS boolean
param.value = "true"; // string — both work
```

### Int / Float / Even / Odd

```ts
// Int
param.value = String(parseInt(rawValue, 10));

// Float — use decimalplaces if defined
const dp = param.decimalplaces != null ? param.decimalplaces : undefined;
param.value =
  dp != null ? parseFloat(rawValue).toFixed(dp) : String(parseFloat(rawValue));
```

### StringList

Value is the **numeric index** as a string (not the label). For `CHECKLIST` visualization,
comma-separated indices: `"0,2"`.

```ts
param.value = String(selectedIndex); // e.g. "2"
```

Option elements must use index as value:

```html
<option value="0">Red</option>
<option value="1">Green</option>
```

### Color

Native format is `0xRRGGBBAA` (10 chars). Browser `<input type="color">` only accepts `#RRGGBB`.

```ts
function nativeToPickerColor(v: string): string {
  if (v && (v.startsWith("0x") || v.startsWith("0X")))
    return "#" + v.slice(2, 8).toLowerCase(); // RRGGBB — NOT slice(-6)
  return v || "#ffffff";
}
param.value = e.target.value; // "#rrggbb" passes validation
```

### String

Pass directly. If `defval` suggests structured data (JSON, semicolons, etc.), **ask the user
for the expected format** before generating code.

### File

Pass `File`, `Blob`, or URL string. Uploaded automatically on `customize()`.

### Complete `toSDValue()` Reference

```ts
function toSDValue(param: any, rawValue: any): any {
  switch (param.type) {
    case "Bool":
      return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
    case "Int":
    case "Even":
    case "Odd":
      return String(parseInt(rawValue, 10));
    case "Float": {
      const dp = param.decimalplaces != null ? param.decimalplaces : undefined;
      return dp != null
        ? parseFloat(rawValue).toFixed(dp)
        : String(parseFloat(rawValue));
    }
    case "StringList":
      return String(parseInt(rawValue, 10));
    case "Color":
      return String(rawValue);
    default:
      return String(rawValue);
  }
}
```

---

## Commit Function

```ts
async function commitParam(session, paramId, rawValue) {
  const param = session.parameters[paramId];
  if (!param) return;
  param.value = toSDValue(param, rawValue);
  await session.customize();
}
```

### Correct Commit Events

| Control           | Commit event                                          |
| :---------------- | :---------------------------------------------------- |
| Slider (range)    | `onMouseUp` / `onTouchEnd` / `onKeyUp` (via `useRef`) |
| Color picker      | Native DOM `addEventListener("change", ...)` via ref  |
| Dropdown (select) | `onChange` — fires once per selection                 |
| Checkbox (toggle) | `onChange` — fires once per click                     |
| Text input        | `onBlur`                                              |
| Number input      | `onBlur`                                              |

**UI libraries (Mantine, MUI, etc.):** Use `onChangeEnd` for commit, `onChange` for display.

---

## Error Extraction

```ts
function getSDErrorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as any;
    if (err.response?.data?.message) return err.response.data.message;
    if (err.error?.message) return err.error.message;
    if (typeof err.message === "string") return err.message;
  }
  return String(e);
}
```

---

## React Architectural Rules

1. **Canvas ref:** Use `useRef` — never state.
2. **Canvas always in DOM:** Never conditionally render the canvas. Use an overlay for loading states.
3. **Strict Mode guard:** `if (!canvasRef.current || sessionRef.current) return;`
4. **SSR safety:** Dynamic-import inside `useEffect`.
5. **Order:** Viewport before Session.
6. **Parameter sort:** `Object.values(session.parameters).filter(p => !p.hidden).sort((a,b) => (a.order??0) - (b.order??0))`
7. **Cleanup:** `session.close()` + `viewport.close()` in effect cleanup. Use `isMounted` flag.
8. **Error handling:** Show actual errors via `getSDErrorMessage(e)`.
9. **CDN + React:** Always `await loadShapeDiverCDN()` before accessing `window.SDV`.
10. **Never commit on `onChange`:** See commit table above.

---

## Pattern A: Plain HTML with CDN

```html
<script
  src="https://viewer.shapediver.com/v3/latest/bundle.js"
  crossorigin="anonymous"
></script>
<canvas id="sd-canvas"></canvas>

<script>
  let session = null;

  (async () => {
    await SDV.createViewport({
      id: "vp",
      canvas: document.getElementById("sd-canvas"),
    });

    session = await SDV.createSession({
      id: "session",
      ticket: "PASTE_TICKET_HERE",
      modelViewUrl: "PASTE_MODEL_VIEW_URL_HERE",
    });
    session.automaticSceneUpdate = true;

    const params = Object.values(session.parameters)
      .filter((p) => !p.hidden)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderUI(params);
  })();

  async function commitParam(id, rawValue) {
    const p = session.parameters[id];
    p.value = toSDValue(p, rawValue);
    await session.customize();
  }
</script>
```

## Pattern B: React / TypeScript with NPM

```tsx
import React, { useEffect, useRef, useState } from "react";

export default function ShapeDiverConfigurator({ ticket, modelViewUrl }) {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const viewportRef = useRef(null);
  const [params, setParams] = useState([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!canvasRef.current || sessionRef.current) return;
      try {
        const { createViewport, createSession } =
          await import("@shapediver/viewer");
        const viewport = await createViewport({
          id: "vp",
          canvas: canvasRef.current,
        });
        viewportRef.current = viewport;

        const session = await createSession({
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
            .filter((p) => !p.hidden)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
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
        {params.map((p) => (
          <ParamControl key={p.id} param={p} onCommit={commitParam} />
        ))}
      </div>
    </div>
  );
}
```

## Pattern C: StringList Dropdown

```tsx
function buildDropdown(p, onCommit) {
  const currentIndex = parseInt(p.value, 10);
  return (
    <select
      value={currentIndex}
      onChange={(e) => onCommit(p.id, e.target.value)}
    >
      {(p.choices || []).map((label, i) => (
        <option key={i} value={i}>
          {label}
        </option>
      ))}
    </select>
  );
}
```

## Pattern D: Numeric Slider — Int / Float / Even / Odd

Step: Float → `interval ?? 1/10^dp`, Int → `interval ?? 1`, Even/Odd → `interval ?? 2`.

**Uses `useRef` to avoid stale closure. Rounds to `decimalplaces` for Float.**

```tsx
function buildSlider(p, onCommit) {
  const dp = p.type === "Float" ? (p.decimalplaces ?? 2) : 0;
  const step =
    p.interval ??
    (p.type === "Float"
      ? Math.pow(10, -dp)
      : p.type === "Even" || p.type === "Odd"
        ? 2
        : 1);
  const [display, setDisplay] = useState(parseFloat(p.value));
  const displayRef = useRef(display);

  function handleInput(e) {
    const raw = parseFloat(e.target.value);
    const rounded = p.type === "Float" ? parseFloat(raw.toFixed(dp)) : raw;
    setDisplay(rounded);
    displayRef.current = rounded;
  }

  function handleCommit() {
    onCommit(p.id, displayRef.current);
  }

  return (
    <input
      type="range"
      min={p.min}
      max={p.max}
      step={step}
      value={display}
      onInput={handleInput}
      onMouseUp={handleCommit}
      onTouchEnd={handleCommit}
      onKeyUp={handleCommit}
    />
  );
}
```

## Pattern E: Color Picker

**⚠️ Use one of these patterns for ALL color parameters.**

❌ WRONG: `<input type="color" onChange={(e) => commitParam(p, e.target.value)} />`
❌ WRONG: `<input type="color" onMouseUp={() => commitParam(p, color)} />`

### Pattern E1: Mantine `ColorInput` (RECOMMENDED — App Builder pattern)

```tsx
import { ColorInput } from "@mantine/core";

function buildColorPicker(p, onCommit) {
  const [display, setDisplay] = useState(nativeToPickerColor(p.value));
  return (
    <ColorInput
      value={display}
      onChange={(v) => setDisplay(v)}
      onChangeEnd={(v) => onCommit(p.id, v)}
      format="hex"
    />
  );
}
```

### Pattern E2: Native `<input type="color">` with debounced commit

```tsx
function buildColorPicker(p, onCommit) {
  function nativeToPickerColor(v) {
    if (v && (String(v).startsWith("0x") || String(v).startsWith("0X")))
      return "#" + String(v).slice(2, 8).toLowerCase();
    return v || "#ffffff";
  }

  const [display, setDisplay] = useState(nativeToPickerColor(p.value));
  const timerRef = useRef(null);
  const latestRef = useRef(display);

  function handleInput(e) {
    const v = e.target.value;
    setDisplay(v);
    latestRef.current = v;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onCommit(p.id, latestRef.current), 300);
  }

  const inputRef = useRef(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handleClose = () => {
      clearTimeout(timerRef.current);
      onCommit(p.id, el.value);
    };
    el.addEventListener("change", handleClose);
    return () => el.removeEventListener("change", handleClose);
  }, [p.id, onCommit]);

  return (
    <input ref={inputRef} type="color" value={display} onInput={handleInput} />
  );
}
```

### Pattern E3: Native `<input type="color">` with DOM `change` only (minimal)

```tsx
function buildColorPicker(p, onCommit) {
  function nativeToPickerColor(v) {
    if (v && (String(v).startsWith("0x") || String(v).startsWith("0X")))
      return "#" + String(v).slice(2, 8).toLowerCase();
    return v || "#ffffff";
  }

  const inputRef = useRef(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handleNativeChange = () => onCommit(p.id, el.value);
    el.addEventListener("change", handleNativeChange);
    return () => el.removeEventListener("change", handleNativeChange);
  }, [p.id, onCommit]);

  return (
    <input
      ref={inputRef}
      type="color"
      defaultValue={nativeToPickerColor(p.value)}
    />
  );
}
```

## Pattern F: Bool Toggle

```tsx
function buildToggle(p, onCommit) {
  const checked = p.value === true || p.value === "true";
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCommit(p.id, e.target.checked)}
    />
  );
}
```

## Pattern G: Export Download Button

```tsx
function ExportButton({ session, exportName }) {
  const [loading, setLoading] = useState(false);
  async function handleExport() {
    setLoading(true);
    try {
      const exportApi = session.getExportByName(exportName)[0];
      if (!exportApi) return;
      const result = await exportApi.request();
      const fileUrl = result.content?.[0]?.href;
      if (fileUrl) window.open(fileUrl);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setLoading(false);
    }
  }
  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? "Exporting..." : `Download ${exportName}`}
    </button>
  );
}
```

## Pattern H: Data Output Reader

```tsx
function useDataOutput(session, outputName) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!session) return;
    const output = session.getOutputByName(outputName)[0];
    if (!output) return;
    setData(output.content?.[0]?.data);
    output.updateCallback = () => setData(output.content?.[0]?.data);
    return () => {
      output.updateCallback = null;
    };
  }, [session, outputName]);
  return data;
}
```

## Pattern I: Dynamic ParamControl Router

```tsx
function ParamControl({ param, onCommit }) {
  const label = param.displayname || param.name;
  switch (param.type) {
    case "Bool":
      return (
        <label>
          {label}: {buildToggle(param, onCommit)}
        </label>
      );
    case "Int":
    case "Even":
    case "Odd":
    case "Float":
      return (
        <label>
          {label}: {buildSlider(param, onCommit)}
        </label>
      );
    case "StringList":
      return (
        <label>
          {label}: {buildDropdown(param, onCommit)}
        </label>
      );
    case "Color":
      return (
        <label>
          {label}: {buildColorPicker(param, onCommit)}
        </label>
      );
    case "String":
      return (
        <label>
          {label}:{" "}
          <input
            type="text"
            defaultValue={param.value}
            onBlur={(e) => onCommit(param.id, e.target.value)}
          />
        </label>
      );
    default:
      return null;
  }
}
```

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

---

## Troubleshooting & Common Issues

Always show the **exact error message** — don't paraphrase or summarize.

### Common Errors & Fixes

| Error / Symptom                                   | Cause                                 | Fix                                                                  |
| :------------------------------------------------ | :------------------------------------ | :------------------------------------------------------------------- |
| HTTP 403 on session creation                      | Domain not whitelisted                | Add domain in Embedding Settings on platform                         |
| Model geometry never loads                        | `automaticSceneUpdate` set to `false` | Set `session.automaticSceneUpdate = true` (it defaults to `true`)    |
| Parameter changes don't update scene              | `customize()` not called              | Call `await session.customize()` after `param.value`                 |
| Parameter update silently fails                   | Incorrect value format                | Use `toSDValue()`; check with `param.isValid(value, true)`           |
| Double viewport / WebGL context lost              | React 18 Strict Mode                  | Add `sessionRef.current` guard in `useEffect`                        |
| Blank canvas in Next.js / SSR                     | Module imported at top level          | Dynamic-import inside `useEffect`                                    |
| `SDV is not defined`                              | Wrong CDN URL or load order           | Use correct URL; for React CDN use `await loadShapeDiverCDN()`       |
| `SDV3 is not defined`                             | Wrong global name                     | The global is `SDV`, not `SDV3`                                      |
| StringList shows wrong option                     | Using label instead of index          | Option `value` must be numeric index as string                       |
| Color picker shows wrong color                    | Not converting `0xRRGGBBAA`           | Use `slice(2, 8)` — NOT `slice(-6)`.                                 |
| Color picker doesn't update model                 | Using `onChange` or `onMouseUp`       | Use Mantine `ColorInput` with `onChangeEnd`, or native DOM `change`. |
| Rate limit / 429                                  | `onChange` committing continuously    | Never `onChange` to commit. See commit table.                        |
| Slider commits wrong value                        | Stale closure                         | Use `useRef`. See Pattern D.                                         |
| Float slider imprecise                            | Not rounding to `decimalplaces`       | `parseFloat(raw.toFixed(dp))`                                        |
| Export returns no content                         | Not requested                         | Call `export.request()` explicitly                                   |
| `"Script error"` (no details)                     | Missing `crossorigin`                 | Add `crossorigin="anonymous"` to `<script>` tag                      |
| Canvas ref not ready / blank viewport             | Canvas conditionally rendered         | Canvas must ALWAYS be in the DOM. Use an overlay for loading.        |
| `"maximum amount of points (undefined) exceeded"` | `maxPoints` set to `undefined`        | Use conditional spread: `...(val != null && { maxPoints: val })`     |

### Debugging Tips

- **Validate values:** `param.isValid(candidateValue, true)` throws descriptive errors.
- **Inspect parameters:** `Object.values(session.parameters)` — names, types, ranges, choices.
- **Inspect outputs/exports:** `Object.values(session.outputs)` / `Object.values(session.exports)`.
- **`"Script error"`:** Add `crossorigin="anonymous"` — real error will appear.
- **Do NOT invent explanations.** If you don't know what caused an error, ask the user for
  the actual message. Never fabricate explanations like "pointer event conflicts".
- **Docs:** https://help.shapediver.com/doc/viewer
- **Forum:** https://forum.shapediver.com/

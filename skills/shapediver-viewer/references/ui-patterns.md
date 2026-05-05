# UI Patterns A–I — Setup, Controls, Exports, Outputs, Router

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
      // result.content is ShapeDiverResponseExportContent[]
      // Each item has: href (download URL), format, contentType?, size?
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

## Pattern G2: Export with Parameter Overrides

Use `request(parameters?)` to export with specific parameter values without
changing the session state. Pass a map from parameter **ID** to value.

```tsx
function ExportWithOverrides({ session, exportName }) {
  const [loading, setLoading] = useState(false);
  async function handleExport() {
    setLoading(true);
    try {
      const exportApi = session.getExportByName(exportName)[0];
      if (!exportApi) return;
      // Override specific parameters for this export only
      const lengthParam = session.getParameterByName("Length")[0];
      const result = await exportApi.request({ [lengthParam.id]: 10 });
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
      {loading ? "Exporting..." : `Export with overrides`}
    </button>
  );
}
```

## Pattern H: Data Output Reader

### H1: React hook using `updateCallback`

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

### H2: CDN / vanilla JS using `EVENTTYPE_OUTPUT.OUTPUT_UPDATED`

```js
// Global listener for all output updates — useful when monitoring several outputs
SDV.addListener(SDV.EVENTTYPE_OUTPUT.OUTPUT_UPDATED, (e) => {
  const outputEvent = e;
  const outputApi = session.getOutputById(outputEvent.outputId);
  if (outputApi && outputApi.name === "NumberOfSeats") {
    document.getElementById("seat-count").textContent =
      outputApi.content?.[0]?.data ?? "";
  }
});
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
    case "File":
      return (
        <label>
          {label}:
          <input
            type="file"
            accept={(param.format || []).join(",") || undefined}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) onCommit(param.id, file);
            }}
          />
        </label>
      );
    default:
      return null;
  }
}
```

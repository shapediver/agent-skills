# Core Patterns — Commit, Errors, React Rules

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

### Customize Shorthand Alternative

For simple cases, you can pass values directly to `customize()` instead of using
`param.value` + `session.customize()`. This is the approach shown in the official
ShapeDiver help desk docs:

```ts
// Shorthand — pass values directly (parameter name or ID as key)
await session.customize({ Length: 1500, "Material Color": "#ff0000" });
```

Use the step-by-step `commitParam()` pattern when building dynamic UIs from
`session.parameters` where you need `toSDValue()` type conversion. Use the shorthand
when you know exact parameter names and values.

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
   **⚠️** The guard prevents double initialization, but React 18 StrictMode still runs
   cleanup (closing the viewport and destroying the WebGL context) before re-mounting.
   In some environments the canvas WebGL context cannot recover after this, resulting
   in a blank viewport even though the session loaded successfully. If the viewer
   loads but renders a blank canvas, **remove `<React.StrictMode>`** from the root
   render. This is the most reliable fix.
4. **SSR safety:** Dynamic-import inside `useEffect`.
5. **Order:** Viewport before Session.
6. **Parameter sort:** `Object.values(session.parameters).filter(p => !p.hidden).sort((a,b) => (a.order??0) - (b.order??0))`
7. **Cleanup:** `session.close()` + `viewport.close()` in effect cleanup. Use `isMounted` flag.
8. **Error handling:** Show actual errors via `getSDErrorMessage(e)`.
9. **CDN + React:** Always `await loadShapeDiverCDN()` before accessing `window.SDV`.
10. **Never commit on `onChange`:** See commit table above.

---
name: shapediver-appbuilder-fork
description: >
  Use this skill when the user wants to fork the open-source ShapeDiver App
  Builder React app to add custom UI components, integrate with backend
  services, or heavily modify the parameter layout. Covers repository
  structure, Mantine UI conventions, parameter commit patterns, and the
  boundary between forking and using the Viewer V3 API directly.
---

# ShapeDiver App Builder — Open-Source Fork

Follow every rule in this file exactly. Do not improvise or work around any constraint.

Fork the App Builder when you need custom React components but still want the App Builder's
session management, parameter routing, model state handling, and responsive layout.

---

## Repository Structure

- **[AppBuilderSdk](https://github.com/shapediver/AppBuilderSdk)**
  — The main App Builder React application.
- **[AppBuilderShared](https://github.com/shapediver/AppBuilderShared)** — Shared hooks,
  utilities, and components used by the App Builder. Contains the parameter handling logic,
  session management, and Mantine-based UI components.

---

## Key Architectural Notes

- The App Builder uses **Mantine** as its UI library.
- Parameter commit patterns use `onChange` for display + `onChangeEnd` for commit
  (Mantine's convention). This fires one commit at the END of interaction, not continuously.

  ❌ `<Slider onChange={(v) => commitParam(p.id, v)} />` — commits on every drag movement
  ✅ `<Slider onChange={(v) => setLocal(v)} onChangeEnd={(v) => commitParam(p.id, v)} />` — commits once at end

- The `AppBuilderShared` repo contains reusable hooks for session management, parameter
  handling, and UI components — review the `shared` directory before building custom
  components.

---

## When to Fork vs. When to Use Viewer 3 API

- **Fork** when you want custom React components but still want the App Builder's session
  management, parameter routing, model state handling, and responsive layout.
- **Viewer 3 API** (see the `shapediver-viewer` skill) when you need complete control over the
  viewport, camera, materials, interaction features, or a non-React stack.

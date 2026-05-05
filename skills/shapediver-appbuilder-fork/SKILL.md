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
  — The main App Builder React application (TypeScript, Vite).
- **[AppBuilderShared](https://github.com/shapediver/AppBuilderShared)** — Shared hooks,
  utilities, and components used by the App Builder. Included as a git submodule in
  `AppBuilderSdk` under the `src/shared` directory. Contains parameter handling logic,
  session management, state stores, and Mantine-based UI components.

### AppBuilderShared directory layout

The shared submodule follows a Feature-Sliced Design structure:

| Directory             | Contents                                                |
| :-------------------- | :------------------------------------------------------ |
| `entities/`           | Core domain entities                                    |
| `features/`           | Feature-level logic and components                      |
| `pages/`              | Page templates (`appshell` default, `grid` alternative) |
| `shared/`             | Low-level shared utilities and hooks                    |
| `widgets/appbuilder/` | App Builder widget components                           |

---

## Getting Started

```bash
pnpm i
git submodule init
git submodule update
pnpm start
```

This runs the app in development mode at `http://127.0.0.1:3000`.

---

## Key Architectural Notes

- The App Builder uses **Mantine** as its UI library and **Vite** as the build tool.
- **State management** uses [zustand](https://github.com/pmndrs/zustand) stores:
  - **Session store** (`useShapeDiverStoreSession`) — manages viewer sessions.
  - **Viewport store** (`useShapeDiverStoreViewport`) — manages viewports.
  - **Parameter & export store** (`useShapeDiverStoreParameters`) — stateful abstraction
    of parameter and export functionality.
- **App Builder skeleton:** The App Builder renders its UI from a JSON "skeleton" defined by
  the `AppBuilder` data output of the Grasshopper model. The skeleton specifies containers,
  tabs, widgets, and elements. Type definitions are in `shared/types/shapediver/appbuilder.ts`.
- **Page templates:** Two templates are available (`appshell` default, `grid`), selectable
  via the theme's `AppBuilderTemplateSelector` component overrides.
- Parameter commit patterns use `onChange` for display + `onChangeEnd` for commit
  (Mantine's convention). This fires one commit at the END of interaction, not continuously.

  Wrong: `<Slider onChange={(v) => commitParam(p.id, v)} />` — commits on every drag movement
  Correct: `<Slider onChange={(v) => setLocal(v)} onChangeEnd={(v) => commitParam(p.id, v)} />` — commits once at end

- Review `src/shared` (the AppBuilderShared submodule) before building custom components —
  it contains reusable hooks for sessions, parameters, exports, and UI.

---

## Adding New Widgets

To extend the App Builder with a new widget type:

1. Extend the skeleton type definition in `shared/types/shapediver/appbuilder.ts`
   (look for `IAppBuilderWidget`).
2. Extend the skeleton validator in `shared/types/shapediver/appbuildertypecheck.ts`.
3. Implement the widget React component.
4. Plug it into `AppBuilderWidgetsComponent` in `shared/widgets/appbuilder/`.
5. Build and deploy, or submit a pull request.

---

## When to Fork vs. When to Use Viewer 3 API

- **Fork** when you want custom React components but still want the App Builder's session
  management, parameter routing, model state handling, and responsive layout.
- **Viewer 3 API** (see the `shapediver-viewer` skill) when you need complete control over the
  viewport, camera, materials, interaction features, or a non-React stack.

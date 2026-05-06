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

**Scope discipline:** Only modify or create files directly related to the user's request. Do
not modify the `src/shared` submodule. Do not refactor existing App Builder code.

Fork the App Builder when you need custom React components but still want the App Builder's
session management, parameter routing, model state handling, and responsive layout.

---

## Workflow

Follow these steps in order.

### Step 1: Set Up the Development Environment

Clone and initialize the repository:

```bash
git clone https://github.com/shapediver/AppBuilderSdk.git
cd AppBuilderSdk
pnpm i
git submodule init
git submodule update
pnpm start
```

This runs the app in development mode at `http://127.0.0.1:3000`.

**Checkpoint:** The dev server starts and loads the App Builder at localhost:3000.

### Step 2: Understand the Architecture

Read these before writing any custom component:

- **[AppBuilderSdk](https://github.com/shapediver/AppBuilderSdk)**
  — The main App Builder React application (TypeScript, Vite).
- **[AppBuilderShared](https://github.com/shapediver/AppBuilderShared)** — Shared hooks,
  utilities, and components used by the App Builder. Included as a git submodule in
  `AppBuilderSdk` under the `src/shared` directory. Contains parameter handling logic,
  session management, state stores, and Mantine-based UI components.

**AppBuilderShared directory layout** (Feature-Sliced Design):

| Directory             | Contents                                                |
| :-------------------- | :------------------------------------------------------ |
| `entities/`           | Core domain entities                                    |
| `features/`           | Feature-level logic and components                      |
| `pages/`              | Page templates (`appshell` default, `grid` alternative) |
| `shared/`             | Low-level shared utilities and hooks                    |
| `widgets/appbuilder/` | App Builder widget components                           |

**Key architectural facts:**

- **Mantine** is the UI library, **Vite** is the build tool.
- **State management** uses [zustand](https://github.com/pmndrs/zustand) stores:
  - `useShapeDiverStoreSession` — manages viewer sessions.
  - `useShapeDiverStoreViewport` — manages viewports.
  - `useShapeDiverStoreParameters` — stateful abstraction of parameter and export functionality.
- **App Builder skeleton:** The UI renders from a JSON "skeleton" defined by the `AppBuilder`
  data output. Type definitions are in `shared/types/shapediver/appbuilder.ts`.
- **Page templates:** Two templates available (`appshell` default, `grid`).
- Parameter commit patterns use `onChange` for display + `onChangeEnd` for commit
  (Mantine's convention). This fires one commit at the END of interaction, not continuously.

  Wrong: `<Slider onChange={(v) => commitParam(p.id, v)} />` — commits on every drag movement
  Correct: `<Slider onChange={(v) => setLocal(v)} onChangeEnd={(v) => commitParam(p.id, v)} />` — commits once at end

**Checkpoint:** You have reviewed `src/shared` and identified existing hooks and components
relevant to the user's request. You are reusing existing abstractions, not reinventing them.

### Step 3: Implement the Custom Component or Widget

If adding a new widget type:

1. Extend the skeleton type definition in `shared/types/shapediver/appbuilder.ts`
   (look for `IAppBuilderWidget`).
2. Extend the skeleton validator in `shared/types/shapediver/appbuildertypecheck.ts`.
3. Implement the widget React component.
4. Plug it into `AppBuilderWidgetsComponent` in `shared/widgets/appbuilder/`.

If modifying existing behavior: make targeted edits in the appropriate component or hook.

**Checkpoint:** The custom component uses existing stores and hooks from `src/shared`. The
commit pattern uses `onChange` for display + `onChangeEnd` for commit (not `onChange` alone).

### Step 4: Verify and Deliver

Build and test the result.

**Checkpoint — exit criteria (all must be true):**

- The dev server starts without errors.
- The custom component renders and behaves as the user requested.
- Parameter commits fire once at interaction end, not continuously.
- No files outside the user's request were modified.
- The `src/shared` submodule was not modified.

### Step 5: Verify Domain Whitelisting

The dev server runs at `http://127.0.0.1:3000`. If model metadata was retrieved via the
API script, check the `allowedDomains` array in the script output for a matching localhost
entry (e.g., `localhost:3000`, `127.0.0.1:3000`).

If no matching entry exists, inform the user that they need to add `localhost:3000` (or
`127.0.0.1:3000`) to the model's embedding domains at
https://www.shapediver.com/app/settings/domains before the app will work locally —
otherwise session creation will fail with HTTP 403.

**Checkpoint:** The dev server port matches a whitelisted domain, or the user has been
informed about the domain whitelisting requirement.

---

## Anti-Rationalization Table

| You will think…                                                          | Why it is wrong                                                                                                                                   |
| :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I'll write my own session management hook — it's simpler."              | `useShapeDiverStoreSession` already handles this. Reinventing it introduces bugs and diverges from upstream updates.                              |
| "I'll use `onChange` to commit slider values since Mantine supports it." | Mantine's `onChange` fires on every drag movement. Use `onChange` for display + `onChangeEnd` for commit — this is the App Builder's own pattern. |
| "I need to modify the shared submodule to add my widget."                | New widgets plug in via `AppBuilderWidgetsComponent` without modifying shared code. Never modify `src/shared`.                                    |
| "This would be easier with the Viewer API directly."                     | The fork gives you session management, parameter routing, and responsive layout for free.                                                         |

---

## When to Fork vs. When to Use Viewer 3 API

- **Fork** when you want custom React components but still want the App Builder's session
  management, parameter routing, model state handling, and responsive layout.
- **Viewer 3 API** (see the `shapediver-viewer` skill) when you need complete control over the
  viewport, camera, materials, interaction features, or a non-React stack.

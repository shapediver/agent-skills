---
name: shapediver-appbuilder
description: >
  Use this skill when the user wants to use the ShapeDiver App Builder —
  the ready-made configurator UI. Routes to the correct App Builder strategy:
  iframe embedding (zero code), App Builder with optional custom theme, or
  forking the open-source React app. Activate when the user mentions App
  Builder, embedding a ShapeDiver model, or wants to use ShapeDiver without
  writing custom Viewer API code.
license: MIT
---

# ShapeDiver App Builder

> **Prerequisite:** This skill assumes you have already read and followed the
> `shapediver-router` skill. If you arrived here directly, stop — read
> `shapediver-router` first. It selects the correct integration strategy and
> gathers required credentials before any implementation skill is read.

You are guiding the user to the right App Builder strategy. Ask clarifying questions
if the intent is not clear, then hand off to the correct skill.

**Scope discipline:** This skill only routes. Do not write implementation code here — hand
off to the correct sub-skill. Do not suggest the Viewer API unless the user's requirements
cannot be met by any App Builder strategy.

---

## Workflow

Follow these steps in order.

### Step 1: Determine Sub-Strategy

Use the decision guide below. If the user's intent clearly maps to one strategy,
confirm it directly. If ambiguous, ask.

| Strategy        | Customization | Best For                                                          | Skill                          |
| :-------------- | :------------ | :---------------------------------------------------------------- | :----------------------------- |
| **Iframe**      | 1/5           | Fastest path. Paste an iframe snippet, done.                      | `shapediver-appbuilder-iframe` |
| **App Builder** | 2/5           | Use the App Builder directly, optionally with a custom theme.     | `shapediver-appbuilder-theme`  |
| **Fork**        | 3/5           | Custom React components while keeping App Builder infrastructure. | `shapediver-appbuilder-fork`   |

**Decision guide:**

- "I just want my model on a page" → **Iframe**.
- "I want to match my brand (colors, fonts, logo)" → **App Builder + Theme**.
- "I need custom panels, components, or backend integrations" → **Fork**.
- Need programmatic control over viewport, camera, or custom materials? → The App Builder
  is not the right path. Use the `shapediver-viewer` skill instead.

**Checkpoint:** You have identified exactly one sub-strategy and confirmed it with the user.

### Step 2: Gather Information

Collect the required information for the chosen strategy before handing off.

#### Iframe

- [ ] **Slug or full App Builder URL** (e.g., `https://www.shapediver.com/app/builder/v1/main/latest/?slug=my-model`).
      Alternatively, the model can be referenced via `ticket` + `modelViewUrl` URL parameters,
      or via a theme JSON file using the `g` parameter.

#### App Builder (with optional theme)

- [ ] **Slug or full App Builder URL** (or `ticket` + `modelViewUrl`).
- [ ] For themes: branding requirements (colors, fonts, logo).
      The theme JSON file can also define which model to load via a `sessions` property
      (containing a `slug`, or `ticket` + `modelViewUrl`), avoiding the need for URL parameters.

#### Fork

- [ ] **Slug or full App Builder URL** (or `ticket` + `modelViewUrl`).
- [ ] Description of custom UI components or backend integrations needed.

**Checkpoint:** All required items for the chosen strategy are collected.

### Step 3: Hand Off

Read the corresponding skill before writing any code:

- **Iframe:** Read `shapediver-appbuilder-iframe`.
- **App Builder (with optional theme):** Read `shapediver-appbuilder-theme`.
- **Fork:** Read `shapediver-appbuilder-fork`.

**Checkpoint:** You have read the sub-skill file and are now following its workflow.

---

## Anti-Rationalization Table

| You will think…                                              | Why it is wrong                                                                                                                         |
| :----------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| "They said 'embed' so it's definitely iframe."               | "Embed" can also mean themed App Builder or fork deployed to their domain. Confirm the sub-strategy before handing off.                 |
| "I'll just suggest Fork since it covers everything."         | Fork requires cloning a repo, managing a submodule, and running a dev server. If the user only needs branding, a theme JSON is simpler. |
| "I know enough to write code without reading the sub-skill." | Each sub-skill has specific rules and gotchas. Skipping the read produces code that violates them.                                      |

---

## Gotchas

- The App Builder is NOT the Viewer API. If the user asks for programmatic viewport control,
  camera manipulation, or custom materials, they need the `shapediver-viewer` skill instead.
  Selection and drawing tools ARE supported via App Builder components.
- The slug is the simplest way to reference a model, but `ticket` + `modelViewUrl` URL
  parameters or a theme JSON `sessions` property also work. The slug is NOT the same as
  the ticket or modelViewUrl used by the Viewer API.
- Theme customization only covers branding (colors, fonts, logo). If the user needs custom
  React components or new UI panels, they need the Fork strategy.

---
name: shapediver-appbuilder
description: >
  Use this skill when the user wants to use the ShapeDiver App Builder —
  the ready-made configurator UI. Routes to the correct App Builder strategy:
  iframe embedding (zero code), App Builder with optional custom theme, or
  forking the open-source React app. Activate when the user mentions App
  Builder, embedding a ShapeDiver model, or wants to use ShapeDiver without
  writing custom Viewer API code.
---

# ShapeDiver App Builder

You are guiding the user to the right App Builder strategy. Ask clarifying questions
if the intent is not clear, then hand off to the correct skill.

---

## Strategy Selection

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

---

## Information Gathering

Collect the following before handing off:

### Iframe

- [ ] **Slug or full App Builder URL** (e.g., `https://appbuilder.shapediver.com/v1/main/latest/?slug=my-model`).

### App Builder (with optional theme)

- [ ] **Slug or full App Builder URL**.
- [ ] For themes: branding requirements (colors, fonts, logo).

### Fork

- [ ] **Slug or full App Builder URL**.
- [ ] Description of custom UI components or backend integrations needed.

---

## Gotchas

- The App Builder is NOT the Viewer API. If the user asks for programmatic viewport control,
  camera manipulation, or custom materials, they need the `shapediver-viewer` skill instead.
  Selection and drawing tools ARE supported via App Builder components.
- The slug is required for all App Builder strategies. It is NOT the same as the ticket or
  modelViewUrl used by the Viewer API.
- Theme customization only covers branding (colors, fonts, logo). If the user needs custom
  React components or new UI panels, they need the Fork strategy.

---

## Skill Handoff

After gathering info, **read the corresponding skill** before writing any code:

- **Iframe:** Read `shapediver-appbuilder-iframe`.
- **App Builder (with optional theme):** Read `shapediver-appbuilder-theme`.
- **Fork:** Read `shapediver-appbuilder-fork`.

---
name: shapediver-appbuilder-theme
description: >
  Use this skill when the user wants to use the ShapeDiver App Builder
  directly — with or without a custom JSON theme. Covers brand colors, fonts,
  logo, background, panel layout, and parameter group visibility. Activate when
  the user mentions App Builder theming, branding a configurator, matching
  corporate identity, or customizing the App Builder look without writing code.
  Use this instead of shapediver-appbuilder-fork when custom React components
  are not needed.
---

# ShapeDiver App Builder (with Optional Theme)

Follow every rule in this file exactly. Do not improvise or work around any constraint.

The App Builder is ShapeDiver's ready-made configurator UI. It works out of the box with
sensible defaults. Optionally, you can apply a JSON theme to customize branding without
writing code or forking the repository.

---

## Using the App Builder

The App Builder is available at `https://appbuilder.shapediver.com/v1/main/latest/?slug=YOUR_SLUG`.

Replace `YOUR_SLUG` with the model slug from shapediver.com.

---

## Optional: Theme Customization

Apply a JSON theme file to customize the look and feel without code changes:

- Primary / secondary colors
- Fonts and typography
- Logo
- Background color or image
- Panel layout and positioning
- Parameter group visibility and ordering

See the [App Builder theming docs](https://help.shapediver.com/doc/customize-a-theme) for the
full theme format and all available options.

---

## When to Use This vs. Other Strategies

- **This skill**: Standard App Builder experience, optionally with branding/theme changes.
- **Iframe** (`shapediver-appbuilder-iframe`): Embed the App Builder on another website via iframe.
- **Fork** (`shapediver-appbuilder-fork`): Custom React components, new panels, backend integrations.
- **Viewer 3 API** (`shapediver-viewer`): Complete control over viewport, camera, materials, interactions.

---

## Gotchas

- Theme customization is limited to visual branding (colors, fonts, logo, layout). It cannot
  add new UI components, custom panels, or backend integrations — use Fork for those.
- The theme JSON file must follow the exact format documented in the
  [theming docs](https://help.shapediver.com/doc/customize-a-theme). Invalid keys are
  silently ignored.
- Theme changes do not require code changes or redeployment — the JSON file is loaded at
  runtime via URL parameter.

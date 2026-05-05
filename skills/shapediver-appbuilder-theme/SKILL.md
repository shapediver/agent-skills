---
name: shapediver-appbuilder-theme
description: >
  Use this skill when the user wants to use the ShapeDiver App Builder
  directly — with or without a custom JSON theme. Covers brand colors, fonts,
  logo, background, panel layout, and component-level overrides. Activate when
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

Apply a JSON theme file by passing its URL via the `g` query string parameter:
`https://appbuilder.shapediver.com/v1/main/latest/?slug=YOUR_SLUG&g=theme.json`

The `g` value can be a relative or absolute URL. When self-hosting the file, use an absolute URL.

### Theme JSON Structure

The theme JSON file supports these top-level properties:

| Property             | Required | Description                                                                                                                                                              |
| :------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`            | **Yes**  | Must be `"1.0"`.                                                                                                                                                         |
| `sessions`           | No       | Array of session definitions. Allows defining the model to load by `slug` or by `ticket` + `modelViewUrl`, avoiding URL parameters. Currently supports a single session. |
| `themeOverrides`     | No       | Overrides for UI theme properties (appearance). See below.                                                                                                               |
| `appBuilderOverride` | No       | Overrides the JSON content of the `AppBuilder` data output from the Grasshopper model. Useful for local testing.                                                         |

### Theme Overrides

The `themeOverrides` property accepts all [Mantine theme object](https://mantine.dev/theming/theme-object/) properties. Common customizations:

- Primary / secondary colors
- Fonts and typography
- Logo (via `ViewportBranding` component overrides)
- Background color or image
- Panel layout and positioning (via `AppBuilderAppShellTemplatePage` component overrides)
- Viewport icon placement and visibility (via `ViewportIcons` / `ViewportOverlayWrapper`)
- Container styling (via `AppBuilderContainerWrapper`)
- Page template selection (via `AppBuilderTemplateSelector` — choose `appshell` or `grid`)

Component-level overrides use Mantine's `components` property to set default props for both
Mantine components and App Builder components. See the
[default theme source](https://github.com/shapediver/AppBuilderShared/blob/development/hooks/ui/useCustomTheme.ts)
for all available component overrides.

See the [App Builder theming docs](https://help.shapediver.com/doc/customize-a-theme) for the
full theme format, examples, and all available options.

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
  runtime via the `g` URL parameter.
- **Blue accent persists even without a custom palette.** Mantine's default `primaryColor`
  is `"blue"`. Removing a custom color palette does not neutralize it. To suppress the blue
  accent on sliders, checkboxes, tabs, etc., you must also explicitly set `"primaryColor"`
  to `"gray"` (a built-in Mantine neutral) or define a full 10-shade custom palette under a
  new name and point `primaryColor` at it.
- **`forceColorScheme` overrides the user's system preference.** Setting
  `themeOverrides.other.forceColorScheme` to `"dark"` or `"light"` locks the color scheme
  for all users regardless of their OS setting. Only use this when a specific scheme is a
  deliberate design requirement, not as a default.

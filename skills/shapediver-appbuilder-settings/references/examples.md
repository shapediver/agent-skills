# Settings JSON examples (profiles)

Copy only the profile you need. Combine profiles by merging top-level keys.

## Minimal brand

`configPath`: *(top-level only — `definitions.MantineThemeOverride`)*

User wants a single primary color (blue example):

```json
{
  "version": "1.0",
  "themeOverrides": {
    "primaryColor": "brand",
    "colors": {
      "brand": [
        "#f0f4ff", "#d9e2ff", "#b3c5ff", "#8da8ff",
        "#668bff", "#406eff", "#1a51ff", "#1541cc",
        "#103199", "#0c2166"
      ]
    }
  }
}
```

**Red / hex primary** — derive 10 shades from the user's hex (lightest → darkest); use a custom key (e.g. `"brand"`), not Mantine built-in `"red"` unless they want default Mantine red:

```json
{
  "version": "1.0",
  "themeOverrides": {
    "primaryColor": "brand",
    "colors": {
      "brand": [
        "#ffe5e5", "#ffb3b3", "#ff8080", "#ff4d4d",
        "#ff1a1a", "#e60000", "#cc0000", "#b30000",
        "#800000", "#4d0000"
      ]
    }
  }
}
```

> **Every file needs `sessions`:** Merge a `sessions` block (Step 1b) into every deliverable — snippets below show `themeOverrides` only for brevity.

## Typography only

`configPath`s: `themeOverrides.components.Text.defaultProps`, `themeOverrides.components.Button.defaultProps`  
(Property shapes: `definitions` for Mantine core keys not in `entries`; nested bags use entry `properties` + `$ref`.)

```json
{
  "version": "1.0",
  "themeOverrides": {
    "fontFamily": "'Montserrat', sans-serif",
    "components": {
      "Text": {
        "defaultProps": { "fw": "300", "size": "sm" }
      },
      "Button": {
        "defaultProps": { "fw": "400" }
      }
    }
  }
}
```

> **Note:** `themeOverrides.headings` requires all fields (`fontFamily`, `fontWeight` as string, `textWrap`, `sizes.h1`–`h6`) when present — see `definitions.MantineThemeOverride` in doc-flat. For a minimal typography tweak, set top-level `fontFamily` only.

## Appshell layout (bottom action bar)

`configPath`s:
- `themeOverrides.components.AppBuilderTemplateSelector.defaultProps`
- `themeOverrides.components.AppBuilderAppShellTemplatePage.defaultProps`

```json
{
  "version": "1.0",
  "themeOverrides": {
    "components": {
      "AppBuilderTemplateSelector": {
        "defaultProps": { "template": "appshell" }
      },
      "AppBuilderAppShellTemplatePage": {
        "defaultProps": {
          "rows": { "base": 10, "md": 19 },
          "bottomFullWidth": true,
          "rightBorder": false,
          "keepBottomInGrid": true
        }
      }
    }
  }
}
```

## Nested bottom bar grid

Parent: `themeOverrides.components.AppBuilderContainerWrapper.defaultProps`  
Child: `themeOverrides.components.AppBuilderHorizontalContainer.defaultProps`  
(JSON path adds `.containerThemeOverrides.appshell.bottom.components` between parent `defaultProps` and child component name.)

```json
{
  "version": "1.0",
  "themeOverrides": {
    "components": {
      "AppBuilderContainerWrapper": {
        "defaultProps": {
          "containerThemeOverrides": {
            "appshell": {
              "bottom": {
                "components": {
                  "AppBuilderHorizontalContainer": {
                    "defaultProps": {
                      "pt": 0,
                      "pb": 0,
                      "styles": {
                        "root": {
                          "grid-template-columns": "1fr auto auto",
                          "display": "grid",
                          "align-items": "start"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Viewport icon controls

`configPath`: `themeOverrides.components.ViewportIcons.defaultProps`

```json
{
  "version": "1.0",
  "themeOverrides": {
    "components": {
      "ViewportIcons": {
        "defaultProps": {
          "color": "#670000",
          "enableArBtn": true,
          "enableCamerasBtn": false,
          "enableFullscreenBtn": false,
          "enableZoomBtn": true
        }
      }
    }
  }
}
```

## Self-contained session + theme

```json
{
  "version": "1.0",
  "sessions": [
    {
      "id": "default",
      "slug": "<from user>"
    }
  ],
  "themeOverrides": {
    "primaryColor": "gray"
  }
}
```

Use `primaryColor: "gray"` to suppress Mantine's default blue accent without defining a custom palette.

## appBuilderOverride — sticky tabs + action tooltip

Committed reference for `appBuilderOverride` structure and tab/action `tooltip`s:
`public/example-appBuilderOverride.json`.

Minimal inline pattern (including `stickyTabs` — not present in that committed file):

```json
{
  "version": "1.0",
  "appBuilderOverride": {
    "version": "1.0",
    "containers": [
      {
        "name": "left",
        "stickyTabs": true,
        "tabs": [],
        "widgets": [
          {
            "type": "controls",
            "props": {
              "controls": [
                {
                  "type": "parameter",
                  "props": { "name": "Width" }
                },
                {
                  "type": "action",
                  "props": {
                    "definition": {
                      "type": "addToCart",
                      "props": {
                        "description": "Line item description",
                        "tooltip": "Add item to cart"
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

## Invalid example (will fail strict validation)

`configPath`: `themeOverrides.components.Button.defaultProps`  
Allowed keys: `definitions.ButtonProps` (`fw`, not `fontWeight`; no `onClick`).

```json
{
  "version": "1.0",
  "themeOverrides": {
    "components": {
      "Button": {
        "defaultProps": {
          "onClick": "notAllowed",
          "unknownProp": true
        }
      }
    }
  }
}
```

`Button` overrides use `definitions.ButtonProps` — `onClick` is not serializable and `unknownProp` is not listed.

## Invalid wrap on horizontal container

`configPath`: `themeOverrides.components.AppBuilderHorizontalContainer.defaultProps`  
`wrap` must be `nowrap`, `wrap`, or `wrap-reverse` — not `flex`.

```json
{
  "version": "1.0",
  "themeOverrides": {
    "components": {
      "AppBuilderHorizontalContainer": {
        "defaultProps": { "wrap": "flex" }
      }
    }
  }
}
```

Use `"wrap": "wrap"` when flex-like line breaking is intended.

## Reference fixtures (fork repo only — not bundled with skill)

Requires cloning `ShapeDiverCreateReactAppExample`. Verify with `git ls-files public/*.json` before linking.  
With a fork clone: `pnpm run validate:settings -- public/<file>.json` after saving the config.

| File | Demonstrates | Validates |
| :--- | :----------- | :-------- |
| `public/example-appBuilderOverride.json` | `appBuilderOverride`, tabs, parameter `tooltip`s | yes |
| `public/example-themeOverrides-appshellTemplateExample01.json` | Appshell template layout | yes |
| `public/example-sessions-slug.json` | Self-contained `sessions` with `slug` | yes |
| `public/example-sessions-ticket.json` | Self-contained `sessions` with `ticket` + `modelViewUrl` | yes |
| `public/blank.json` | Minimal valid settings shell | yes |
| `public/SS-9463.json` | Broad widget-type `appBuilderOverride` fixture | yes |
| `public/theme08.json` | Full brand + nested `containerThemeOverrides` (visual reference; `headings.fontWeight` may fail strict validation) | partial |
| Viewport icons profile | See [Viewport icon controls](#viewport-icon-controls) inline JSON above | yes |

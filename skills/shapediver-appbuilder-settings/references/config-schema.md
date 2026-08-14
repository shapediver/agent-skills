# Settings JSON schema (authoring reference)

App Builder settings JSON is validated by `validateAppBuilderSettingsJson` in
`src/shared/features/appbuilder/config/appbuildertypecheck.ts` (submodule).
Hooks call it through `parseAppBuilderSettingsJson` when `VITE_VALIDATE_SETTINGS`
is `true` or `1`.

## Top level

```json
{
  "version": "1.0",
  "sessions": [ /* required */ ],
  "themeOverrides": { /* optional */ },
  "appBuilderOverride": { /* optional */ }
}
```

| Field | Required | Notes |
| :---- | :------- | :---- |
| `version` | **Yes** | Must be exactly `"1.0"`. |
| `sessions` | **Yes** | Array with `id` + `slug` **or** `ticket` + `modelViewUrl`. Required in every settings file (this skill). |
| `themeOverrides` | No | Mantine theme object + `components` record. |
| `appBuilderOverride` | No | Full `IAppBuilder` layout; validated once inside settings parse. |

## sessions

```json
"sessions": [
  {
    "id": "default",
    "slug": "<from user — never ship placeholder>"
  }
]
```

Or ticket-based (values from the model **Edit → Developers** tab on shapediver.com):

```json
{
  "id": "default",
  "ticket": "<embedding ticket from Developers tab>",
  "modelViewUrl": "<Geometry Backend URL from Developers tab>",
  "acceptRejectMode": false
}
```

Use `sessions` so the JSON file is self-contained (no `slug` in the URL).

**When creating a new config file**, the agent must **ask the user** for **slug** or **ticket + modelViewUrl** in the **first reply** before any settings JSON.

**Source rule:** Use only values the **user provided in this conversation**, or existing `sessions` in the **target** file. Do **not** copy from other `public/*.json`, examples, or skill text; do **not** invent or guess `ticket` / `modelViewUrl`. Option B needs **both** fields from the user — if one is missing, ask; do not fill it from fixtures or defaults.

For **ticket + modelViewUrl**, tell the user they are on the model **Edit → Developers** tab at shapediver.com if they need to look them up.

Tickets the user provides for local fork testing belong in `sessions`. Warn against committing production tickets to git.

## themeOverrides

Accepts standard [Mantine theme](https://mantine.dev/theming/theme-object/) fields:

- `primaryColor`, `colors`, `fontFamily`, `headings`, `defaultRadius`, `white`, `black`
- `other.defaultFontWeight`, `other.forceColorScheme` (use sparingly)
- `components` — per-component `defaultProps`

### components

```json
"themeOverrides": {
  "components": {
    "Button": {
      "defaultProps": {
        "fw": "400",
        "fz": { "base": "12px", "md": "14px" }
      }
    }
  }
}
```

**Validation policy:**

- Documented `configPath` entries → `defaultProps` validated with strict Zod (must match doc-flat `properties` + resolved `$ref`s).
- Undocumented component keys → opaque `JsonValue` (allowed, not deep-validated).

Error paths look like:

`themeOverrides.components.Button.defaultProps.fz.base`

Map each segment to `configPath` in doc-flat. Find the entry or resolve `$ref` in `definitions` (see [doc-flat.md](doc-flat.md)).

### containerThemeOverrides (nested)

Used on `AppBuilderContainerWrapper` to style containers per page template:

```json
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
                "styles": { "root": { "display": "grid" } }
              }
            }
          }
        }
      }
    }
  }
}
```

Template names match `AppBuilderTemplate` ids (`appshell`, `grid`, …). Container names match layout regions (`left`, `right`, `bottom`, …).

Recursive validation walks every nested `components` object. Look up each component's shape via its `configPath` in `ShapeDiverCreateReactAppExample/public/doc-flat.json` (see [doc-flat.md](doc-flat.md)).

## appBuilderOverride

Replaces the Grasshopper **AppBuilder** data output when present in settings JSON.
Shape matches the model's App Builder skeleton:

```json
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
                      "description": "Line item",
                      "tooltip": "Add to cart"
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
```

Common widget `type` values: `controls`, `actions`, `stackUi`, `viewport`, … — must match types the App Builder runtime supports.

Validated fields include:

- `containers[].stickyTabs` (boolean)
- `setParameterValues` action `message`
- `tooltip` on action definitions inside `controls`

Parameter `name` values must match real model parameters when testing against a live session.

## Serializable Mantine subset (theme JSON)

Allowed in registered `defaultProps`:

| Allowed | Not allowed |
| :------ | :---------- |
| strings, numbers, booleans, null | functions, refs |
| JSON objects and arrays | `children`, render props |
| `styles` / responsive `{ base, xs, sm, md, lg, xl }` | `onClick`, `leftSection`, `ReactNode` labels |

## Validation commands (fork repo only)

Requires cloning [ShapeDiverCreateReactAppExample](https://github.com/shapediver/ShapeDiverCreateReactAppExample) and initializing the `src/shared` submodule (`git submodule update --init`).

**Full runtime guide:** [validation-runtime.md](validation-runtime.md) — cold start vs Zod, forbidden patterns, browser vs CLI.

### CLI (primary for agents)

```bash
cd ShapeDiverCreateReactAppExample
pnpm run validate:settings -- public/my-config.json
```

| Detail | Value |
| :----- | :---- |
| Implementation | `scripts/validate-settings-json.mjs` → runner → `validateAppBuilderSettingsJson` |
| Wall time | Mostly **cold start** (~2–15s); Zod itself is ~7ms once loaded |
| Hard timeout | **30s** |
| Agent `block_until_ms` | **≤ 45000**; one run per edit cycle |

**Agent rules:**

- Use **only** `pnpm run validate:settings` for per-file checks.
- **Never** `pnpm exec tsx -e "…"` (especially multiline on Windows) — quoting breaks, false exit 0.
- **Never** ad-hoc `import` of `appbuildertypecheck.ts` — use the dedicated CLI.
- Do **not** run `pnpm test` / Jest for a single file.

Exit code 0 + stdout `Settings JSON valid: …` = valid. Exit 1 = invalid JSON, missing file, or timeout. Zod paths match `configPath` in doc-flat (e.g. `themeOverrides.components.Button.defaultProps`).

### Browser (when dev server is running)

Set `VITE_VALIDATE_SETTINGS=true` in `.env`, restart Vite, reload `http://localhost:3000/?g=/my-config.json`. Fastest iteration when `pnpm start` is already up.

### Jest regression (maintainers only)

```bash
pnpm test -- validateSkillExamples.test.ts
```

Requires the fork in the workspace. Without it, tell the user to clone [ShapeDiverCreateReactAppExample](https://github.com/shapediver/ShapeDiverCreateReactAppExample) before authoring or validating `defaultProps`.

## Loading the file

See **[preview-urls.md](../preview-urls.md)** for full rules. Short version:

| Context | Preview URL pattern |
| :------ | :------------------ |
| Fork dev server | `http://localhost:3000/?g=/my-settings.json` |
| Hosted App Builder | `https://appbuilder.shapediver.com/v1/main/latest/?g=https://host/my-settings.json` |
| Live tweak | `window.updateTheme({ themeOverrides: { … } })` (iteration only) |

**Parameter name is `g`, not `settingsUrl`.** Files in `public/` are served at `/filename.json`, not `/public/filename.json`.

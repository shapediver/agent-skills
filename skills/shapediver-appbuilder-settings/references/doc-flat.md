# Config reference — `doc-flat.json`

**Canonical source:** `ShapeDiverCreateReactAppExample/public/doc-flat.json`  
(regenerated with `pnpm run docs` in the fork repo)

The fork must be in the workspace to look up properties. If it is not available, tell the user to clone [ShapeDiverCreateReactAppExample](https://github.com/shapediver/ShapeDiverCreateReactAppExample) or add it to the workspace — do not use a stale bundled copy.

**Read locally, do not fetch remotely:** When `ShapeDiverCreateReactAppExample` is in the workspace, open `public/doc-flat.json` (and other `public/*.json` references) with `Read` / `Grep` on disk. Do not `WebFetch` GitHub raw or blob URLs for files that exist locally.

Use **`configPath`** as the primary key for discovering what to put in settings JSON and how deep to nest it. Do not maintain a hand-written component list — read the JSON file.

Companion: `public/doc-nested.json` mirrors the same data nested by `configPath` segments (human browsing). Prefer **`doc-flat.json`** for lookup and `$ref` resolution.

**Link rule:** When citing `public/*.json` fixtures in prose, use only paths returned by `git ls-files public/` in the fork repo.

---

## File shape

```json
{
  "definitions": { /* shared type schemas */ },
  "entries": [ /* one row per documented theme surface */ ],
  "entriesByCategory": { /* configPath index by FSD layer */ }
}
```

| Section | Role |
| :------ | :--- |
| `definitions` | OpenAPI-style schemas: `ButtonProps`, `GroupProps`, `MantineFlexWrap`, `MantineThemeOverride`, … |
| `entries` | Documented `defaultProps` bags — each row has a unique `configPath` |
| `entriesByCategory` | `entity`, `feature`, `page`, `shared`, `widget` → list of `configPath` strings |

All documented theme surfaces appear in the `entries` array (one row per component). Search `entries` by `name` or browse `entriesByCategory` in `doc-flat.json`. Only components tagged `@docAttached` + `@configPath` in source are included.

---

## Entry fields

Each `entries[]` item:

| Field | Use |
| :---- | :-- |
| `configPath` | **Dot path = exact JSON location** for this `defaultProps` object |
| `name` | Component theme key (matches `useProps` first argument) |
| `category` | `page` / `widget` / `entity` / `feature` / `shared` |
| `properties` | Allowed keys: `name`, `description`, `type`, optional `default` / `enum` |
| `summary` | Short purpose text |
| `source` | TypeScript file that owns the schema |

Example entry:

```json
{
  "configPath": "themeOverrides.components.ViewportIcons.defaultProps",
  "name": "ViewportIcons",
  "category": "entity",
  "properties": [
    { "name": "enableArBtn", "type": { "type": "boolean" } },
    { "name": "color", "type": { "type": "string" } }
  ]
}
```

---

## Navigate by `configPath`

### Rule: split on `.` → JSON nesting

`configPath` segments map 1:1 to object keys in the settings file:

```
themeOverrides.components.ViewportIcons.defaultProps
        │          │              │            │
        ▼          ▼              ▼            ▼
{ "themeOverrides": { "components": { "ViewportIcons": { "defaultProps": { … } } } } }
```

**Workflow when authoring:**

1. Find the entry (search `entries` by `name` or browse `entriesByCategory`).
2. Copy its `configPath` — that is where your `defaultProps` object lives.
3. Only add property keys listed in `entry.properties` (resolve `$ref` — see below).
4. Zod validation error paths match `configPath` + `.` + property segments.

### Discover by category (`entriesByCategory`)

| Category | Typical surfaces |
| :------- | :--------------- |
| `page` | `AppBuilderTemplateSelector`, `AppBuilderAppShellTemplatePage`, `AppBuilderContainerWrapper`, horizontal/vertical containers, `LoaderPage` |
| `widget` | `AppBuilderControlsWidgetComponent`, `AppBuilderStackUiWidgetComponent`, charts, forms, `AppBuilderTextWidgetComponent` |
| `entity` | `ViewportIcons`, `ViewportBranding`, parameter controls, exports, stargate |
| `feature` | `NotificationWrapper`, `CreateModelStateHook`, `AppBuilderActionComponent` |
| `shared` | `Icon`, `TooltipWrapper`, `MarkdownWidgetComponent`, `ModalBase`, `Hint` |

---

## Nested `containerThemeOverrides`

`AppBuilderContainerWrapper` entry:

- `configPath`: `themeOverrides.components.AppBuilderContainerWrapper.defaultProps`
- Property `containerThemeOverrides` → `$ref: ThemeOverridePerContainerType` (opaque in definitions)

**Compose nested paths manually** by extending the parent path:

```
{parent configPath}.containerThemeOverrides.{template}.{container}.components.{ChildName}.defaultProps
```

Example (from `theme08.json`):

```
themeOverrides.components.AppBuilderContainerWrapper.defaultProps
  .containerThemeOverrides.appshell.bottom.components
  .AppBuilderHorizontalContainer.defaultProps
```

For the **child** `defaultProps` shape, look up the child entry:

`themeOverrides.components.AppBuilderHorizontalContainer.defaultProps`

→ properties: `w`, `h`, `wrap` (`MantineFlexWrap` enum), `pt`, `pb`, `styles`, …

---

## Resolve `$ref` in `definitions`

When `property.type` is `{ "$ref": "#/definitions/ButtonProps" }`:

1. Open `definitions.ButtonProps.properties`.
2. Only those keys are valid inside that nested bag (e.g. `buttonProps` on `ExportButtonComponent`).

Common definitions:

| `$ref` | Valid keys (examples) |
| :----- | :-------------------- |
| `ButtonProps` | `fw`, `mt`, `fz`, `h`, `variant`, `size`, `fullWidth` — **not** `fontWeight` |
| `GroupProps` | `w`, `h`, `justify`, `wrap`, `gap`, `p`, `styles` |
| `MantineFlexWrap` | `nowrap`, `wrap`, `wrap-reverse` only |
| `MantineSpacing` | `xs` \| `sm` \| `md` \| `lg` \| `xl` \| string \| number |
| `MantineResponsiveCssSize` | string \| number \| `{ base, xs, sm, md, lg, xl }` |
| `TooltipProps` | `label` (string), `position`, `withArrow`, … |
| `StackProps` | `gap`, `p`, `align`, `justify` |
| `PaperProps` | `withBorder`, padding, shadow fields |

Strict Zod validation (registered keys) rejects keys not in the resolved schema.

---

## Top-level `themeOverrides` (no component entry)

Global Mantine theme fields (`primaryColor`, `colors`, `fontFamily`, `headings`, `defaultRadius`, …) are in `definitions.MantineThemeOverride` — not in `entries`.

`themeOverrides.components.Button.defaultProps` is **not** a separate `entries` row, but `definitions.ButtonProps` documents allowed keys when you override Mantine `Button` at the theme level (also covered by `mantine-props` Zod registry).

---

## Lookup

Open **`ShapeDiverCreateReactAppExample/public/doc-flat.json`** in the editor and search:

- `entries` → find `"name": "ViewportIcons"` (or any component)
- `entriesByCategory.page` → list page-level `configPath`s
- `definitions.ButtonProps` → allowed keys for Button overrides

```bash
# From fork repo root — find entry by component name
node -e "
const d=require('./public/doc-flat.json');
const name='ViewportIcons';
console.log(d.entries.find(e=>e.name===name));
"
```

---

## Map validation errors → doc-flat

| Zod error path | doc-flat action |
| :------------- | :-------------- |
| `themeOverrides.components.Button.defaultProps.fontWeight` | Use `fw` per `definitions.ButtonProps` |
| `…AppBuilderHorizontalContainer.defaultProps.wrap` | Check `definitions.MantineFlexWrap.enum` |
| `…ViewportIcons.defaultProps.unknownKey` | Remove key — not in that entry's `properties` |
| Nested `…containerThemeOverrides…AppBuilderHorizontalContainer…` | Same as top-level `AppBuilderHorizontalContainer` entry |

---

## Regenerating

After submodule theme-prop changes, refresh the fork catalog:

```bash
cd ShapeDiverCreateReactAppExample
pnpm run docs
```

Commit updated `public/doc-flat.json` in the fork when docs change.

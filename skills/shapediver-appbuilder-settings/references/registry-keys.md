# Theme component registry keys

Registered keys in `themeComponentDefaultPropsRegistry.ts` get **strict**
`defaultProps` validation. The key string must match the first argument passed
to `useProps` / `usePropsAppBuilder` in the component implementation.

When working in a fork, refresh this list:

```bash
rg "^\s+\w+:" src/shared/features/appbuilder/config/themeComponentDefaultPropsRegistry.ts
```

## Mantine core (mantine-props mirrors)

| Registry key | Schema source | Common defaultProps |
| :----------- | :------------ | :------------------ |
| `Button` | `mantineButtonPropsSchema` | `fw`, `mt`, `fz`, `h`, `variant`, `size`, `fullWidth` |
| `Text` | `mantineTextPropsSchema` | `fw`, `size` |
| `Paper` | `mantinePaperPropsSchema` | `withBorder` |
| `Accordion` | `mantineAccordionPropsSchema` | `styles.label.fontWeight` |
| `Group` | `mantineGroupPropsSchema` | `w`, `h`, `justify`, `wrap`, `p`, `pt`, `pb`, `styles` |

`wrap` on Group / horizontal containers: only `nowrap`, `wrap`, `wrap-reverse`.

Responsive sizes use:

```json
{ "base": "12px", "md": "14px" }
```

## App Builder layout / containers

| Registry key | Purpose |
| :----------- | :------ |
| `AppBuilderTemplateSelector` | `template`: `"appshell"` or `"grid"` |
| `AppBuilderAppShellTemplatePage` | `rows`, `bottomFullWidth`, `rightBorder`, `keepBottomInGrid` |
| `AppBuilderContainerWrapper` | `containerThemeOverrides` tree |
| `AppBuilderContainer` | Container chrome / orientation-related props |
| `AppBuilderHorizontalContainer` | Same schema as `Group` (horizontal layout) |
| `AppBuilderVerticalContainer` | Vertical stack layout props |
| `LoaderPage` | Loading screen styling |

## App Builder UI components (thin / app-owned schemas)

| Registry key | Typical defaultProps |
| :----------- | :------------------- |
| `Icon` | `size` (CSS length string) |
| `ExportLabelComponent` | `fontWeight` |
| `ParameterLabelComponent` | `fontWeight` |
| `MarkdownWidgetComponent` | `boldFontWeight`, `strongFontWeight` |
| `ParameterColorComponent` | color-picker-specific props |
| `ParameterSliderComponent` | slider styling |
| `ParameterSelectionComponent` | selection UI props |
| `ParameterDraggingComponent` | dragging UI props |
| `ParameterGumballComponent` | gumball UI props |
| `NotificationWrapper` | notification styling |
| `StargateShared` | stargate shared styling |
| `CreateModelStateHook` | model-state hook theme props |
| `ViewportIcons` | `color`, `enableArBtn`, `enableCamerasBtn`, `enableFullscreenBtn`, `enableZoomBtn` |
| `AppBuilderImage` | `withBorder` |
| `OutputChunkLabelComponent` | label styling |

## Composed widgets (mantine-props nested)

| Registry key | Nested bags |
| :----------- | :---------- |
| `AppBuilderStackUiWidgetComponent` | `stackPaperProps`, `stackProps`, `buttonForwardProps`, `buttonBackProps`, `itemTextProps`, `iconForwardProps` |
| `TooltipWrapper` | Mantine tooltip mirror (`label` as string only) |

Each nested `*Props` field uses the corresponding `mantine*PropsSchema` or `Icon` schema.

## Keys commonly in public JSON but not always registered

These may appear in `theme08.json` or custom themes. If **not** in the registry,
`defaultProps` are not strictly validated:

- `AppBuilderTextWidgetComponent`
- `ViewportBranding`
- `ViewportOverlayWrapper`

Prefer checking the registry before assuming strict validation applies.

## Fixing "Unrecognized key" errors

1. Read the Zod path: `themeOverrides.components.<Key>.defaultProps.<badKey>`.
2. Open the schema for `<Key>`:
   - Mantine keys → `src/shared/shared/mantine-props/<component>.ts`
   - App keys → `*.types.ts` next to the component
3. Either rename/remove `<badKey>` or use a supported alias documented in the schema.
4. Re-run `pnpm test -- validateAppBuilderSettingsJson`.

## Extending the registry (maintainers only)

Not for end-user config authors. Requires submodule change:

1. Add or extend `*.schema-input.ts` in `mantine-props/` or component `*.types.ts`.
2. Register in `themeComponentDefaultPropsRegistry.ts`.
3. Add Jest fixture in `validateAppBuilderSettingsJson.themeComponents.test.ts`.

---
name: shapediver-appbuilder-settings
description: >
  HARD GATE: If the user did not provide model slug OR ticket+modelViewUrl, your
  FIRST response must ONLY ask for them — no settings JSON, no themeOverrides,
  no preview URL, no npm run start. Never copy or invent ticket/modelViewUrl —
  ask the user. After credentials: configure and validate App Builder settings
  JSON (themeOverrides, appBuilderOverride, sessions).
  Use for public/*.json, validation errors, doc-flat configPath. Fork required.
license: MIT
---

# App Builder Settings JSON

## ⛔ STEP 0 — CREDENTIALS GATE (non-negotiable)

**Read [credentials-gate.md](references/credentials-gate.md) now.**

Before **any** other step in this skill — before `doc-flat.json`, before `examples.md`, before `themeOverrides`, before `validate:settings`, before `npm run start`, before a preview URL:

```
IF user message lacks slug AND lacks (ticket + modelViewUrl)
AND target file lacks real sessions (read TARGET file only if editing)
THEN → reply ONLY with the credential question below
       → END TURN (do not continue workflow)

NEVER pass Step 0 because sessions exist in a DIFFERENT public/*.json
(e.g. example-ecommerce-2.json, SS-*.json). That is NOT the target file.
```

**Credential question (when Step 0 triggers — this is your WHOLE reply):**

> I need your model reference for the required `sessions` block before I can create or update the settings file.
>
> Please provide **one** of:
> - **Slug** — from your model URL on shapediver.com  
> - **Ticket + modelViewUrl** — from the model **Edit → Developers** tab (embedding ticket + Geometry Backend URL)
>
> Once you send that, I'll apply your requested changes.

**If Step 0 triggers, you failed this skill if your reply contains:** JSON, `themeOverrides`, `sessions` with placeholders, filenames under `public/`, `npm run start`, `?g=`, **Grep/Read of doc-flat or fixtures for theme/stack**, or **"credentials already in …"** referencing another JSON file.

**Step 0 passes when:** user already gave slug or ticket + `modelViewUrl` in **this** message, OR the **target** file you are editing already has real `sessions` — **not** because some other `public/*.json` has `sessions`.

---

> **Prerequisite:** For hosted App Builder URLs and `g=` theme delivery, read
> `shapediver-appbuilder-theme` first. This skill covers **authoring and
> validating** settings JSON — especially in a **fork** (`ShapeDiverCreateReactAppExample`)
> where `VITE_VALIDATE_SETTINGS` enforces strict schemas.

Follow every rule in this file exactly. Do not improvise or work around validation constraints.

**Fork required for property lookup:** Read **`ShapeDiverCreateReactAppExample/public/doc-flat.json`** (regenerate with `pnpm run docs`). If the fork is not in the workspace, tell the user to clone it or add it to the workspace before authoring `defaultProps`.

**Local files first:** When the fork is in the workspace, read project files with the editor tools (`Read`, `Grep`, `Glob`) — e.g. `public/doc-flat.json`, `public/*.json` fixtures, `public/example-appBuilderOverride.json`. Do **not** `WebFetch` GitHub raw URLs. **After Step 0 passes only:** use fixtures for theme/stack **patterns** — never copy their `sessions` unless the user explicitly says to.

**Scope discipline:** Add only the sections and properties the user requested. Do not ship a full
`theme08.json` clone when the user asked for one color change.

**One file default:** Fulfill **all** of the user's requests in **one** settings JSON file (`sessions`, `themeOverrides`, `appBuilderOverride` as needed) — unless the user explicitly asks for multiple files or separate theme vs layout files.

**`sessions` required:** Every settings JSON file **must** include a top-level `sessions` array with a real `slug` or `ticket` + `modelViewUrl`. Do not deliver theme-only or layout-only JSON without `sessions`. If the user asks to omit it, explain that this skill requires a self-contained file and ask for credentials (Step 1b).

**Deliverables order:** Ask for model identification (Step 1b) **first**. Only **after** the user provides slug or ticket + `modelViewUrl` and they are written into `sessions` in the JSON may you offer **`npm run start`** and the **preview URL**. Do not hand a preview link or suggest starting the dev server while credentials are still missing or placeholder.

---

## What this file is

App Builder loads a **settings JSON** (same shape as theme JSON) with up to four top-level areas:

| Property | Purpose | Typical use |
| :------- | :------ | :---------- |
| `version` | **Required** — must be `"1.0"` | Always |
| `sessions` | Which model to load (`slug` or `ticket` + `modelViewUrl`) | **Required** in every file — ask user for credentials if missing |
| `themeOverrides` | Mantine theme + per-component `defaultProps` | Branding, layout, styling |
| `appBuilderOverride` | Full App Builder layout skeleton | Local layout testing without republishing GH |

**Config reference:** `ShapeDiverCreateReactAppExample/public/doc-flat.json` — see [doc-flat.md](references/doc-flat.md). Regenerate with `pnpm run docs` in the fork after theme-prop changes.

---

## Workflow

**Step 0 always runs first.** If Step 0 triggers → send credential question only → **stop**. Steps 1–5 apply only after Step 0 passes.

### Step 1: Clarify the goal

Ask (or infer) which outcome the user needs:

| Goal | Use | Skip |
| :--- | :-- | :--- |
| Brand colors / fonts / logo | `themeOverrides` (`definitions.MantineThemeOverride` in doc-flat) | `appBuilderOverride` |
| Panel layout (appshell vs grid, rows, borders) | `entriesByCategory.page` — `AppBuilderTemplateSelector`, `AppBuilderAppShellTemplatePage` | Full widget tree unless asked |
| Style containers / buttons / text globally | doc-flat `entries` + `definitions` (`ButtonProps`, container entries) | Guessing prop names |
| Test layout locally without Grasshopper | `appBuilderOverride` + `sessions` | Large theme unless also branding |

**Checkpoint:** You know which top-level properties belong in the file.

### Step 1b: Write `sessions` (after Step 0 passes)

Add credentials under `sessions` with `"id": "default"` **before** any `themeOverrides` / `appBuilderOverride` work.

The user must provide **one** of:

| Option | Fields | Where to find |
| :----- | :----- | :------------ |
| **A — Slug** | `slug` | Model URL on shapediver.com, or user knows it |
| **B — Ticket** | `ticket` **and** `modelViewUrl` (both required) | Model **Edit** page on shapediver.com → **Developers** tab — embedding **ticket** and **Geometry Backend URL** (`modelViewUrl`) |

If the user does not have option B values, point them to the model's **Edit → Developers** tab on shapediver.com (same fields as the Viewer embedding ticket + backend URL).

**Glossary:**

| Term | Meaning |
| :--- | :------ |
| **slug** | Model identifier in the shapediver.com model URL (human-readable name) |
| **ticket** | Embedding token from **Edit → Developers** (not an API key) |
| **modelViewUrl** | Geometry Backend URL from **Edit → Developers** (e.g. `https://sdr7euc1.eu-central-1.shapediver.com`) |

Rules:

- **Ask the user** for `slug` or **`ticket` + `modelViewUrl`** — values must come from the user in this conversation, not from elsewhere.
- Do **not** copy `sessions` from other `public/*.json`, `examples.md`, eval fixtures, Jira, or prior chats unless the user explicitly pastes them or says "copy from `file.json`".
- Do **not** invent, guess, or fabricate `slug`, `ticket`, or `modelViewUrl` (including "typical" `sdr7…` backend URLs).
- Do **not** use placeholders (`my-model-slug`, `PASTE_TICKET_HERE`, `abc123ticket`, example tickets from `public/*.json`).
- Option B requires **both** `ticket` and `modelViewUrl` from the user — if only one is given, ask for the missing field; do not fill the other yourself.
- Do **not** offer `npm run start` or a preview URL until real credentials are in `sessions` (user provided them or they already exist in the **target** file being edited).
- Add the answer under `sessions` with `"id": "default"` (see [config-schema.md](references/config-schema.md)).

**Checkpoint:** File includes a real `sessions` entry with slug or ticket + `modelViewUrl`. **Only then** proceed to Step 5 preview / server offer.

**Hosted-only vs fork:**

- User loads config via hosted `g=` only (no local fork) → skip Step 4 fork commands; still deliver the **hosted preview URL** from [preview-urls.md](references/preview-urls.md). You may reference `shapediver-appbuilder-theme` for hosting mechanics (`g=` must be absolute HTTPS).
- User works in `ShapeDiverCreateReactAppExample` → run Step 4 validation before delivering.

### Step 2: Recommend a configuration profile

Pick the **smallest** profile that meets the goal. See [examples.md](references/examples.md).

| Profile | When to recommend |
| :-------- | :---------------- |
| **Minimal brand** | User wants primary color or one font change |
| **Full brand** | Corporate palette, typography, viewport icon colors |
| **Layout shell** | Appshell rows, bottom full-width bar, template `appshell` vs `grid` |
| **Container polish** | Nested `containerThemeOverrides` for bottom bar grid, padding |
| **Layout override** | `stickyTabs`, custom widget stacks, action tooltips — needs `appBuilderOverride` |
| **Dev fixture** | Start from validated committed fixtures in [examples.md](references/examples.md#reference-fixtures-fork-repo-committed-only) |

**Anti-patterns:**

- Do **not** set `forceColorScheme` unless the user explicitly wants a locked light/dark mode.
- Do **not** add `primaryColor: "blue"` removal alone — Mantine defaults to blue; set `primaryColor` to `"gray"` or a custom palette name.
- Do **not** put secrets (API keys, **production** tickets) in JSON committed to git — warn the user; tickets they provide for **local fork testing** may go in `sessions` in an uncommitted or gitignored file.

**Checkpoint:** You can name the profile and list the `configPath` values you will touch.

### Step 3: Draft JSON using `configPath` from doc-flat

**Always read** `ShapeDiverCreateReactAppExample/public/doc-flat.json` from the **local workspace** (Read/Grep) before writing `defaultProps`. Do not fetch the same file from GitHub or the web when it is already on disk. If the fork is not in the workspace, stop and ask the user to clone [ShapeDiverCreateReactAppExample](https://github.com/shapediver/ShapeDiverCreateReactAppExample) or add it to the workspace.

Start from:

```json
{
  "version": "1.0",
  "sessions": [
    {
      "id": "default",
      "slug": "<from user>"
    }
  ]
}
```

Use `ticket` + `modelViewUrl` instead of `slug` when the user provided option B. **Never omit `sessions`.**

**For each component override:**

1. **Find the entry** — search `entries` by `name` or browse `entriesByCategory` (`page`, `widget`, `entity`, …).
2. **Note `configPath`** — e.g. `themeOverrides.components.ViewportIcons.defaultProps`. Split on `.` to build the JSON tree; each segment is an object key.
3. **Add only `properties[].name` keys** from that entry. If a property `type` is `{ "$ref": "#/definitions/…" }`, open `definitions` and use only keys listed there (e.g. `ButtonProps.fw`, not `fontWeight`).
4. **Nested containers** — extend the parent path:
   `{AppBuilderContainerWrapper configPath}.containerThemeOverrides.{template}.{container}.components.{Child}.defaultProps`
   then look up the child entry's `configPath` for its `properties`.
5. **Global theme** (no entry row) — use `definitions.MantineThemeOverride` for `primaryColor`, `colors`, `fontFamily`, etc.

Registered Zod schemas reject unknown keys — doc-flat is the authoritative allowed-property list.

**Checkpoint:** Every `defaultProps` object matches an entry's `properties` (plus resolved `$ref`s).

### Step 4: Validate before delivering

**Requires fork in workspace** (`ShapeDiverCreateReactAppExample`):

If the fork is not available, tell the user to clone it or add it to the workspace — do not guess property names from Mantine docs or a stale snapshot.

**Read [validation-runtime.md](references/validation-runtime.md)** — cold start vs Zod, forbidden `tsx -e`, browser vs CLI paths.

**With the fork checkout**, pick **one** validation path:

#### A. Browser validation (preferred when dev server is already running)

1. Ensure `.env` has `VITE_VALIDATE_SETTINGS=true` (restart Vite after changing `.env`).
2. Reload `http://localhost:3000/?g=/your-file.json` — validation runs in the bundle after load; near-instant on subsequent edits.
3. Do **not** start a second `pnpm start` if Vite is already serving the fork.

#### B. CLI validation (primary for agents without a running dev server)

From fork repo root `ShapeDiverCreateReactAppExample/`:

```bash
pnpm run validate:settings -- public/your-file.json
```

| Rule | Detail |
| :--- | :----- |
| **Use this command only** | `scripts/validate-settings-json.mjs` — **30s hard timeout**; wall time is mostly **cold start** (~2–15s), not Zod (~7ms once loaded) |
| **NEVER use** | `pnpm exec tsx -e "…"` (especially multiline on Windows/Git Bash) — quoting breaks, no stdout, false exit 0 |
| **NEVER improvise** | Ad-hoc `import` of `appbuildertypecheck.ts` via `tsx` or one-off scripts — use the dedicated CLI only |
| **Do NOT run** | `pnpm test`, `jest`, or open-ended test suites for a single file |
| **Shell timeout** | Agent terminal `block_until_ms` **≤ 45000** (script self-aborts at 30s) — never poll in a loop |
| **One run** | Run **once** per edit cycle; fix stderr, re-run **once** — do not chain heavyweight commands |
| **Exit 0** | Valid — proceed to preview |
| **Exit 1** | Invalid JSON, missing file, or timeout — fix Zod paths from stderr or report timeout |

Optional full regression (maintainers, not per-file agent checks):

```bash
pnpm test -- validateSkillExamples.test.ts
```

#### After validation

Load via preview URL from [preview-urls.md](references/preview-urls.md) — e.g. `http://localhost:3000/?g=/your-file.json`.

**If validation fails:** The error path is a `configPath` suffix (e.g. `…Button.defaultProps.wrap`). Find the matching entry or `definitions` schema in doc-flat — fix or remove the key. A slow CLI followed by Zod stderr is **invalid JSON**, not a broken validator. Do **not** disable validation.

**Checkpoint:** Fork validation passes (or user explicitly skips validation with documented reason).

### Step 5: Iterate and deliver

**Prerequisite:** Step 1b complete — `sessions` contains real identification data from the user (not placeholders). If credentials are still missing, stop and ask; do **not** deliver preview URL or `npm run start` yet.

Save the config as **`public/<filename>.json`** (fork) or host it at an **HTTPS** URL (production).

**Preview URL — mandatory deliverable.** Follow [preview-urls.md](references/preview-urls.md). Summary:

| Context | Rule |
| :------ | :--- |
| Query param name | **`g`** — never `settingsUrl` in the browser URL |
| Local `g` value | `/<filename>.json` — file lives in `public/`, no `public/` prefix in URL |
| Local base | Vite **Local** URL after `npm run start` (default `http://localhost:3000/`) |
| Hosted base | `https://appbuilder.shapediver.com/v1/main/latest/` |
| Hosted `g` value | Absolute **HTTPS** URL to the JSON file |
| Preview query | **`g` only** — model credentials live in `sessions` inside the file |

**Copy-paste templates** (replace placeholders):

```text
# Local
http://localhost:3000/?g=/FILENAME.json

# Hosted
https://appbuilder.shapediver.com/v1/main/latest/?g=https://HOST/FILENAME.json
```

Do **not** put `slug`, `ticket`, or `modelViewUrl` on the preview URL when `sessions` is in the file (always, per this skill).

Do **not** hand the user a filesystem path, a bare JSON URL without the App Builder page, or `?settingsUrl=…`.

**Fork local preview — start the dev server (after `sessions` is filled):** When the config is saved under `public/`, `sessions` has real credentials, and the user works in the fork:

1. **Check for a running instance first** — inspect IDE terminals, or probe the default port (e.g. `http://localhost:3000/`). Do **not** start a second `npm run start` if Vite is already serving the fork.
2. **If already running** — read the **Local** URL from the existing terminal output and build the preview link from it.
3. **If not running** — offer to start the dev server and give the preview link in the same deliverable turn:

```bash
cd ShapeDiverCreateReactAppExample
npm run start
```

(`pnpm start` is equivalent in this repo.) Wait for Vite to print the local URL (default **`http://localhost:3000/`** — see `vite.config.ts` `server.port`).

- Base = Vite **Local** URL (trailing `/`)
- Append `?g=/FILENAME.json` — credentials are in `sessions`, not on the URL.

Do not assume port `5173`. If the user declines starting the server and none is running, give the preview URL using the default base `http://localhost:3000/` and note they must run `npm run start` first.

Hand the user:

- The JSON file (minimal diff) — **one file** unless the user asked for more.
- **One correct preview URL** from the templates above.
- `configPath` values touched.
- Validation status.

**Checkpoint — exit criteria:**

- `"version": "1.0"` present.
- **`sessions`** with real slug or ticket + `modelViewUrl` (mandatory).
- Only requested sections; properties match doc-flat.
- Validation run or caveat documented.
- **Fork:** user offered `npm run start` (or confirmed server already running); preview URL base matches Vite output (default `localhost:3000`).
- Preview URL uses **`g` only** on the correct base (local or hosted).

---

## Agent decision guide

| User says | doc-flat starting point |
| :-------- | :---------------------- |
| "Match our brand colors" | `definitions.MantineThemeOverride` → `primaryColor` + 10-shade `colors` array (custom key, e.g. `"brand"`) — anchor shades on the user's hex; do not use Mantine built-in `"red"` unless they ask for default Mantine red |
| "Red palette" / hex primary | Same as brand colors — `primaryColor: "brand"` + 10 `colors.brand` shades derived from the requested hex |
| "Use our font" | Top-level `MantineThemeOverride.fontFamily` (avoid partial `headings` unless all required fields are set) |
| "Appshell + bottom action bar" | `entries` → `AppBuilderTemplateSelector`, `AppBuilderAppShellTemplatePage`; nested via `AppBuilderContainerWrapper` + `AppBuilderHorizontalContainer` |
| "Hide AR / camera buttons" | `configPath` …`ViewportIcons.defaultProps` → `enableArBtn: false` for AR only; also set `enableCamerasBtn`, etc. when user names those buttons |
| "Sticky tabs / layout test" | `appBuilderOverride.containers[].stickyTabs` — inline pattern in [examples.md](references/examples.md); structure from `public/example-appBuilderOverride.json` |
| "Tooltip on parameters / actions" | `appBuilderOverride` — see `public/example-appBuilderOverride.json` (tab and parameter `tooltip`s) |
| "Unrecognized key" error | Map error path → entry `properties` or `definitions.*` |
| "Invalid wrap" | Refuse `flex` — only `nowrap`, `wrap`, `wrap-reverse` per `definitions.MantineFlexWrap`; suggest `wrap: "wrap"` instead |

---

## Relationship to other skills

| Skill | Role |
| :---- | :--- |
| `shapediver-appbuilder` | Routes iframe / theme / fork |
| `shapediver-appbuilder-theme` | Hosted URL, `g=`, `window.updateTheme` |
| **`shapediver-appbuilder-settings`** | doc-flat–driven JSON authoring + validation |
| `shapediver-appbuilder-fork` | Clone repo, submodule, custom components |

---

## Anti-Rationalization Table

| You will think… | Why it is wrong |
| :-------------- | :-------------- |
| "I'll read doc-flat and draft theme first, then ask for slug." | **Step 0 violation** — credential question must come before doc-flat and before any JSON. |
| "Credentials are already in `example-ecommerce-2.json` — I'll reuse them." | **Step 0 violation** — another file's `sessions` do not count; ask the user. |
| "Учётные данные уже есть в … — ищу свойства темы / stack." | **Step 0 violation** — no theme/stack search until user provides credentials. |
| "I'll show example JSON so the user understands the format." | **Step 0 violation** — no JSON until credentials are provided. |
| "The user only asked for colors — I'll skip sessions." | `sessions` is mandatory; Step 0 applies — ask first, whole reply only. |
| "I'll show a theme draft while waiting for slug." | No JSON until Step 0 passes. |
| "I'll guess property names from Mantine docs." | Use doc-flat `entries` + `definitions` — App Builder mirrors differ (`fw` not `fontWeight`). |
| "I'll copy all of `theme08.json`." | Bloated configs hide mistakes. Start minimal; add `configPath` blocks one at a time. |
| "I'll turn off validation." | Fix the key using doc-flat; validation paths match `configPath`. |
| "I'll split theme and layout into two JSON files." | Default is **one** settings file with `themeOverrides` + `appBuilderOverride` together — split only when the user explicitly requests it. |
| "I'll use a placeholder slug until the user fills it in." | New configs need real credentials from the user — placeholders break local preview URLs. |
| "I'll copy ticket/modelViewUrl from `SS-9602.json` or another fixture." | **Forbidden** — ask the user; fixture `sessions` are not their model. |
| "I'll reuse ticket/modelViewUrl from an earlier message about a different model." | **Forbidden** unless the user re-pastes them for **this** file. |
| "I'll invent a plausible `modelViewUrl` for their region." | **Forbidden** — ask; backend URL is per-model from **Edit → Developers**. |
| "User gave ticket only — I'll pick a standard modelViewUrl." | **Forbidden** — ask for **both** fields from the user. |
| "I'll put `?settingsUrl=` in the preview link." | Browser param is **`g`**, not `settingsUrl` — see [preview-urls.md](references/preview-urls.md). |
| "I'll link to `http://localhost:3000/public/foo.json`." | Page URL is `http://localhost:3000/?g=/foo.json` — JSON is fetched via `g`, not opened as the document URL. |
| "I'll guess from a hand-written component list." | Use **`public/doc-flat.json`** in the fork only — no separate registry file. |
| "I'll fetch doc-flat or fixtures from GitHub." | Use local workspace paths when the fork is open — `Read` / `Grep` on `public/doc-flat.json`, `public/*.json`, etc. Remote fetch only if the file is not in the workspace. |
| "I'll paste a preview URL before the dev server is running." | Offer `npm run start` in the fork; build the URL from Vite’s Local output (default `http://localhost:3000/?g=/…`). |
| "I'll omit `sessions` and pass slug on the URL." | This skill requires `sessions` in the file — ask for slug or ticket + `modelViewUrl`; preview URL is `?g=` only. |
| "I'll run `pnpm test` or Jest to validate one file." | Use **`pnpm run validate:settings -- public/file.json`** only — 30s timeout; do not run open-ended test suites. |
| "I'll wait for the validation command to finish." | Use `validate:settings` only (30s cap). Set terminal `block_until_ms` ≤ 45000. If timeout, report and fix JSON — never poll or re-run Jest. |
| "I'll run `npm run start` without checking." | Check terminals / `localhost:3000` first — reuse an existing Vite instance; never start a duplicate dev server. |
| "I'll run `pnpm exec tsx -e` to validate inline." | **Forbidden on Windows/Git Bash** — quoting breaks, no stdout, false exit 0. Use **`pnpm run validate:settings`** only. |
| "I'll import `appbuildertypecheck.ts` in a one-off script." | Same cold start without timeout guard — use the dedicated CLI; never improvise imports. |
| "Validation took 30s so the JSON must be huge/invalid." | Slow wall time is **cold module load**, not Zod. Read stderr: Zod path = fix doc-flat keys; timeout = report and retry once. |
| "Exit 0 with no output means it's valid." | Broken inline scripts can exit 0 without calling the validator — only trust **`validate:settings`** stderr (`Settings JSON valid: …`). |
| "Dev server is up — I'll run CLI anyway." | Prefer **browser validation** (`VITE_VALIDATE_SETTINGS` + reload `?g=`) for instant iteration; CLI when no server is running. |

---

## Additional resources

- [credentials-gate.md](references/credentials-gate.md) — **Step 0** — ask for slug/ticket before any JSON
- [doc-flat.md](references/doc-flat.md) — `configPath` navigation, `$ref` resolution, nested overrides
- [preview-urls.md](references/preview-urls.md) — correct `g` preview links (local + hosted)
- [config-schema.md](references/config-schema.md) — top-level shape, sessions, `appBuilderOverride`
- [validation-runtime.md](references/validation-runtime.md) — cold start vs Zod, CLI vs browser, forbidden `tsx -e`
- [examples.md](references/examples.md) — profiles with `configPath` annotations
- `ShapeDiverCreateReactAppExample/public/doc-flat.json` — property catalog (regenerate with `pnpm run docs`)
- `ShapeDiverCreateReactAppExample/public/doc-nested.json` — nested mirror (human browsing)
- Committed sample configs — [examples.md#reference-fixtures](references/examples.md#reference-fixtures-fork-repo-committed-only)
- Validation harness (fork only): `pnpm run validate:settings -- public/<file>.json` (`scripts/validate-settings-json.mjs`)

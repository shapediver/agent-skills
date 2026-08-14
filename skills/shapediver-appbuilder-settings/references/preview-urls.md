# Preview URLs — loading a settings JSON file

> **Overrides `shapediver-appbuilder-theme` for hosted preview:** On `https://appbuilder.shapediver.com/…`, `g` must be an **absolute HTTPS** URL to the JSON file — not `theme.json`, not `http://localhost`, not a site-relative path. The theme skill allows relative `g` for simple cases; **this skill's rules win** when authoring validated settings JSON.

The App Builder reads settings JSON from the **`g`** query parameter (`QUERYPARAM_SETTINGSURL` in code).  
**Never put `settingsUrl` in the browser URL** — that name is internal only.

## `sessions` in every file

This skill requires a top-level **`sessions`** block in the settings JSON (slug or ticket + `modelViewUrl`).  
**Preview URL uses `g` only** — do not add `slug`, `ticket`, or `modelViewUrl` to the browser URL.

**Order:** Ask for model identification and write it into `sessions` **before** offering `npm run start` or a preview link. No preview URL until credentials are real (not placeholders).

## Local fork (`npm run start`)

When the settings file is ready in `public/` and `sessions` has real credentials:

1. **Check whether the dev server is already running** (IDE terminals, or open `http://localhost:3000/`). If yes — reuse that **Local** URL; do **not** start another `npm run start`.
2. If not running, from the fork repo root run **`npm run start`** (`pnpm start` is equivalent).
3. Read the **Local** URL from Vite’s terminal output (default **`http://localhost:3000/`** — `vite.config.ts` `server.port`).
4. Append **`?g=/<filename>.json`**.

Do not assume port `5173`. Do not run two Vite instances for the same fork.

- Save config as **`public/<filename>.json`**.
- **`g` value:** path from site root → **`/<filename>.json`** (file in `public/` is served without the `public/` prefix).

**Example:**

```
http://localhost:3000/?g=/my-config.json
```

## Hosted App Builder (appbuilder.shapediver.com)

**Base URL (default — anonymous access / embedding):**

```
https://appbuilder.shapediver.com/v1/main/latest/
```

> **In-platform variant (logged in on shapediver.com):** `https://www.shapediver.com/app/builder/v1/main/latest/` — same query params. Use only when the user explicitly works inside the platform UI; for agents and external embeds, prefer **`appbuilder.shapediver.com`**.

**`g` must be an absolute HTTPS URL** to the hosted JSON (GitHub raw, S3, CDN, etc.) — **not** `http://localhost:…` (mixed-content block on HTTPS pages).

**Example:**

```
https://appbuilder.shapediver.com/v1/main/latest/?g=https://your-host.example/my-config.json
```

If the user omits the HTTPS URL where the JSON will be hosted, **ask for it** before giving the preview link. Never use `http://localhost` in hosted `g=`.

## Common mistakes (do not output these)

| Wrong | Correct |
| :---- | :------ |
| `?settingsUrl=/foo.json` | `?g=/foo.json` |
| `?g=public/foo.json` | `?g=/foo.json` |
| `?g=C:/projects/.../foo.json` | `?g=/foo.json` (local) or HTTPS URL (hosted) |
| `http://localhost:3000/public/foo.json` as page link | `http://localhost:3000/?g=/foo.json` |
| User says "save as `public/foo.json`" | Disk path: `public/foo.json`; preview `g` value: **`/foo.json`** only |
| `?slug=…&g=/foo.json` when file has `sessions` | `?g=/foo.json` only — credentials belong in JSON |
| Theme-only JSON without `sessions` | Add `sessions` (Step 1b) — required by this skill |
| Second `npm run start` while Vite already runs | Check terminals / port 3000 first; reuse existing Local URL |
| `https://www.shapediver.com/app/builder/...?g=/foo.json` as default hosted preview | Use `https://appbuilder.shapediver.com/v1/main/latest/?g=https://cdn.../foo.json` |
| `https://shapediver.com/...?g=/foo.json` on production | `g=https://cdn.../foo.json` (absolute HTTPS) |
| Invented paths (`/app/builder/settings/...`) | Use base URL + query params only |

## Programmatic URL building

In code, use `buildAppBuilderUrl` from `@AppBuilderLib/shared/lib/urlbuilder` — it emits `g`, `slug`, `ticket`, and `modelViewUrl` correctly.

## Live iteration (not a preview URL)

`window.updateTheme({ themeOverrides: { … } })` in the browser console — for quick tweaks only; final deliverable is still the JSON file + preview URL above.

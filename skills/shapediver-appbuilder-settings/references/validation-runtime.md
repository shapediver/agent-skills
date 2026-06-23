# Settings JSON validation — runtime behavior

Agent-oriented reference for **why validation appears to hang** and which path to use.

## Symptom vs reality

| What agents report | What is actually happening |
| :----------------- | :------------------------- |
| "Validation hangs 30+ seconds" | **Cold start** loading `appbuildertypecheck.ts` and its dependency graph — not slow Zod |
| "Zod is too slow" | `validateAppBuilderSettingsJson()` is **~7 ms** once the module is loaded |
| "Validation is broken" | Often a **strict schema** rejection (unknown key) — fix JSON via doc-flat, not by disabling validation |
| "Command succeeded but no output" | Broken inline shell on Windows — **false exit 0** from quoting failure, not a valid file |

**Normal CLI cold start:** ~2–6 s. **Worst case** (first run after install, antivirus scan, cold cache): can exceed 30 s. The dedicated CLI **hard-aborts at 30 s**.

## Root causes of hangs

1. **Multiline `pnpm exec tsx -e "…"` via Git Bash on Windows** — quoting breaks, no stdout, shell waits until agent timeout (~50 s). **Forbidden.**
2. **Cold module import** — first `import` of `appbuildertypecheck.ts` compiles/transpiles a large graph (viewer stubs, Zod schemas, layout types).
3. **Agent improvising** — no dedicated CLI → ad-hoc `tsx` one-liners that fail silently on Windows.
4. **Agent shell timeout** — default `block_until_ms` can be 50 s+; user sees a "hang" with no useful stderr.
5. **False exit 0** — broken inline scripts that parse nothing and exit 0 without calling `validateAppBuilderSettingsJson`.

## Validation paths (pick one)

### 1. Browser dev validation (fastest iteration)

When the Vite dev server is **already running** and `.env` has:

```env
VITE_VALIDATE_SETTINGS=true
```

Load or reload `http://localhost:3000/?g=/your-file.json`. Validation runs inside the bundle **after** the first load — subsequent edits are near-instant in the browser console / overlay.

**Use when:** iterating on JSON while the user (or agent) already has `pnpm start` up. **Do not** start a second dev server.

Restart Vite after changing `.env`.

### 2. CLI validation (primary for agents)

From fork repo root:

```bash
pnpm run validate:settings -- public/your-file.json
```

Implementation: `scripts/validate-settings-json.mjs` → `validate-settings-json-runner.ts` → `validateAppBuilderSettingsJson` in `src/shared/features/appbuilder/config/appbuildertypecheck.ts`.

| Property | Value |
| :------- | :---- |
| Expected wall time | ~2–15 s (mostly cold start) |
| Hard timeout | **30 s** (script kills child, exit 1) |
| Agent `block_until_ms` | **≤ 45000** |
| Runs per edit cycle | **One** — fix stderr, re-run once |

**Use when:** fork is in workspace, no dev server, or agent needs a definitive exit code before delivering JSON.

### 3. Jest regression (maintainers only)

```bash
pnpm test -- validateSkillExamples.test.ts
```

**Not** for single-file agent checks — slow suite startup, wrong tool for one JSON file.

## Strict schema vs doc-flat

These are **separate** from slow startup:

- Registered `themeOverrides.components.*.defaultProps` keys must match **doc-flat** `properties` (+ resolved `$ref`s). Unknown keys → Zod error with a `configPath`-like path.
- Undocumented component keys stay opaque `JsonValue` (allowed, not deep-validated).
- **Author by doc-flat first** — look up `configPath` and `properties[].name` before writing keys. Do not guess from Mantine docs (`fw` not `fontWeight`).

A "hang" followed by a Zod path in stderr is **invalid JSON**, not a broken validator.

## Forbidden patterns

| Pattern | Why |
| :------ | :-- |
| `pnpm exec tsx -e "…"` (especially multiline, Git Bash on Windows) | Quoting breaks; no stdout; false success |
| Direct `import` of `appbuildertypecheck.ts` in ad-hoc scripts | Reinvents the CLI; same cold start without timeout guard |
| `pnpm test` / Jest for one file | Suite overhead; not the agent workflow |
| Disabling `VITE_VALIDATE_SETTINGS` or validation | Fix keys via doc-flat |
| Polling / re-running CLI in a loop | One run per edit cycle; cap wait at 45 s |

## Agent do / don't

| Do | Don't |
| :-- | :---- |
| `pnpm run validate:settings -- public/file.json` | `tsx -e` one-liners or multiline inline scripts |
| Set terminal `block_until_ms` ≤ **45000** | Wait indefinitely or poll in a loop |
| Use browser validation when Vite is already running | Start a duplicate `pnpm start` |
| Read stderr Zod paths → fix via doc-flat | Disable validation or guess Mantine prop names |
| Run validation **once** per edit; re-run once after fix | Chain Jest + tsx + test suites |
| Treat >30 s CLI as timeout (exit 1) | Assume slow start means JSON is valid |
| Author keys from doc-flat **before** writing JSON | Copy keys from Mantine docs or old themes blindly |

## File map (fork)

| File | Role |
| :--- | :--- |
| `scripts/validate-settings-json.mjs` | CLI entry, 30 s timeout, Windows-safe spawn |
| `scripts/validate-settings-json-runner.ts` | Reads file, calls `validateAppBuilderSettingsJson` |
| `scripts/validate-settings-json-loader.mjs` | Stubs `@shapediver/viewer.*` for Node |
| `scripts/viewer-mocks.ts` | Viewer session/type mocks |
| `src/shared/.../appbuildertypecheck.ts` | Zod schemas + `validateAppBuilderSettingsJson` |

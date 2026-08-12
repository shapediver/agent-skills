# AGENTS.md

Guidance for AI agents working in this repository.

This repository contains ShapeDiver-focused Agent Skills. Most work here is not
"write a new skill from scratch", but "make a targeted change without breaking
the routing model, downstream handoffs, eval coverage, or public docs".

## Purpose

The repo currently provides 9 public skills:

- `shapediver-router`: mandatory front door for all ShapeDiver tasks
- `shapediver-viewer`: custom Viewer V3 frontend work
- `shapediver-appbuilder`: App Builder router
- `shapediver-appbuilder-iframe`: iframe embedding
- `shapediver-appbuilder-theme`: App Builder theming / branding
- `shapediver-appbuilder-fork`: App Builder React fork workflow
- `shapediver-platform-backend`: Platform Backend specialist
- `shapediver-geometry-backend`: Geometry Backend specialist
- `shapediver-platform-geometry-workflows`: Platform + Geometry orchestration

The current topology is:

- `shapediver-router` decides the first routing step.
- `shapediver-appbuilder` is a second router inside the App Builder branch.
- `shapediver-viewer` is the custom browser/frontend path.
- `shapediver-platform-backend` owns PB-only work.
- `shapediver-geometry-backend` owns GB-only runtime work.
- `shapediver-platform-geometry-workflows` owns PB -> GB combined workflows.

## What Is Canonical

Use these sources in this order:

1. The relevant `skills/<skill>/SKILL.md`
2. Skill-local `references/*.md` for that skill
3. Related neighboring skills when the boundary or handoff is relevant
4. `scripts/get-model-info.js` for the real helper behavior
5. `README.md` and `EVALS.md` for public positioning and eval workflow

## Repo Layout

Main files and directories:

- `skills/<skill-name>/SKILL.md`: skill entrypoint and source of truth for role boundaries
- `skills/<skill-name>/references/*.md`: deeper material when that skill uses progressive disclosure
- `skills/<skill-name>/evals/eval_queries.json`: trigger/classification evals
- `skills/<skill-name>/evals/evals.json`: task/code evals
- `README.md`: public skill inventory and high-level structure
- `EVALS.md`: eval workflow and script usage
- `scripts/get-model-info.js`: shared PB -> GB metadata helper
- `scripts/execute-evals.js`, `scripts/run-evals.js`, `scripts/grade-evals.js`: eval tooling

Current structure reality:

- All public skills live under `skills/`.
- `shapediver-viewer` has many reference files; load only the ones the task needs.
- Backend specialist skills have focused reference folders.
- The App Builder family currently has no `references/` folders; the sub-skills are mostly self-contained.
- Every public skill already has both eval JSON files, but the App Builder family currently has empty task eval arrays in `evals.json`.

## Core Repository Rules

### 1. Preserve skill identity

When editing an existing `SKILL.md`:

- preserve the existing structure, tone, and wording as much as possible
- prefer minimal deltas over rewrites
- extend existing sections before inventing new ones

This is especially important for:

- `skills/shapediver-router/SKILL.md`
- `skills/shapediver-viewer/SKILL.md`
- `skills/shapediver-appbuilder/SKILL.md`
- `skills/shapediver-appbuilder-iframe/SKILL.md`
- `skills/shapediver-appbuilder-theme/SKILL.md`
- `skills/shapediver-appbuilder-fork/SKILL.md`

### 2. Keep one role per skill

Do not let skills drift into overlapping authority.

Use these boundaries:

- `shapediver-router`
  - routes only
  - gathers minimum required context
  - does not generate implementation code

- `shapediver-appbuilder`
  - routes only within the App Builder branch
  - chooses iframe vs theme vs fork
  - does not generate implementation code

- `shapediver-appbuilder-iframe`
  - iframe embed only
  - prerequisite domain / iframe-setting guidance
  - no custom JS or Viewer code

- `shapediver-appbuilder-theme`
  - App Builder usage plus optional theme JSON
  - branding / appearance only
  - no custom React component work

- `shapediver-appbuilder-fork`
  - App Builder React fork workflow
  - custom widgets/components while keeping App Builder infrastructure
  - do not modify the `src/shared` submodule in generated guidance

- `shapediver-viewer`
  - custom Viewer V3 implementations
  - CDN and NPM flows
  - interaction features, parameters, outputs, exports, cleanup

- `shapediver-platform-backend`
  - PB-only work
  - auth, models, users, orgs, domains, saved states, sharing, tokens, logs, analytics, secrets
  - may retrieve tickets/JWTs, but does not run GB computations

- `shapediver-geometry-backend`
  - GB-only runtime work
  - assumes `modelViewUrl` plus backend ticket/JWT are already known, or clearly placeholders
  - SDK-first skill, not a second standalone REST skill

- `shapediver-platform-geometry-workflows`
  - PB -> GB orchestration
  - starts from slug/id/guid or Platform credentials and ends in runtime work
  - resolves credential type, scopes, `modelViewUrl`, PB `id`, and GB `guid`

If a task starts from a slug/id/guid or Platform credentials and ends in runtime
computation, export, file upload, publish, or GB analytics, that is usually a
`shapediver-platform-geometry-workflows` case, not a direct
`shapediver-geometry-backend` case.

### 3. Do not invent model-specific values

Across all skills:

- never invent tickets, JWTs, `modelViewUrl`, parameter IDs, output IDs, export IDs, domains, slugs, model IDs, or GUIDs
- use user-provided values, helper-script output, or explicit placeholders

### 4. Prefer progressive disclosure

Keep `SKILL.md` procedural and compact.

Move detail into `references/*.md` when:

- the topic is too large for the main file
- multiple patterns or edge cases are needed
- exact API/SDK material would clutter the workflow

Do not dump reference material back into a `SKILL.md` that already uses this pattern.

### 5. Update all dependent surfaces when boundaries move

If you change a system boundary or routing rule, update the full chain:

- `shapediver-router`
- the affected specialist skill(s)
- `shapediver-platform-geometry-workflows` if PB/GB handoff rules changed
- `shapediver-appbuilder` if an App Builder boundary changed
- affected evals
- `README.md` if the public surface or public description changed

## Current Routing Rules

Use these repo-specific decision rules consistently:

- App Builder:
  - use when the request is iframe embedding, built-in UI, theming, or App Builder fork work
  - the App Builder branch is `shapediver-appbuilder` -> sub-skill

- Viewer:
  - use for custom browser/frontend Viewer V3 work
  - especially custom layout, custom React UI, drag/selection/gumball/drawing tools, materials, or direct viewport control

- Platform Backend only:
  - domains
  - saved states
  - users / orgs
  - sharing
  - API tokens / clients
  - PB-only analytics / logs
  - ticket/JWT retrieval with no runtime step

- Geometry Backend only:
  - runtime code when `modelViewUrl` plus backend ticket/JWT are already known
  - outputs / exports / file parameter uploads / sdTF runtime flows / asset downloads

- Platform + Geometry:
  - slug/id/guid -> runtime metadata
  - slug/id/guid -> compute / export
  - upload / publish
  - PB-issued JWT scope selection before GB runtime
  - GB analytics via PB-issued analytics token
  - any task where the main risk is choosing the wrong credential type, host, or scope

### Mandatory router behavior

The current skills assume:

- `shapediver-router` is the mandatory first skill for ShapeDiver tasks
- downstream skills explicitly tell the agent to stop and read the router first if they were loaded directly

If you change router inputs, checklists, or handoff language, verify downstream skills
still expect the same prerequisites.

## High-Value Repo-Specific Gotchas

### Helper script behavior

The shared helper command is:

```bash
node scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

Do not reverse the argument order.

When called from a skill directory, the common relative form is:

```bash
node ../../scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

What the script actually does today:

- authenticates to the Platform Backend
- fetches model data including embedding ticket, backend ticket, backend system, access domains, and a GB access token
- uses the returned GB JWT/token plus model `guid` to open a metadata session on the Geometry Backend
- closes that session after reading metadata
- outputs structured JSON with:
  - `model.ticket`
  - `model.backendTicket`
  - `model.modelViewUrl`
  - `model.allowedDomains`
  - `parameters`
  - `outputs`
  - `exports`

Important implications:

- it is a PB -> GB bridge helper, not a general-purpose client
- it auto-installs its npm dependencies on first run
- use `ticket` + `modelViewUrl` for Viewer/browser work
- use `backendTicket` + `modelViewUrl` for headless/server-side work
- use `allowedDomains` when local domain whitelisting matters

### Viewer-specific traps

The Viewer skill currently encodes several hard requirements:

- mandatory AppBuilder output check before committing to a Viewer integration
- CDN vs NPM decision
- complete runnable artifact, not snippets
- commit-at-end parameter patterns instead of continuous `onChange` network spam
- explicit `session.customize()`
- cleanup with `session.close()` and `viewport.close()`
- localhost whitelist check via `allowedDomains`

If you change credential gathering or model metadata flow in `shapediver-viewer`,
also inspect `shapediver-router` and `scripts/get-model-info.js`.

### App Builder-specific traps

Current App Builder rules worth preserving:

- `shapediver-appbuilder` is a router, not an implementation skill
- iframe requires both domain whitelist setup and model iframe enablement
- iframe snippets must keep `referrerpolicy="origin"`
- slug is the simplest App Builder identifier; do not substitute ticket/modelViewUrl unless the user needs that path
- theming is appearance-only; do not let it drift into custom components
- the theme flow prefers `window.updateTheme(...)` for live iteration
- never recommend `http://localhost` in `g=` theme URLs for an HTTPS App Builder page
- fork guidance must preserve the "do not modify `src/shared`" rule
- fork guidance must preserve the Mantine-style `onChange` for local display plus `onChangeEnd` for commit

### PB/GB orchestration traps

For combined workflows:

- inspect `shapediver-platform-geometry-workflows` first
- distinguish PB model `id` from GB model `guid`
- choose the right runtime credential:
  - embedding ticket for browser embedding
  - backend ticket for server/CLI runtime
  - PB-issued JWT/token when strong auth or scoped GB access is required
- choose minimum JWT scopes:
  - `GroupView`
  - `GroupExport`
  - `GroupOwner`
  - `GroupAnalytics`
- always use the returned `modelViewUrl`

Do not add a second backend runtime implementation skill. The current repo policy is:

- `shapediver-geometry-backend` handles GB-only runtime implementation
- `shapediver-platform-geometry-workflows` handles cross-system orchestration

## Source Material Map

For current repo work, use:

- the relevant `SKILL.md`
- that skill's `references/*.md`
- neighboring skills that participate in the same handoff
- `scripts/get-model-info.js` when metadata or credential flow matters
- `README.md` for the public skill surface
- `EVALS.md` plus per-skill eval files for coverage expectations

When changing a boundary, compare all affected skills directly rather than relying on
separate design notes.

## README Maintenance

If you add, remove, or rename a public skill:

- update the Skills table in `README.md`
- update the structure tree in `README.md`
- make sure the public descriptions still match the actual boundaries

If you only change internals such as references or evals, update the README only when
the public-facing structure or positioning would otherwise become misleading.

## Evals

When changing or adding a skill:

- update `evals/eval_queries.json`
- update `evals/evals.json`
- keep trigger queries realistic, with both positive and negative cases
- keep task evals concrete and assertion-based

Current eval coverage reality:

- router, viewer, backend, and PB+GB skills already have concrete task evals
- the App Builder family currently has query coverage but empty `evals.json` task arrays

If you touch an App Builder skill, prefer adding task evals instead of leaving coverage empty.

Useful commands:

```bash
node scripts/execute-evals.js all 1 --dry-run
node scripts/execute-evals.js all 1 --skill <skill-name>
```

If you only need to sanity-check JSON:

```bash
node -e "JSON.parse(require('fs').readFileSync('skills/<skill>/evals/evals.json','utf8')); JSON.parse(require('fs').readFileSync('skills/<skill>/evals/eval_queries.json','utf8')); console.log('ok')"
```

Read `EVALS.md` before changing the eval workflow itself.

## Editing Conventions

- Use ASCII unless the file already depends on other characters.
- Keep Markdown clean and readable.
- Prefer consistent tables/checklists with the existing skill style.
- Keep frontmatter consistent:
  - `name`
  - `description`
  - `license: MIT`

When adding a skill, mirror the existing repo structure rather than inventing a new layout.

## Validation Checklist

Before finishing a change, verify:

1. The changed skill boundaries still match the current routing model.
2. No renamed or removed skill is still referenced in:
   - `README.md`
   - `skills/*/SKILL.md`
   - `skills/*/evals/*.json`
3. Helper script usage still matches:
   - `node scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>`
4. Model-specific values are never invented in new or edited skill text.
5. New or changed eval JSON parses.
6. `README.md` still matches the public skill surface.
7. Existing skills were extended surgically rather than rewritten unnecessarily.
8. If you changed PB/GB routing, `shapediver-router`, `shapediver-platform-backend`,
   `shapediver-geometry-backend`, and `shapediver-platform-geometry-workflows` still agree.
9. If you changed App Builder routing, `shapediver-router`, `shapediver-appbuilder`,
   and the affected sub-skill still agree.

## Preferred Workflow For Agents

When making a non-trivial change in this repo:

1. Read the relevant existing `SKILL.md` files first.
2. Read only the needed skill-local references.
3. Read neighboring skills when the routing boundary or handoff matters.
4. Decide whether the change affects:
   - routing
   - a specialist skill
   - orchestration
   - App Builder sub-routing
   - evals
   - README / public positioning
5. Patch minimally.
6. Search for stale references with `rg`.
7. Validate JSON and run dry-run evals when practical.

If you follow these rules, you will usually avoid the main failure modes in this repo:

- duplicate backend authorities
- stale references after skill removal/rename
- broken router handoffs
- broken PB/GB boundary logic
- App Builder / Viewer boundary drift
- helper command argument drift
- misleading public docs
- unnecessary rewrites of carefully authored skill files

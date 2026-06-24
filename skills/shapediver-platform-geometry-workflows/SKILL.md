---
name: shapediver-platform-geometry-workflows
description: >
  Use this skill when a ShapeDiver task spans both the Platform Backend and the
  Geometry Backend in one workflow: starting from a model slug/id/guid or
  Platform credentials and ending with runtime metadata lookup, session
  creation, output/export computation, file upload, sdTF processing, model
  upload/publish, or GB analytics. This is the orchestration layer between the
  shapediver-platform-backend and shapediver-geometry-backend skills.
license: MIT
---

# ShapeDiver Platform + Geometry Workflow Orchestration

> **Prerequisite:** This skill assumes you have already read and followed the
> `shapediver-router` skill. If you arrived here directly, stop — read
> `shapediver-router` first. It selects the correct integration strategy and
> gathers required credentials before any implementation skill is read.

This skill is the orchestration layer for cross-system ShapeDiver work.
Use it when the task is not purely Platform Backend and not purely Geometry Backend.

**Scope discipline:**

- Use this skill to decide the PB -> GB sequence, normalize identifiers and credentials,
  and choose the correct specialist references.
- Do not treat this skill as the source of exact low-level SDK syntax for every PB or GB
  call. Load the specialist references after the orchestration decision is made.
- Do not use this skill for browser Viewer/App Builder work unless the only task is to
  obtain credentials and route onward.

## Reference Loading

- Read [../../docs-pb-gb.md](../../docs-pb-gb.md) first and treat it as the orchestration
  source of truth.
- Read [../shapediver-platform-backend/SKILL.md](../shapediver-platform-backend/SKILL.md)
  when you need the exact Platform-side rules and references.
- Read [../shapediver-geometry-backend/SKILL.md](../shapediver-geometry-backend/SKILL.md)
  when you need the exact Geometry-side SDK rules and references.
- Route browser rendering/configurator work to `shapediver-viewer` or the
  `shapediver-appbuilder*` skills after credentials and model metadata are settled.

## When To Use This Skill

Use this skill for workflows such as:

- slug/id/guid -> parameter/output/export metadata,
- slug/id/guid -> backend session -> output/export computation,
- PB token/ticket retrieval -> GB session creation,
- PB create model -> GB upload/check -> PB publish,
- PB-issued analytics token -> GB model statistics,
- sdTF workflows that start with PB model resolution,
- file upload or export workflows where PB must first mint the correct JWT and provide the
  correct `modelViewUrl`.

Do **not** use this skill when:

- the task is purely PB resource management with no GB runtime step,
- the task is purely GB runtime and the user already has `modelViewUrl` plus backend
  ticket/JWT,
- the task is browser UI implementation.

## Workflow

1. Decide whether the task is:
   - PB-only,
   - GB-only,
   - PB+GB combined.
2. If it is PB-only, route to `shapediver-platform-backend`.
3. If it is GB-only and the user already has `modelViewUrl` plus backend ticket/JWT,
   route to `shapediver-geometry-backend`.
4. If it is PB+GB combined, continue here.
5. Normalize identifiers:
   - accept slug/id/guid as input,
   - resolve the canonical PB model `id`,
   - resolve the canonical GB model `guid`.
6. Choose the runtime access pattern:
   - embedding ticket for browser embedding only,
   - backend ticket for server/CLI runtime,
   - `createSessionByModel(guid)` only when the JWT and workflow actually require it.
7. Choose the minimum JWT scopes needed:
   - `GroupView`,
   - `GroupExport`,
   - `GroupOwner`,
   - `GroupAnalytics`.
8. Build one normalized PB -> GB handoff object:
   - `access_token`,
   - `model_view_url`,
   - selected ticket if applicable,
   - `guid` or `guids`,
   - chosen scopes.
9. Load the Platform specialist references for the exact PB call you need next.
10. Load the Geometry specialist references for the exact GB call you need next.
11. Keep the response explicit about:

- which system is used first,
- which credentials are carried into GB,
- why those scopes are sufficient,
- when the GB session must be closed.

## Routing Rules

### Route To Platform Backend

Route to `shapediver-platform-backend` when the task ends at:

- auth,
- model lookup,
- domains,
- saved states,
- sharing,
- API tokens / clients,
- PB-only analytics / logs,
- ticket or JWT retrieval with no runtime step.

### Route To Geometry Backend

Route to `shapediver-geometry-backend` when the user already has:

- `modelViewUrl`,
- backend ticket or JWT,
- current parameter/output/export metadata or clear placeholders,

and the task is only:

- session creation,
- output/export computation,
- file parameter upload,
- sdTF runtime processing,
- asset download,
- runtime troubleshooting.

### Stay In This Skill

Stay in this skill when the task crosses the PB/GB boundary, especially:

- slug -> runtime metadata,
- slug -> export,
- upload/publish,
- analytics via GB,
- PB credential resolution before headless runtime code,
- any request where the main risk is choosing the wrong credential type, scope, or host.

## Exit Criteria

A PB+GB answer is correct only if all of these are true:

- it states whether the task is PB-only, GB-only, or combined,
- it identifies the correct first system,
- it distinguishes PB `id` from GB `guid`,
- it chooses the right ticket type,
- it uses the returned `modelViewUrl`,
- it chooses the right JWT scopes,
- it does not invent parameter/output/export ids,
- it states when to route onward to Viewer/App Builder,
- it states when the GB session must be closed or recreated.

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

This skill is the orchestration layer for cross-system ShapeDiver work. Use it when the
answer must cross the PB -> GB boundary and the main risk is choosing the wrong
identifier, ticket, JWT scope, or host.

## Scope And Non-Goals

Use this skill to:

- classify the task as PB-only, GB-only, or combined,
- decide the exact PB -> GB order,
- normalize identifiers and credentials once,
- choose the minimum GB scopes,
- hand off to the Platform or Geometry implementation skill with the right prerequisites.

Do not use this skill as:

- a second full PB SDK manual,
- a second full GB SDK manual,
- a browser Viewer/App Builder implementation skill.

## Canonical Decision Order

Always follow this order:

1. Classify the task: PB-only, GB-only, or PB+GB combined.
2. If PB-only, route to `shapediver-platform-backend`.
3. If GB-only and the user already has `modelViewUrl` plus backend ticket/JWT, route to
   `shapediver-geometry-backend`.
4. If combined, continue here and finish PB-side resolution before generating GB runtime
   code.
5. Normalize identifiers: keep the user-facing slug/id/guid, resolve the canonical PB
   model `id`, and resolve the canonical GB model `guid`.
6. Choose the runtime credential: embedding ticket for browser embedding, backend ticket
   for server/CLI/headless runtime, PB-issued JWT/model token when strong auth or scoped
   GB access is required.
7. Choose the minimum JWT scopes.
8. Build one normalized PB -> GB handoff object.
9. Only then load the specialist PB/GB references for exact SDK syntax.

Do not reopen the model-resolution problem later in the answer after this handoff is built.

## Canonical PB -> GB Handoff Object

Normalize the bridge values into one explicit object and carry that object forward:

```ts
interface IGeometryBackendAccessData {
  access_token: string;
  model_view_url: string;
  ticket?: string;
  guid?: string;
  guids?: string[];
  scopes: string[];
}
```

Populate it with:

- `access_token`: PB-issued GB JWT/model token when using the repo-default strong-auth
  pattern,
- `model_view_url`: the real GB host returned by PB,
- `ticket`: embedding ticket or backend ticket when the session flow is ticket-based,
- `guid` or `guids`: the canonical GB model identity,
- `scopes`: the exact scopes requested from PB.

Rules:

- Prefer the real `model_view_url` from the PB token response.
- Fall back to `backend_system.model_view_url` only when that is the actual source you have.
- Keep PB bearer tokens out of this object. They are not GB runtime credentials.
- Do not mix values from different models.

## Credential And Scope Selection

Ticket choice:

- embedding ticket: browser embedding only,
- backend ticket: backend runtime, CLI, automation, file upload, compute/export flows,
- author ticket: avoid by default; use it only when the workflow explicitly requires
  elevated authoring access.

Ticket lifecycle rule:

- new GB sessions normally start from a PB-generated ticket,
- that ticket is only usable after the Platform-side model exists and the Grasshopper file
  upload/check lifecycle has completed successfully.

Scope choice:

- `GroupView`: metadata inspection and output computation,
- `GroupExport`: export computation,
- `GroupOwner`: GB model upload or owner-level GB management,
- `GroupAnalytics`: GB runtime analytics.

Request the smallest scope set that satisfies the task. Do not default to broader scopes.

Token usage rules:

- Use a GB token/JWT when the workflow needs authorization before any session exists, for
  example model creation, upload, or other pre-session model-management flows.
- Use a GB token/JWT together with the session flow when the model's `require_token`
  property is enabled.

## Canonical Combined Patterns

Slug/id/guid -> runtime metadata or compute:

1. PB authenticate.
2. PB resolve the model and capture canonical PB `id` and GB `guid`.
3. PB retrieve the backend ticket and, when appropriate, request a model token/JWT plus
   `model_view_url`.
4. Build `IGeometryBackendAccessData`.
5. Load `shapediver-geometry-backend` for the actual session/output/export/file code.

Browser embedding setup:

1. PB ensure domains and embedding settings are correct.
2. PB retrieve embedding ticket and `model_view_url`.
3. PB request a JWT too when strong authorization is enabled.
4. Route onward to `shapediver-viewer` or `shapediver-appbuilder*`.

Upload / check / publish:

1. PB `models.create(...)`.
2. PB request a model-management token with `GroupOwner` and `GroupView`, plus the real
   `model_view_url` and `guid`.
3. GB fetch the model upload target by `guid`, upload the `.gh` or `.ghx`, and poll GB
   model status.
4. PB patch/sync the PB model status, then publish only if the GB result is confirmed.

Analytics:

1. PB resolve the model or model set.
2. PB request `GroupAnalytics`.
3. GB query analytics with `guid` or `guids`.
4. Merge the result back into PB-side reporting.

## Routing Rules

- Read [references/workflow-orchestration.md](references/workflow-orchestration.md)
  first and treat it as the orchestration source of truth for PB -> GB workflows.
- Read [references/model-upload-check-publish.md](references/model-upload-check-publish.md)
  for the canonical TypeScript workflow that creates the PB model, requests a
  model-management token, uploads the Grasshopper file to GB, polls checks, and publishes.
- Read [../shapediver-platform-backend/SKILL.md](../shapediver-platform-backend/SKILL.md)
  when you need the exact Platform-side rules and references.
- Read [../shapediver-geometry-backend/SKILL.md](../shapediver-geometry-backend/SKILL.md)
  when you need the exact Geometry-side SDK rules and references.
- Route browser rendering/configurator work to `shapediver-viewer` or the
  `shapediver-appbuilder*` skills after credentials and model metadata are settled.

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

## Cross-System Anti-Patterns

- Do not send PB bearer tokens to GB endpoints.
- Do not use embedding tickets for backend automation.
- Do not use backend tickets for browser embedding flows.
- Do not guess `modelViewUrl`; take it from PB data.
- Do not confuse PB model `id` with GB `guid`.
- Do not request broader scopes than needed.
- Do not re-resolve slug/id/guid repeatedly after the handoff object is built.
- Do not mix a ticket from one model with a JWT or `model_view_url` from another.
- Do not open a GB session until PB-side resolution is finished.

## Exit Criteria

A PB+GB answer is correct only if all of these are true:

- it classifies the task as PB-only, GB-only, or combined,
- it states which system is used first and why,
- it distinguishes PB `id` from GB `guid`,
- it chooses the correct ticket type and minimum JWT scopes,
- it builds or describes one normalized PB -> GB handoff object,
- it uses the real `modelViewUrl` returned by PB,
- it delegates exact SDK syntax to the PB or GB specialist skill instead of improvising it
  here,
- it states when to route onward to Viewer/App Builder,
- it states when the downstream GB session must be closed or recreated.

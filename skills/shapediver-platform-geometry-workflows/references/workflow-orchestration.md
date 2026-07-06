# ShapeDiver Platform + Geometry Workflow Orchestration

Read this reference when a task crosses the boundary between the ShapeDiver Platform
Backend and the Geometry Backend.

Use it to decide:

- whether the task is PB-only, GB-only, or PB+GB combined,
- which credentials are required,
- which identifiers must be normalized,
- which system goes first,
- which handoff values must be carried into the runtime step.

Use the platform and geometry specialist skills for exact SDK syntax after the orchestration
decision is made.

## Mental Model

- Platform Backend is the control plane.
- Geometry Backend is the execution plane.

Core rule:

- PB gives you identity, authorization, tickets/JWTs, and the real `modelViewUrl`.
- GB creates sessions and does runtime work such as metadata lookup, output/export
  computation, file upload, analytics, and sdTF processing.

Typical combined flow:

1. Authenticate with PB.
2. Resolve the model from slug/id/guid.
3. Retrieve the correct ticket and/or JWT plus the real `modelViewUrl`.
4. Initialize the GB SDK with that `modelViewUrl`.
5. Create the GB session.
6. Read metadata or run the requested runtime step.
7. Close the GB session.

## Bridge Values

These are the critical PB -> GB handoff values:

| Value | Source | Use |
| --- | --- | --- |
| Platform bearer token | PB OAuth/auth flow | PB API calls only |
| `ticket` | PB model data | Browser-facing embedding flows |
| `backend_ticket` | PB model data | Server/CLI/headless GB flows |
| GB JWT / model token `access_token` | PB token flow | GB strong authorization |
| `model_view_url` | PB token response | Preferred GB base URL |
| `backend_system.model_view_url` | PB model embed | GB base URL fallback |
| PB model `id` | PB model lookup | PB write/token operations |
| GB model `guid` | PB model lookup | GB model-based flows |
| token scopes | PB token request | GB permission envelope |

Normalize these once before GB work instead of re-resolving them repeatedly.

Recommended normalized handoff object:

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

## Identifier Rules

Keep these separate:

- slug: human-facing model identifier,
- PB model `id`: canonical Platform identifier,
- GB model `guid`: canonical Geometry identifier.

Robust pattern:

1. Accept slug/id/guid from the user.
2. Resolve the model in PB.
3. Store both the canonical PB `id` and GB `guid`.
4. Use PB `id` for later PB token or patch operations.
5. Use GB `guid` for GB model-based flows such as `createSessionByModel(guid)`.

## Credential Selection

Choose the runtime credential by context:

- embedding ticket: browser embedding or Viewer/direct embedding flows,
- backend ticket: server scripts, CLI tools, automation, and headless runtime,
- author ticket: only when explicitly needed for elevated authoring-style access.

If strong authorization is required:

- a ticket alone is not enough,
- PB must also provide a GB JWT/token,
- the GB SDK must be configured with that token,
- then the session is created using either:
  - `createSessionByTicket(ticket)` with the JWT in configuration, or
  - `createSessionByModel(guid)` when the JWT and workflow support it.

Default server-side rule:

- prefer backend ticket + PB-issued JWT + PB-provided `modelViewUrl`.

## Scope Selection

Request the minimum GB JWT scopes needed:

- `GroupView`: inspect metadata or compute outputs,
- `GroupExport`: export permission,
- `GroupOwner`: GB model upload or owner-level management,
- `GroupAnalytics`: GB runtime/session statistics.

Do not request broader scopes without a reason.

## Routing Decision Tree

### PB-only

Use only the Platform Backend skill when the task ends at:

- auth,
- model lookup,
- domains,
- saved states,
- sharing,
- API tokens / clients,
- PB-only analytics / logs,
- ticket or JWT retrieval with no runtime step.

### GB-only

Use only the Geometry Backend skill when the user already has:

- `modelViewUrl`,
- backend ticket or JWT,
- current parameter/output/export metadata or placeholders,

and the task is only:

- session creation,
- output/export computation,
- file upload,
- sdTF runtime work,
- result download,
- runtime troubleshooting.

### PB+GB Combined

Stay in this skill when the task starts with PB-side identifiers or credentials and ends in
runtime work, for example:

- slug -> runtime metadata,
- slug -> output/export computation,
- PB ticket/JWT retrieval -> GB session creation,
- upload/check/publish,
- PB-issued analytics token -> GB analytics,
- sdTF runtime after PB model resolution.

Fallback order when uncertain:

1. If the task is browser rendering/configurator/embed, route to Viewer or App Builder.
2. Else if it starts from slug/id/account credentials, start in PB.
3. Else if the user already has `modelViewUrl` plus GB credentials, start in GB.
4. Else if it needs both model lookup and runtime execution, treat it as PB+GB combined.

## Canonical Combined Workflows

### Slug -> Runtime Metadata Or Computation

1. PB authenticate.
2. PB resolve the model and capture canonical `id` and `guid`.
3. PB retrieve backend ticket or request a model token/JWT as needed.
4. PB return the real `modelViewUrl`.
5. GB configure `basePath = modelViewUrl` and `accessToken = jwt` when needed.
6. GB create the session.
7. GB inspect `parameters`, `outputs`, `exports`, or compute the requested result.
8. GB close the session.

### Browser Embedding Setup

1. PB ensure direct embedding and domains are configured.
2. PB retrieve embedding ticket + `modelViewUrl`.
3. PB also request a JWT if strong authorization is enabled.
4. Route to Viewer/App Builder for browser-side work.

### Backend File Parameter Workflow

1. PB resolve backend ticket + `modelViewUrl` + JWT if needed.
2. GB open a session.
3. GB request a presigned upload asset.
4. Upload bytes to the presigned URL.
5. Use the returned file id as the parameter value.
6. Compute outputs/exports.
7. Close the session.

### Upload / Check / Publish

1. PB `models.create(...)` creates the platform model.
2. PB resolves `model_view_url`, guid, and a JWT/model token with `GroupOwner` +
   `GroupView`.
3. GB `ModelApi.getModel(guid)` returns model metadata plus the presigned upload URL.
4. GB uploads the `.gh` or `.ghx` bytes to that model upload target.
5. GB `ModelApi.getModel(modelId)` is polled until status becomes `confirmed`, `denied`, or
   `pending`.
6. GB session creation is not the primary entrypoint for this create-and-upload flow.
7. PB syncs status and publishes if confirmed.

This is not PB-only. PB and GB are explicitly chained.

Read [model-upload-check-publish.md](model-upload-check-publish.md) next for the canonical
TypeScript helper structure and polling pattern.

### Analytics Across Both Systems

Use PB first when model/runtime statistics depend on model discovery or scope issuance:

1. PB query or load the relevant platform models.
2. PB request a JWT with `GroupAnalytics`.
3. GB query analytics using the guid or guid list.
4. Merge the GB result back into PB-side reporting data.

## `modelViewUrl` Rule

Always use the real GB host from PB data:

- `model_view_url` from a PB token response, or
- `backend_system.model_view_url` from a PB model embed.

Do not guess a shared backend host.
Do not assume the PB host is also the GB host.

## Lifecycle Rules

Assume:

- GB JWTs expire,
- GB sessions expire,
- many output/export asset URLs are transient or session-bound.

Operational rules:

- finish PB-side decisions before opening the GB session,
- create the session as late as practical,
- reuse one session for related runtime operations,
- download needed session-bound assets before closing the session,
- close the session explicitly,
- if the session is gone, recreate it,
- if the JWT is expired or lacks scope, go back to PB for a fresh or broader token.

## Common Cross-System Mistakes

- Using embedding tickets for backend automation.
- Using backend tickets for browser embedding.
- Sending PB bearer tokens to GB endpoints.
- Sending GB tickets to PB endpoints.
- Ignoring strong authorization when a JWT is required.
- Using the wrong JWT scopes.
- Guessing `modelViewUrl` instead of using PB-derived values.
- Inventing parameter/output/export ids.
- Mixing a ticket from one model with a JWT or `modelViewUrl` from another.
- Opening a new GB session for every tiny action.
- Treating session-bound asset URLs as permanent.
- Using Viewer/App Builder patterns inside backend runtime code.

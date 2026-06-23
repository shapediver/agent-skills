# ShapeDiver Platform Backend Concepts

Read this reference when the user needs conceptual guidance, resource selection, auth
reasoning, or boundary clarification between the Platform Backend, Geometry Backend, and
Viewer/App Builder layers.

## Mental Model

The ShapeDiver Platform Backend is the control plane for ShapeDiver. It manages account,
ownership, access, metadata, settings, and authorization flows. It does not execute
Grasshopper computations itself.

Use the Platform Backend for:

- users and profile/account settings,
- organizations and membership,
- models and model metadata,
- sharing, link sharing, and tags,
- embedding domains,
- saved states,
- API clients, API access keys, and secrets,
- analytics and logs,
- retrieving the tickets or JWT-style tokens needed to access Geometry Backend systems.

Use the Geometry Backend for:

- sessions,
- parameter customization,
- outputs,
- exports,
- file parameter uploads,
- runtime model computation.

Use the Viewer API for:

- browser rendering,
- browser interaction,
- frontend configurator behavior.

## System Boundaries

- Platform Backend: account/model/domain/token/settings management.
- Geometry Backend: computation runtime and session-based model execution.
- Viewer/App Builder: frontend/browser integrations that consume model credentials.

Rule of thumb:

- If the user needs to manage a resource or obtain credentials, stay on the Platform
  Backend.
- If the user needs to run a model, move to the Geometry Backend.
- If the user needs a browser configurator, move to the Viewer or App Builder.

## Base URLs And API Surfaces

Default public deployment:

- Platform root: `https://app.shapediver.com`
- OAuth: `https://app.shapediver.com/oauth/...`
- Platform REST: `https://app.shapediver.com/api/v1/...`
- Webhooks: `https://app.shapediver.com/webhook/v1/...`
- Swagger UI: `https://app.shapediver.com/api/documentation`
- OpenAPI JSON: `https://app.shapediver.com/docs?api-docs.json`

Enterprise or dedicated deployments can use a different Platform root. Do not hard-code
`app.shapediver.com` when the user provides another Platform URL.

## Authentication Model

Most protected Platform Backend calls require both:

- `Authorization: Bearer <platform-access-token>`
- `X-ShapeDiver-Client: <client-id>`

Use `POST /oauth/token` to obtain the Platform bearer token.

Preferred machine authentication:

- access key ID as `username`
- access key secret as `password`
- `grant_type=password`

Keep these distinctions straight:

- API clients: OAuth client definitions and related client behavior.
- API tokens / access keys: user-owned credentials used to authenticate to the Platform.
- Platform bearer token: authorizes Platform Backend calls only.
- Geometry Backend ticket: model access credential for Geometry Backend session creation.
- Geometry Backend JWT/token: strong-authorization credential for Geometry Backend access.

Do not send a Platform bearer token to Geometry Backend endpoints. Do not send a Geometry
Backend ticket to Platform endpoints.

## Core Entities

### Users

Users own models, access keys, API clients, refresh tokens, domains, and secrets. Profile
visibility affects what other users can discover and can alter effective model visibility.

### Organizations

Organizations manage shared ownership and policy:

- membership and roles,
- org-level domains,
- org-level sharing controls,
- strong authorization policies,
- default backend selection,
- optional visibility filtering via tags or teams.

Joining an organization can transfer ownership and control of user data to that
organization.

### Backend Systems

A backend system is the Geometry Backend environment hosting the model. Important field:
`backend_system.model_view_url`. Backend selection affects future uploads, not migration of
existing models.

### Models

Platform models connect platform metadata to hosted Grasshopper definitions. Important
embedded or related fields include:

- `slug`, `guid`, `id`,
- `visibility` and `visibility_nominal`,
- `backend_system`,
- `ticket`,
- `backend_ticket`,
- `author_ticket`,
- `accessdomains`,
- `global_accessdomains`,
- `use_global_accessdomains`,
- `backend_access`,
- `require_token`,
- `allow_direct_embedding`,
- `link_sharing_slug`,
- `saved_states`,
- `organization`,
- `tags`.

### Domains

Domains whitelist where embedding is allowed. Rules:

- hostname matching is exact,
- include non-standard ports,
- subdomains are not implied,
- localhost entries are allowed,
- `*.local` and `*.localhost` entries do not count against quota.

### Saved States

Saved States are first-class Platform objects for stored parameter/viewer snapshots with
CRUD and sharing support.

Do not confuse them with Model States. Model States are a separate feature and are not the
same resource as Saved States.

### Secrets

The Platform supports user secrets and organization secrets for workflows that feed secure
values into ShapeDiver models.

### Sharing, Tags, Metrics, Logs

Platform resources also cover:

- direct model sharing,
- link sharing via `link_sharing_slug`,
- tags for organization and filtering,
- credit/session analytics,
- HTTP logs and job logs.

## Model Developer Settings

Three model-level developer settings matter often:

- Direct embedding: enables browser embedding and exposes an embedding ticket plus
  `modelViewUrl`.
- Backend access: enables server-side/headless access and exposes a backend ticket plus
  `modelViewUrl`.
- Strong authorization: requires an additional Geometry Backend JWT/token beyond the
  ticket.

When a user or organization forces strong authorization, model-level opt-out is not
available.

## Geometry Backend Bridge

The Platform Backend is often used to obtain Geometry Backend credentials:

- embedding ticket,
- backend ticket,
- author ticket,
- Geometry Backend JWT/token,
- `backend_system.model_view_url`.

Relevant token endpoints include:

- `POST /api/v1/tokens`
- `POST /api/v1/users/{user_id}/token`
- `POST /api/v1/organizations/{organization_id}/token`
- `POST /api/v1/backendsystems/token`

Use the model's actual `model_view_url` from Platform data. Do not assume a shared backend
host.

## Query, Filter, And Pagination Model

Many collection endpoints use `POST .../query` with a JSON body instead of `GET` query
strings.

Common request fields:

- `filters`
- `sorters`
- `embed`
- `limit`
- `strict_limit`
- `offset`

Filter keys often include operator suffixes such as:

- `[:]` exact match
- `[!:]` not equal
- `[%]` substring match
- `[,]` one-of/list membership
- `[?]` has value
- `[!?]` missing value
- `[<:]`, `[<=:]`, `[>:]`, `[>=:]` range comparisons

Treat `next_offset` as opaque. Feed it back unchanged for the next page instead of trying
to interpret it as an integer.

## Common Failure Modes

- Using a Platform bearer token as a Geometry Backend session credential.
- Sending a Geometry Backend ticket to Platform endpoints.
- Hard-coding `https://app.shapediver.com` when the user is on a dedicated deployment.
- Omitting `X-ShapeDiver-Client` on protected Platform requests.
- Assuming embed fields are present without requesting them.
- Treating `visibility` and `visibility_nominal` as the same thing.
- Assuming public model visibility bypasses user or organization policy.
- Treating Saved States and Model States as the same feature.
- Forgetting that API token secrets are returned only once on creation.

# Geometry Backend Concepts

Load this reference for architecture, authentication, session lifecycle, model metadata,
and API-boundary questions. Keep SDK syntax in the language-specific references.

## System Model

ShapeDiver Geometry Backend systems host Grasshopper models, run Rhino/Grasshopper
computations, cache output/export results, and expose models to SDKs and REST clients.
Each uploaded model has a backend origin called `modelViewUrl`; SDK code must use the
model's actual `modelViewUrl`, not a hardcoded shared backend.

Shared examples such as `https://sdr7euc1.eu-central-1.shapediver.com` or
`https://sdeuc1.eu-central-1.shapediver.com` are documentation examples only unless
returned by model metadata.

## Boundaries

| System | Use for |
| --- | --- |
| Geometry Backend SDKs | Server-side or backend-style computation/export/file/download code without a Viewer. |
| Geometry Backend REST/OpenAPI | Endpoint/schema questions, unsupported SDK operations, custom clients in other languages. |
| Platform Backend API | Obtaining tickets/JWTs, model/account administration, upload/settings workflows. |
| ShapeDiver Viewer API | Browser 3D viewer/configurator code. |
| App Builder | Iframe/theme/fork application workflows. |

This skill is SDK-first. For browser rendering, route to the Viewer skill. For App Builder
workflows, route to the App Builder skills.

## Tickets, JWTs, And modelViewUrl

- A backend ticket is the default credential for server-side Geometry Backend SDK sessions.
- An embedding ticket is meant for browser embedding and domain-whitelist workflows; do not
  default to it for backend SDK code.
- A JWT is required when model settings require strong authorization or when using model-id
  or backend-restricted operations.
- Tickets/JWTs come from the ShapeDiver Platform or Platform Backend API, not from the
  Geometry Backend SDK itself in normal application code.
- JWTs expire. Production applications need a trusted refresh/acquisition flow.

## Sessions And Metadata

Most SDK operations are session-based:

1. Configure the SDK with `modelViewUrl` and optional JWT.
2. Create a session by backend ticket, or by model ID when a properly scoped JWT is available.
3. Read `parameters`, `outputs`, and `exports` from the session response.
4. Use current IDs from that metadata for computation/export/upload/download logic.
5. Reuse the open session for related operations in the same workflow.
6. Close the session explicitly after the last operation that needs it.

Sessions have limited lifetime and can expire due to inactivity. Session-bound asset URLs
must be downloaded before the session closes or expires. If a request fails with
`SdSessionGoneError` or HTTP `410`, create a new session and retry the needed operation.

Backend sessions are billed per computation/export request, so batch related parameter
changes into one output/export request where possible.

## Permissions And Response Shape

Some parts of SDK and REST responses are permission-dependent. Permissions can be granted by
the session itself, by the ticket used to create the session, or by a JWT passed with the SDK
configuration/request. A response can therefore be valid while omitting sections such as
settings, statistics, file upload/download blocks, or other protected data.

Agent guidance:

- Do not assume every documented response field is present.
- Use optional access and explicit checks around `parameters`, `outputs`, `exports`, asset
  blocks, settings, statistics, and other protected sections.
- If required data is missing, explain that the session/ticket/JWT may not include the
  needed permission and that a Platform Backend API or model-access change may be required.
- When using model-id or backend-restricted operations, require a JWT with the necessary
  scopes/permissions in addition to any session access.

## Outputs, Exports, Files, Assets

- Parameters are model inputs. Use current parameter IDs from metadata or placeholders.
- Outputs are computed display/data/material results. Read generated content from returned
  output data; do not invent static asset URLs.
- Exports are explicit production/download/email results. Trigger exports only when asked.
- File parameters require requesting an upload asset, uploading bytes to a presigned URL,
  then using the returned file id as the parameter value.
- Presigned upload URLs must receive the returned upload headers and must not receive
  Geometry Backend bearer authorization.

## Common Failure Modes

- Using the wrong `modelViewUrl`.
- Using an embedding ticket for backend code.
- Missing, expired, or insufficient JWT.
- Missing response sections because the session/ticket/JWT lacks the needed permission.
- Inventing parameter/output/export IDs.
- Forgetting to close sessions.
- Treating output/export URLs as permanent static URLs.
- Ignoring delayed results and cache/polling behavior.
- Uploading a file but sending filename or upload URL instead of the returned file id.

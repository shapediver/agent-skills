# Geometry Backend Auth And Credentials

Read this reference when the main problem is choosing the correct GB credential and host.

## Canonical Runtime Inputs

For backend/runtime SDK code, gather:

- `modelViewUrl`
- backend ticket or embedding ticket
- JWT/model token when strong authorization is enabled or when the workflow already uses a
  PB-issued GB token
- current parameter/output/export metadata or explicit placeholders

If these values still need to be resolved from a slug/id/guid or PB credentials, load
`shapediver-platform-geometry-workflows` first.

## Ticket Choice

- Embedding ticket: browser embedding, Viewer, or direct embedding flows.
- Backend ticket: server scripts, CLI tools, automation, exports, file uploads, and other
  headless runtime flows.
- Author ticket: elevated authoring-style access only when the workflow explicitly requires
  it.

Do not use embedding tickets for server-side runtime examples by default.

## JWT / Model Token Rules

Use a JWT/model token when:

- the model requires strong authorization,
- the workflow came from PB token issuance,
- the workflow needs explicit scopes such as export, owner, or analytics access.

TypeScript configuration pattern:

```ts
const config = new Configuration({
  basePath: modelViewUrl,
  accessToken: jwt,
});
```

Rules:

- JWTs and tickets are different artifacts.
- PB bearer tokens are different again; they do not belong in GB runtime calls.
- Keep JWTs server-side.

## `modelViewUrl` Rule

Always use the real backend host for the model:

- from PB `model_view_url`, or
- from PB `backend_system.model_view_url`, or
- from trusted user-provided model metadata.

Do not hardcode a shared host when the real host is already known.

## Placeholder Set

Use:

- `PASTE_YOUR_MODEL_VIEW_URL_HERE`
- `PASTE_YOUR_BACKEND_TICKET_HERE`
- `PASTE_YOUR_JWT_HERE`
- `PARAMETER_ID`
- `OUTPUT_ID`
- `EXPORT_ID`

Do not invent real values.

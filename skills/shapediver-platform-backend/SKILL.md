---
name: shapediver-platform-backend
description: >
  Use this skill when the user needs to work with the ShapeDiver Platform
  Backend API or @shapediver/sdk.platform-api-sdk-v1: authentication with
  Platform API access keys or OAuth clients, querying or updating models,
  users, organizations, domains, saved states, sharing, API tokens, API
  clients, tags, analytics, logs, secrets, model metadata, embedding/backend
  tickets, Geometry Backend JWT/token requests, or Platform REST endpoints.
  Do NOT use this skill for Geometry Backend session computation, Viewer
  browser configurators, App Builder iframe/theme/fork workflows, or
  Grasshopper modeling.
license: MIT
---

# ShapeDiver Platform Backend API And SDK

> **Prerequisite:** This skill assumes you have already read and followed the
> `shapediver-router` skill. If you arrived here directly, stop — read
> `shapediver-router` first. It selects the correct integration strategy and
> gathers required credentials before any implementation skill is read.

This is the Platform Backend implementation skill. Use it to generate correct Platform SDK
or REST code for auth, models, domains, saved states, sharing, tokens, analytics, and
other PB resources.

## Scope And Non-Goals

Stay on the PB side:

- authentication,
- models and model metadata,
- domains,
- saved states,
- sharing,
- API clients and API tokens,
- secrets,
- logs and analytics,
- ticket or JWT issuance for downstream GB use.

Do not use this skill for GB session creation, output/export computation, GB file uploads,
browser Viewer/App Builder code, or Grasshopper authoring.

Routing rules:

- PB resolution plus GB runtime: `shapediver-platform-geometry-workflows`
- already has `modelViewUrl` plus backend ticket/JWT: `shapediver-geometry-backend`
- browser UI or embedding implementation: `shapediver-viewer` or `shapediver-appbuilder*`

## Canonical Package, Import, And Client Rules

Preferred SDK package:

- `@shapediver/sdk.platform-api-sdk-v1`

Install:

```bash
npm i @shapediver/sdk.platform-api-sdk-v1
```

Canonical imports:

```ts
import { create, SdPlatformSortingOrder, SdPlatformModelGetEmbeddableFields, SdPlatformModelQueryEmbeddableFields, SdPlatformModelTokenScopes, isPBValidationResponseError, isPBForbiddenResponseError, isPBOAuthResponseError } from "@shapediver/sdk.platform-api-sdk-v1";
```

Canonical client construction:

```ts
const client = create({
  clientId: process.env.SHAPEDIVER_CLIENT_ID!,
  clientSecret: process.env.SHAPEDIVER_CLIENT_SECRET ?? undefined,
  baseUrl: process.env.SHAPEDIVER_PLATFORM_URL ?? "https://app.shapediver.com",
});
```

Rules:

- The `v1` suffix is part of the package name: `@shapediver/sdk.platform-api-sdk-v1`.
- Prefer the latest available Platform SDK package version. Do not downgrade or omit the
  versioned package name unless the user explicitly requires an older package.
- Pass the Platform root as `baseUrl`. Do not append `/api/v1`.
- Do not invent alternate package names, manual axios wrappers, or fake SDK methods.
- Prefer SDK code for TypeScript/JavaScript unless the user explicitly asks for raw REST or
  uses a different language.

## Canonical Authentication Pattern

Authenticate before protected resource calls.

Preferred machine/server auth:

```ts
await client.authorization.passwordGrant(process.env.SHAPEDIVER_ACCESS_KEY_ID!, process.env.SHAPEDIVER_ACCESS_KEY_SECRET!);
```

Rules:

- Treat the access key ID as the SDK `username`.
- Treat the access key secret as the SDK `password`.
- Use refresh-token or authorization-code flows only when the user's application actually
  needs them.
- Keep access key secrets, client secrets, refresh tokens, bearer tokens, tickets, and GB
  JWTs server-side.
- Distinguish Platform bearer tokens from Geometry credentials. They are not
  interchangeable.

## Canonical Request And Response Pattern

SDK responses are wrapped. Read data from the correct container:

- `getResponse.data`
- `queryResponse.data.result`
- `queryResponse.data.pagination.next_offset`

Canonical query example:

```ts
const models = await client.models.query({
  filters: { "deleted_at[?]": null, "status[,]": ["done"] },
  sorters: { created_at: SdPlatformSortingOrder.Desc },
  limit: 20,
  strict_limit: true,
  offset: null,
  embed: [SdPlatformModelQueryEmbeddableFields.BackendSystem],
});
for (const model of models.data.result) console.log(model.id, model.title);
const nextOffset = models.data.pagination?.next_offset ?? null;
```

Use resource-specific embed enums when available. Treat `next_offset` as an opaque cursor.

## Canonical High-Value Resource Patterns

Model read with embeds:

```ts
const model = await client.models.get("MODEL_ID_OR_SLUG", [
  SdPlatformModelGetEmbeddableFields.BackendSystem,
  SdPlatformModelGetEmbeddableFields.Accessdomains,
  SdPlatformModelGetEmbeddableFields.BackendTicket,
]);
```

GB JWT/model token request:

```ts
const token = await client.modelTokens.create({
  id: "PLATFORM_MODEL_ID",
  scope: [SdPlatformModelTokenScopes.GroupView],
  lifetime: 3600,
});
console.log(token.data.access_token, token.data.model_view_url);
```

Geometry credential rules:

- `ticket` and `backend_ticket` are the normal credentials for creating new GB sessions.
- These tickets are generated by PB and only become usable after the model exists and its
  Grasshopper file has been uploaded and checked successfully.
- Avoid `author_ticket` by default; use it only when the workflow explicitly needs elevated
  authoring access.
- GB tokens/JWTs are typically used either before a session exists, for example in model
  creation or upload/check workflows, or together with a session flow when the model's
  `require_token` property is enabled.

Domain query/create pattern:

```ts
const domains = await client.domains.query({ filters: { "name[:]": "localhost:3000" }, limit: 5 });
if (domains.data.result.length === 0) await client.domains.create({ name: "localhost:3000" });
```

API token creation rule:

- `key_secret` is returned only once. Surface that clearly.

## Canonical REST Rules

Use raw REST only when requested or when working outside the supported SDK.

REST base paths:

- OAuth: `{platformRoot}/oauth/...`
- Platform resources: `{platformRoot}/api/v1/...`
- Webhooks: `{platformRoot}/webhook/v1/...`

Protected REST requests normally need both:

- `Authorization: Bearer <platform-access-token>`
- `X-ShapeDiver-Client: <client-id>`

## Reference Loading

- Read [references/sdk-typescript.md](references/sdk-typescript.md) for TypeScript,
  JavaScript, Node.js, `create({ ... })`, auth flows, and wrapped response access.
- Read [references/auth-and-credentials.md](references/auth-and-credentials.md) for access
  keys, client IDs, base URLs, protected headers, and Platform-vs-Geometry credential
  boundaries.
- Read [references/pagination-and-queries.md](references/pagination-and-queries.md) for
  filters, embeds, sorting, query pagination, and query-loop patterns.
- Read [references/rest-api-patterns.md](references/rest-api-patterns.md) for cURL, raw
  REST, OAuth requests, and non-SDK language patterns.
- Read [references/platform-backend-concepts.md](references/platform-backend-concepts.md)
  for deeper control-plane concepts, model settings, sharing, and PB-vs-GB behavior.
- Read [references/openapi-on-demand.md](references/openapi-on-demand.md) only for
  endpoint/schema verification, enum confirmation, or rarely used resources.

## Safety Rules

- Never expose access key secrets, client secrets, refresh tokens, Platform bearer tokens,
  backend tickets, or GB JWTs in browser code.
- Do not invent model IDs, slugs, domains, scopes, enum names, or token values.
- Prefer generating code or cURL for destructive PB operations instead of executing them
  automatically.
- Keep Geometry tickets and JWTs as outputs of PB workflows. Do not use them here to run
  GB sessions.
- Do not imply that `author_ticket` is the default or preferred GB credential.

## Placeholders

Use clear placeholders when values are missing:

| Value | Placeholder |
| --- | --- |
| OAuth client ID       | `SHAPEDIVER_CLIENT_ID`         |
| OAuth client secret   | `SHAPEDIVER_CLIENT_SECRET`     |
| Access key ID         | `SHAPEDIVER_ACCESS_KEY_ID`     |
| Access key secret     | `SHAPEDIVER_ACCESS_KEY_SECRET` |
| Platform root URL     | `SHAPEDIVER_PLATFORM_URL`      |
| Platform bearer token | `PLATFORM_ACCESS_TOKEN`        |
| Model ID or slug      | `MODEL_ID_OR_SLUG`             |
| Platform model ID     | `PLATFORM_MODEL_ID`            |
| Organization ID       | `ORGANIZATION_ID`              |
| User ID               | `USER_ID`                      |
| Domain name           | `DOMAIN_NAME`                  |

## Model Metadata Helper

If the user provides a model slug plus Platform API access key ID and secret, the shared
repository helper can retrieve current model metadata plus the Geometry Backend bridge
values:

```bash
node scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

Use this only for model metadata retrieval workflows. It is not a general PB client.

## Exit Criteria

- SDK examples use `@shapediver/sdk.platform-api-sdk-v1`, `create({ ... })`, and the
  correct Platform root as `baseUrl`.
- Protected SDK examples authenticate before calling protected resources.
- REST examples use the correct PB base paths and protected-header rules.
- Response access uses wrapped SDK shapes correctly, including `data.result` and
  `pagination.next_offset`.
- Token/ticket examples clearly distinguish Platform bearer tokens from GB tickets/JWTs.
- Query examples use resource-specific embeds and treat pagination defensively.
- Any request that continues into GB runtime work is routed to
  `shapediver-platform-geometry-workflows` or `shapediver-geometry-backend` as appropriate.

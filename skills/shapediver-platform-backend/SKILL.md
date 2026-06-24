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

This skill is for ShapeDiver Platform Backend management and authorization work only.
Generate Platform SDK code, Platform REST/cURL examples, or conceptual guidance. Do not
turn this into Geometry Backend computation code, Viewer code, App Builder code, or
Grasshopper advice.

## Scope Discipline

- Stay on the Platform Backend side: authentication, users, organizations, models,
  domains, sharing, saved states, API clients, API tokens, secrets, analytics, logs, and
  Geometry Backend token/ticket retrieval.
- Do not create Geometry Backend sessions, compute outputs, compute exports, or upload
  file parameters here.
- Do not add a browser canvas, Viewer API integration, iframe snippet, theme setup, or
  App Builder fork workflow.
- If the user needs to run a model, compute data, generate exports, upload/publish a model,
  or query GB runtime analytics and the task still starts from Platform-side resolution,
  route to `shapediver-platform-geometry-workflows`.
- If the user already has `modelViewUrl` plus backend ticket/JWT and only needs pure GB
  runtime code, route to `shapediver-geometry-backend`.
- If the user needs a browser configurator or direct embedding UI, route to
  `shapediver-viewer` or the relevant `shapediver-appbuilder*` skill.

## Reference Loading

- Read [references/platform-backend-concepts.md](references/platform-backend-concepts.md)
  for architecture, auth model, resource boundaries, model developer settings, sharing,
  domains, saved states, tokens, and Platform vs Geometry Backend behavior.
- Read [references/sdk-typescript.md](references/sdk-typescript.md) for TypeScript,
  JavaScript, Node.js, or `@shapediver/sdk.platform-api-sdk-v1` code.
- Read [references/rest-api-patterns.md](references/rest-api-patterns.md) for cURL, raw
  REST, OAuth requests, protected headers, `/api/v1/...` resources, and non-SDK language
  patterns.
- Read [references/openapi-on-demand.md](references/openapi-on-demand.md) only when the
  compact references are not enough: endpoint/schema verification, enum names, unusual
  fields, webhook shapes, or rarely used SDK/resource methods.

## Workflow

1. Determine whether the user wants SDK code, raw REST/cURL, or conceptual help.
2. Determine the Platform root URL. Default to `https://app.shapediver.com` only when the
   user did not provide an enterprise or dedicated deployment URL.
3. Collect the auth path:
   - Prefer Platform API access key ID + secret for machine/server automation.
   - Use OAuth client ID and optional client secret when the flow requires it.
   - Treat bearer tokens, refresh tokens, access key secrets, client secrets, tickets,
     and Geometry Backend JWTs as secrets.
4. Authenticate before protected Platform calls.
5. Use the requested Platform resource area: models, users, organizations, domains, saved
   states, API tokens, API clients, sharing, secrets, logs, analytics, or webhook-facing
   endpoints.
6. Use embeds deliberately when related model data or credentials are needed.
7. Decide whether the task ends at PB or continues into GB:
   - if it ends at PB, stay here,
   - if it continues into runtime work and PB still has to resolve the bridge values,
     load `shapediver-platform-geometry-workflows`,
   - if the user already has explicit GB runtime credentials and only needs GB code, route
     to `shapediver-geometry-backend`.
8. Keep Geometry Backend tickets or JWTs as outputs of a Platform workflow. Do not use
   them inside this skill to run Geometry Backend sessions or computations.
9. Review the final answer against the exit criteria below before responding.

## Credentials And Safety

- Never expose Platform API access key secrets, OAuth client secrets, refresh tokens,
  Platform bearer tokens, Geometry Backend tickets, or Geometry Backend JWTs in browser UI
  or client-side examples.
- Do not create, revoke, patch, delete, transfer, or share real Platform resources unless
  the user explicitly asked for that operation and provided the needed context.
- For destructive or account-changing operations, prefer generating clear code or cURL and
  explain the effect instead of executing it automatically.
- Do not invent user IDs, organization IDs, model IDs, slugs, tags, domains, token
  scopes, enum names, or ticket values.

## Placeholders

Use clear placeholders when the user has not supplied concrete values:

| Value                 | Placeholder                    |
| --------------------- | ------------------------------ |
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

Use this only for model metadata retrieval workflows. It is not a general Platform Backend
client and it should not be presented as one.

## Exit Criteria

- SDK examples use `@shapediver/sdk.platform-api-sdk-v1` and pass the Platform root as
  `baseUrl`, not `/api/v1`.
- REST examples use the correct base paths:
  - OAuth: `{platformRoot}/oauth/...`
  - Platform resources: `{platformRoot}/api/v1/...`
  - Webhooks: `{platformRoot}/webhook/v1/...`
- Protected REST examples include both `Authorization: Bearer ...` and
  `X-ShapeDiver-Client: ...` unless the endpoint is explicitly public.
- SDK examples authenticate with `authorization.passwordGrant(...)`,
  `authorization.refreshToken(...)`, or the authorization-code methods before protected
  calls.
- Model/token examples clearly distinguish Platform bearer tokens, Geometry Backend
  tickets, and Geometry Backend JWTs.
- Query examples handle pagination and `next_offset` defensively.
- API token creation examples warn that `key_secret` is returned only once.

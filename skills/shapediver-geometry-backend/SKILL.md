---
name: shapediver-geometry-backend
description: >
  Use this skill when the user needs to write code with a ShapeDiver Geometry
  Backend SDK: TypeScript/JavaScript using @shapediver/sdk.geometry-api-sdk-v2,
  Python using geometry-api-v2, or PHP using GeometryBackendSdkPhp /
  shapediver/geometry-api-v2. Covers SDK setup, session lifecycle, tickets,
  JWTs, modelViewUrl, parameters, outputs, exports, file parameters, asset
  downloads, error handling, SDK selection by language, and Geometry Backend
  architecture questions. Prefer SDK code over direct REST. Do NOT use this
  skill for ShapeDiver Viewer browser apps, App Builder iframe/theme/fork
  workflows, or Grasshopper modeling.
license: MIT
---

# ShapeDiver Geometry Backend SDKs

> **Prerequisite:** This skill assumes you have already read and followed the
> `shapediver-router` skill. If you arrived here directly, stop — read
> `shapediver-router` first. It selects the correct integration strategy and
> gathers required credentials before any implementation skill is read.

This is an SDK-first skill for code that accesses ShapeDiver Geometry Backend systems
without the ShapeDiver Viewer. Use one SDK based on the user's language:

| Language/runtime                | SDK                                                               |
| ------------------------------- | ----------------------------------------------------------------- |
| TypeScript, JavaScript, Node.js | `@shapediver/sdk.geometry-api-sdk-v2`                             |
| Python                          | `geometry-api-v2`                                                 |
| PHP                             | `shapediver/GeometryBackendSdkPhp` / `shapediver/geometry-api-v2` |

Use direct REST or raw OpenAPI details only when the user explicitly asks for endpoint
details, the SDK lacks a needed operation, or you must verify a generated method/schema.

If the request starts from a model slug/id/guid or Platform credentials and the
`modelViewUrl`, backend ticket/JWT, or canonical model ids still need to be resolved first,
load `shapediver-platform-geometry-workflows` before generating Geometry code.

## Reference Loading

- Read [references/sdk-typescript.md](references/sdk-typescript.md) for Node.js,
  TypeScript, JavaScript, or `@shapediver/sdk.geometry-api-sdk-v2` code.
- Read [references/sdk-python.md](references/sdk-python.md) for Python or `geometry-api-v2`
  code.
- Read [references/sdk-php.md](references/sdk-php.md) for PHP or
  `GeometryBackendSdkPhp` code.
- Read [references/geometry-backend-concepts.md](references/geometry-backend-concepts.md)
  for architecture, tickets/JWTs, `modelViewUrl`, sessions, metadata, API boundaries,
  billing, and failure modes.
- Read [references/openapi-on-demand.md](references/openapi-on-demand.md) only for
  endpoint/schema questions, unsupported SDK operations, method-signature verification,
  or non-SDK language generation. Fetch the OpenAPI spec on demand; do not embed it.

## Workflow

1. Determine the target language and SDK. If no language is given, ask only if the code
   must be generated now; otherwise explain the three supported SDK choices briefly.
2. Load the matching SDK reference. Do not mix SDK styles across languages.
3. Confirm that the request is truly GB-only:
   - if `modelViewUrl`, backend ticket/JWT, or runtime metadata must still be resolved from
     Platform, route to `shapediver-platform-geometry-workflows` first,
   - otherwise continue here.
4. Collect `modelViewUrl`, backend ticket, optional JWT, and current model metadata
   (`parameters`, `outputs`, `exports`). Prefer backend tickets for server-side SDK use.
5. Initialize the SDK with the model's actual `modelViewUrl`. Never rely on SDK defaults
   or hardcoded shared backend URLs.
6. Create a session, read metadata from the session response, and reuse that session for
   all related SDK operations in the workflow. Do not open and close a new session for each
   SDK call unless the task truly needs isolated sessions.
7. Use SDK polling/helpers where available. When not available, handle delayed results
   according to SDK response fields and verify the operation against the OpenAPI spec only
   if needed.
8. Close the session after the last client operation that needs it. Review the code against
   the SDK reference before responding.

## Credentials And Metadata

- Never expose backend tickets, Platform API secrets, or long-lived JWTs in browser UI.
- Do not invent model-specific IDs, names, values, tickets, JWTs, model IDs, or endpoints.
- Treat response objects as permission-dependent. Some response sections can be absent
  because the session/ticket or JWT does not grant that permission.
- Use these placeholders when values are missing:

| Value          | Placeholder                      |
| -------------- | -------------------------------- |
| Backend ticket | `PASTE_YOUR_BACKEND_TICKET_HERE` |
| Model view URL | `PASTE_YOUR_MODEL_VIEW_URL_HERE` |
| JWT            | `PASTE_YOUR_JWT_HERE`            |
| Parameter id   | `PARAMETER_ID`                   |
| Output id      | `OUTPUT_ID`                      |
| Export id      | `EXPORT_ID`                      |

If the user provides a model slug plus Platform API access key ID and secret, the shared
repository helper can retrieve current metadata:

```bash
node scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

Use the returned `model.backendTicket`, `model.modelViewUrl`, `parameters`, `outputs`,
and `exports`. The helper closes its metadata session after reading it.

## Exit Criteria

- The generated code uses the SDK for the user's language, not raw REST, unless raw REST
  was explicitly requested or no SDK path exists.
- The SDK configuration uses the user's `modelViewUrl`.
- Every opened session is reused for the requested related operations where sensible, then
  closed in `finally`, `try/finally`, or the closest idiomatic cleanup path once no more
  client operations need it.
- Parameter/output/export IDs come from user input, retrieved metadata, or clear placeholders.
- Response fields gated by session/JWT permissions are checked defensively instead of
  assumed to exist.
- File upload code uses the SDK to request upload assets and does not attach Geometry
  Backend bearer auth to presigned upload URLs.
- Downloads use generated output/export content or SDK asset helpers; no static result URL
  is invented.
- Errors surface SDK/ShapeDiver response details instead of hiding them behind generic
  exceptions.
- The response states when a Platform Backend API step is required to obtain tickets/JWTs.

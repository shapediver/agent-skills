# OpenAPI And REST Fallback

Load this reference only when SDK references are not enough: endpoint/schema questions,
unsupported SDK operations, exact generated method verification, or non-SDK language
generation.

## Fetch The Current Spec On Demand

Do not paste or bundle the OpenAPI spec in this skill. Fetch it when needed:

```bash
curl -L https://raw.githubusercontent.com/shapediver/OpenApiSpecifications/main/geometry_backend_v2.yaml \
  -o /tmp/geometry_backend_v2.yaml
```

Then search it locally:

```bash
rg -n "operationId:|/api/v2/session|ReqExport|ReqCustomization|ReqFileUpload" /tmp/geometry_backend_v2.yaml
```

If `yq` is available, use it to inspect specific paths or schemas. Otherwise use `rg` and
small `sed` windows.

## How To Use The Spec With SDKs

- Treat the OpenAPI spec as the source for operation IDs, request DTO fields, response DTO
  fields, and auth requirements.
- Use the spec's auth/permission notes to understand why SDK or REST responses may omit
  protected sections; permissions can come from the session/ticket or from the JWT.
- Prefer the installed SDK's generated types/tests over guessed method signatures.
- Operation IDs usually map to SDK methods by language convention:
  - TypeScript/PHP: `createSessionByTicket`, `computeOutputs`, `computeExports`.
  - Python: `create_session_by_ticket`, `compute_outputs`, `compute_exports`.
- DTO field names generally preserve API JSON names in request payloads, for example
  `parameters`, `exports`, and `max_wait_time`.
- Generated DTO property access can differ by language. Verify from installed types when
  property access matters.

## REST Is Secondary

Use raw REST examples only when the user explicitly asks for cURL/HTTP, when a supported SDK
cannot do the task, or when building a custom client for another language. Even then, keep the
same safeguards as SDK code:

- Use the model's actual `modelViewUrl`.
- Use backend tickets/JWTs appropriately.
- Close sessions.
- Reuse a session for related operations before closing it.
- Use current parameter/output/export IDs from metadata.
- Treat permission-gated response sections as optional.
- Treat generated asset URLs as per-result/session-bound data.
- Do not attach Geometry Backend bearer auth to presigned upload URLs.

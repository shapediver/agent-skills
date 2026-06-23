# OpenAPI On Demand

Read this reference only when the compact Platform Backend references are not enough.

Use it for:

- uncertain endpoint paths,
- enum name verification,
- rare resource methods,
- exact create/patch payload fields,
- webhook payload or auth details,
- method-signature verification for uncommon SDK behavior.

## Authoritative Docs

Default public deployment:

- Swagger UI: `https://app.shapediver.com/api/documentation`
- OpenAPI JSON: `https://app.shapediver.com/docs?api-docs.json`

For enterprise or dedicated deployments, replace the Platform root with the user's actual
tenant URL.

## Fetch The Current Spec

Do not embed the full OpenAPI document in the skill. Fetch it only when needed:

```bash
curl -L "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/docs?api-docs.json" \
  -o /tmp/shapediver-platform-backend-openapi.json
```

Then inspect it with small searches:

```bash
rg -n '/api/v1/models|/api/v1/tokens|/oauth/token|enum|backend_ticket' \
  /tmp/shapediver-platform-backend-openapi.json
```

If `jq` is available, use it to inspect the exact schema fragment or path object. Otherwise
use `rg` plus small `sed` windows.

## How To Use It

- Verify the exact endpoint path before generating unusual requests.
- Verify enum names before using them in code or examples.
- Verify create/patch payload fields before generating destructive or state-changing calls.
- Verify webhook request/response shape before inventing payload bodies.
- When an SDK method is unclear, use OpenAPI to confirm the underlying route and DTO
  fields, then map back to the SDK resource method conservatively.

## Guardrails

- Do not guess destructive methods or patch payloads.
- Do not guess enum values or embed field names.
- Do not guess webhook payload shapes or signatures.
- Keep generated code conservative when the source material is incomplete.
- Prefer the compact references and installed SDK types first; use OpenAPI as a precise
  verifier, not the default reading path.

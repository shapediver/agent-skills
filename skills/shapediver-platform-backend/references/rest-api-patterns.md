# ShapeDiver Platform Backend REST And cURL Patterns

Read this reference when the user explicitly wants raw REST, cURL, non-SDK language code,
or HTTP-level explanation.

## Base URL Rules

Use the Platform root exactly once and build the correct surface from it:

- OAuth: `{platformRoot}/oauth/...`
- Platform resources: `{platformRoot}/api/v1/...`
- Webhooks: `{platformRoot}/webhook/v1/...`

Do not send `/api/v1` as the Platform root itself.

## OAuth Password Grant With Access Keys

Preferred machine flow:

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=password" \
  --data-urlencode "username=${SHAPEDIVER_ACCESS_KEY_ID}" \
  --data-urlencode "password=${SHAPEDIVER_ACCESS_KEY_SECRET}" \
  --data-urlencode "client_id=${SHAPEDIVER_CLIENT_ID}" \
  --data-urlencode "client_secret=${SHAPEDIVER_CLIENT_SECRET}"
```

Treat the JSON `access_token` as the Platform bearer token for later Platform requests.

## Refresh Token Flow

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=${PLATFORM_REFRESH_TOKEN}" \
  --data-urlencode "client_id=${SHAPEDIVER_CLIENT_ID}" \
  --data-urlencode "client_secret=${SHAPEDIVER_CLIENT_SECRET}"
```

## Protected Request Header Pattern

Most protected Platform requests need both headers:

```text
Authorization: Bearer PLATFORM_ACCESS_TOKEN
X-ShapeDiver-Client: SHAPEDIVER_CLIENT_ID
```

## Query Models

Many list endpoints use `POST .../query`.

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/models/query" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "deleted_at[?]": null,
      "status[,]": ["done"]
    },
    "sorters": {
      "created_at": "desc"
    },
    "embed": ["backend_system", "tags"],
    "limit": 20,
    "strict_limit": true,
    "offset": null
  }'
```

When paginating:

- read `data.pagination.next_offset`,
- pass it back unchanged as the next `offset`.

## Get A Model With Embeds

```bash
curl -G "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/models/${MODEL_ID_OR_SLUG}" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  --data-urlencode "embed[]=backend_system" \
  --data-urlencode "embed[]=accessdomains" \
  --data-urlencode "embed[]=ticket" \
  --data-urlencode "embed[]=backend_ticket"
```

Useful embeds depend on the task:

- `backend_system`
- `accessdomains`
- `global_accessdomains`
- `ticket`
- `backend_ticket`
- token-related embeds when the workflow requires them

Keep distinctions explicit:

- Platform bearer token authorizes the request above.
- `ticket` and `backend_ticket` in the response are Geometry Backend credentials, not
  Platform bearer tokens.

## Domain Query And Create

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/domains/query" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "name[:]": "DOMAIN_NAME"
    },
    "limit": 10
  }'
```

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/domains" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DOMAIN_NAME"
  }'
```

Remember:

- hostnames are exact,
- include non-standard ports,
- subdomains are not implied.

## API Token Create And Query

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/apitokens" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "CI integration token",
    "scope": ["models.write"],
    "valid_until": 1893456000
  }'
```

Warning:

- `key_secret` is returned only once on creation,
- persist it immediately,
- never print a fake secret or imply it can be fetched later.

## Geometry Backend Token Or JWT Request

Use the Platform Backend to request Geometry Backend authorization tokens when strong
authorization or scoped backend access is needed.

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/tokens" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "PLATFORM_MODEL_ID",
    "scope": ["group.view"],
    "lifetime": 3600
  }'
```

Expected response data can include:

- `access_token`
- `model_view_url`
- model or backend identifiers

This token is for Geometry Backend or Viewer-side authorization, not for Platform API
calls.
Use a real Platform model ID here, not a slug guess.

## Saved State Query And Create

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/saved_states/query" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "model_id[:]": "PLATFORM_MODEL_ID"
    },
    "limit": 20
  }'
```

```bash
curl -X POST "${SHAPEDIVER_PLATFORM_URL:-https://app.shapediver.com}/api/v1/saved_states" \
  -H "Authorization: Bearer ${PLATFORM_ACCESS_TOKEN}" \
  -H "X-ShapeDiver-Client: ${SHAPEDIVER_CLIENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Preset A",
    "model_id": "PLATFORM_MODEL_ID",
    "parameters": {
      "Width": "1200"
    },
    "visibility": "private"
  }'
```

## Webhook Boundary

Platform webhooks live under `{platformRoot}/webhook/v1/...`.

Only generate webhook examples when the user explicitly asks for them. If payload shape or
signature requirements are uncertain, verify them in the OpenAPI docs instead of guessing.

## Error Handling

Inspect both HTTP status and response JSON. Common categories:

- auth failure: missing/expired bearer token, bad OAuth request, or missing
  `X-ShapeDiver-Client`
- permission failure: valid auth but insufficient access
- validation failure: invalid fields, enum values, filter structure, or missing required
  properties
- missing resource: wrong slug, ID, or inaccessible object
- deployment mismatch: wrong Platform root for an enterprise/dedicated tenant

If endpoint fields, enum names, or patch/create payloads are uncertain, stop and verify
through [openapi-on-demand.md](openapi-on-demand.md) instead of inventing them.

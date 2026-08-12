# ShapeDiver Platform Backend SDK For TypeScript And JavaScript

Read this reference when the user wants Node.js, TypeScript, JavaScript, or
`@shapediver/sdk.platform-api-sdk-v1` code.

## Package And Imports

Package name:

- `@shapediver/sdk.platform-api-sdk-v1`

Prefer importing `create` and exported enums/types from this package instead of hard-coded
string values.

```ts
import {
  create,
  SdPlatformSortingOrder,
  SdPlatformModelVisibility,
  SdPlatformModelQueryEmbeddableFields,
  SdPlatformModelGetEmbeddableFields,
  SdPlatformSavedStateVisibility,
  SdPlatformApiTokenScopes,
  SdPlatformModelTokenScopes,
  isPBValidationResponseError,
  isPBForbiddenResponseError,
  isPBOAuthResponseError,
} from "@shapediver/sdk.platform-api-sdk-v1";
```

## Constructor Rule

Pass the Platform root as `baseUrl`. Do not pass `/api/v1`.

```ts
const client = create({
  clientId: process.env.SHAPEDIVER_CLIENT_ID!,
  clientSecret: process.env.SHAPEDIVER_CLIENT_SECRET ?? undefined,
  baseUrl: process.env.SHAPEDIVER_PLATFORM_URL ?? "https://app.shapediver.com",
});
```

Alternative forms exist, but `create({ ... })` is the clearest default.

## Supported Auth Flows

Authenticate before protected resource calls.

Supported public methods:

- `client.authorization.passwordGrant(username, password)`
- `client.authorization.refreshToken(refreshToken?)`
- `client.authorization.authorizationCode(code, state)`
- `client.authorization.authorizationCodePkce(code, codeVerifier, redirectUri)`

Preferred machine auth pattern:

- access key ID as `username`
- access key secret as `password`

```ts
await client.authorization.passwordGrant(
  process.env.SHAPEDIVER_ACCESS_KEY_ID!,
  process.env.SHAPEDIVER_ACCESS_KEY_SECRET!,
);
```

Important caveat:

- the SDK does not expose a clean public `setAccessToken(...)` path for ordinary resource
  calls,
- auto-refresh only helps when the client is already authenticated and the current token is
  expired.

## Response Access Pattern

Use the wrapped response shapes directly:

- `getResponse.data`
- `queryResponse.data.result`
- `queryResponse.data.pagination.next_offset`

Be defensive with pagination:

- `next_offset` can be absent or `null`,
- treat it as an opaque cursor.

## Query, Filter, Sort, And Embed

Use raw filter objects plus exported enums.

```ts
const models = await client.models.query({
  filters: {
    "deleted_at[?]": null,
    "status[,]": ["done"],
    "visibility[,]": [
      SdPlatformModelVisibility.Public,
      SdPlatformModelVisibility.Private,
    ],
  },
  sorters: {
    created_at: SdPlatformSortingOrder.Desc,
  },
  limit: 20,
  strict_limit: true,
  offset: null,
  embed: [SdPlatformModelQueryEmbeddableFields.User],
});

for (const model of models.data.result) {
  console.log(model.id, model.title);
}
```

Use resource-specific embed enums when available.

## Resource Map

High-value SDK resource groups:

- `client.models`: query, get, create, patch, delete, slug operations, iframe embedding.
- `client.domains`: query, get, create, patch, delete.
- `client.savedStates`: query, get, create, patch, delete.
- `client.apiTokens`: query, get, create, patch, delete.
- `client.apiClients`: query, create, patch, delete.
- `client.modelTokens`: create Geometry Backend JWT/token responses.
- `client.backendSystem`: backend system query/management and backend-system tokens.
- `client.users`: query/get/register/patch/delete plus refresh tokens and user token flows.
- `client.organizations`: query/get/create/patch/delete plus invitations, roles, user
  queries, and organization token flows.
- `client.modelSharing`: direct model sharing query/create/delete workflows.
- `client.savedStateSharing`: sharing workflows for Saved States.
- `client.tags`: tag query and maintenance.
- `client.userSecrets` and `client.organizationSecrets`: secret management.
- `client.userCreditMetrics`, `client.organizationCreditMetrics`, `client.httpLogs`, and
  `client.jobLogs`: analytics and logs.
- `client.webhooks`: Platform webhook-facing SDK methods.

## High-Value Examples

### Authenticate And Query Models

```ts
import {
  create,
  SdPlatformSortingOrder,
  SdPlatformModelQueryEmbeddableFields,
} from "@shapediver/sdk.platform-api-sdk-v1";

const client = create({
  clientId: process.env.SHAPEDIVER_CLIENT_ID!,
  baseUrl: process.env.SHAPEDIVER_PLATFORM_URL ?? "https://app.shapediver.com",
});

await client.authorization.passwordGrant(
  process.env.SHAPEDIVER_ACCESS_KEY_ID!,
  process.env.SHAPEDIVER_ACCESS_KEY_SECRET!,
);

const response = await client.models.query({
  sorters: {
    created_at: SdPlatformSortingOrder.Desc,
  },
  limit: 10,
  embed: [SdPlatformModelQueryEmbeddableFields.BackendSystem],
});

console.log(response.data.result);
```

### Get A Model With Embeds

```ts
const model = await client.models.get("MODEL_ID_OR_SLUG", [
  SdPlatformModelGetEmbeddableFields.BackendSystem,
  SdPlatformModelGetEmbeddableFields.Accessdomains,
  SdPlatformModelGetEmbeddableFields.BackendTicket,
]);

console.log(model.data.backend_system?.model_view_url);
```

### Create An API Token

```ts
const tokenResponse = await client.apiTokens.create({
  description: "CI integration token",
  scope: [SdPlatformApiTokenScopes.ModelsWrite],
  valid_until: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
});

const { key_id, key_secret } = tokenResponse.data;

// Persist key_secret immediately. It is returned only once.
console.log(key_id, key_secret);
```

### Request A Geometry Backend JWT/Token

```ts
const token = await client.modelTokens.create({
  id: "PLATFORM_MODEL_ID",
  scope: [SdPlatformModelTokenScopes.GroupView],
  lifetime: 3600,
});

console.log(token.data.access_token);
console.log(token.data.model_view_url);
```

Use this result with the Geometry Backend or Viewer authorization flow. Do not treat it as
a Platform bearer token.
Use a real Platform model ID here; this token request is more specific than
`client.models.get(...)`, which can often accept slug/id/guid.

For model upload/check/publish workflows, request model-management scopes such as
`GroupOwner` + `GroupView` and then continue in
`shapediver-platform-geometry-workflows`; do not keep that workflow inside the PB-only
skill. The create-and-upload path is token/guid-based model management, not a normal
ticket/session compute flow.

### Query Or Create A Domain

```ts
const domains = await client.domains.query({
  filters: {
    "name[:]": "localhost:3000",
  },
  limit: 5,
});

if (domains.data.result.length === 0) {
  await client.domains.create({
    name: "localhost:3000",
  });
}
```

### Create Or Query A Saved State

```ts
const savedState = await client.savedStates.create({
  name: "Preset A",
  model_id: "PLATFORM_MODEL_ID",
  parameters: {
    Width: "1200",
  },
  visibility: SdPlatformSavedStateVisibility.Private,
});

const list = await client.savedStates.query({
  filters: {
    "model_id[:]": "PLATFORM_MODEL_ID",
  },
  limit: 20,
});

console.log(savedState.data.id, list.data.result.length);
```

## Error Handling

Use SDK type guards and surface the backend details.

```ts
try {
  await client.models.query({ limit: 1 });
} catch (error) {
  if (isPBValidationResponseError(error)) {
    console.error(error.fields);
  } else if (isPBForbiddenResponseError(error)) {
    console.error(error.error_description);
  } else if (isPBOAuthResponseError(error)) {
    console.error(error.error, error.error_description);
  } else {
    throw error;
  }
}
```

Do not hide validation, auth, or permission details behind a generic error message.

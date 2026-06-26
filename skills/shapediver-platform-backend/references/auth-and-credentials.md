# Platform Backend Auth And Credentials

Read this reference when the main problem is PB authentication, base URLs, client IDs, or
credential boundaries.

## Canonical SDK Client Setup

```ts
const client = create({
  clientId: process.env.SHAPEDIVER_CLIENT_ID!,
  clientSecret: process.env.SHAPEDIVER_CLIENT_SECRET ?? undefined,
  baseUrl: process.env.SHAPEDIVER_PLATFORM_URL ?? "https://app.shapediver.com",
});
```

Rule:

- `baseUrl` is the Platform root, not `/api/v1`.

## Preferred Machine Auth

```ts
await client.authorization.passwordGrant(
  process.env.SHAPEDIVER_ACCESS_KEY_ID!,
  process.env.SHAPEDIVER_ACCESS_KEY_SECRET!,
);
```

Treat:

- access key ID as username,
- access key secret as password.

Prefer this for server automation unless the user explicitly needs another OAuth flow.

## Protected REST Headers

Most protected PB REST calls need both:

- `Authorization: Bearer <platform-access-token>`
- `X-ShapeDiver-Client: <client-id>`

Base paths:

- OAuth: `{platformRoot}/oauth/...`
- Platform resources: `{platformRoot}/api/v1/...`
- Webhooks: `{platformRoot}/webhook/v1/...`

## Credential Boundaries

Keep these distinct:

- Platform bearer token: PB API calls only
- GB ticket: GB session creation
- GB JWT/model token: GB strong authorization

Do not send PB bearer tokens to GB endpoints and do not use GB tickets as PB auth.

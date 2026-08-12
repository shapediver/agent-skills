# TypeScript / JavaScript SDK

Use this reference for Node.js, TypeScript, JavaScript, or
`@shapediver/sdk.geometry-api-sdk-v2` code. Prefer TypeScript examples for new code.

## Install And Imports

```bash
npm i @shapediver/sdk.geometry-api-sdk-v2
```

```ts
import {
  Configuration,
  SessionApi,
  OutputApi,
  ExportApi,
  FileApi,
  UtilsApi,
  processError,
  ResponseError,
  type ReqCustomization,
  type ReqExport,
} from "@shapediver/sdk.geometry-api-sdk-v2";
```

Generated API methods return Axios responses. Access DTOs via `.data`.

## Configuration

```ts
const config = new Configuration({
  basePath: modelViewUrl,
  accessToken: jwt, // optional; required when the model uses strong authorization
});
```

Rules:

- Always pass `basePath`; the default is not a valid ShapeDiver production backend.
- Use the model's actual `modelViewUrl`.
- Keep backend tickets/JWTs on the server. Do not generate frontend UI for these secrets.
- Use a backend ticket for server-side use.

## Session Pattern

Reuse one session for the related operations in a workflow, then close it when no more SDK
calls need that session. Do not open/close a separate session around each output/export/file
call.

```ts
const sessionApi = new SessionApi(config);
const session = (await sessionApi.createSessionByTicket(backendTicket)).data;

try {
  console.log(session.sessionId, session.parameters, session.outputs, session.exports);
  // Run related OutputApi, ExportApi, FileApi, and download calls with this sessionId here.
} finally {
  await sessionApi.closeSession(session.sessionId);
}
```

For model/JWT sessions, use `createSessionByModel(modelId)` only when the user has a JWT
with the required model permissions.

## Permissions And Response Shape

Some response sections are only returned when the session/ticket or JWT grants the required
permission. Code defensively:

```ts
const parameters = session.parameters ?? {};
const outputs = session.outputs ?? {};
const exportsById = session.exports ?? {};

if (!exportsById[exportId]) {
  throw new Error(`Export ${exportId} is missing; check metadata and session/JWT permissions.`);
}
```

Use optional chaining for settings, statistics, asset blocks, file upload/download data, and
other permission-gated sections. If a required section is absent, surface that the ticket,
session, or JWT may need additional permissions.

## Compute Outputs

```ts
const params: ReqCustomization = {
  [parameterId]: parameterValue,
};

const result = (
  await new OutputApi(config).computeOutputs(session.sessionId, params)
).data;

const output = result.outputs?.[outputId];
const content = output?.content;
```

Prefer `UtilsApi.submitAndWaitForOutput` when the workflow should wait for delayed results:

```ts
const result = await new UtilsApi(config).submitAndWaitForOutput(
  session.sessionId,
  params,
  120_000,
);
```

## Compute Exports

```ts
const req: ReqExport = {
  parameters: {
    [parameterId]: parameterValue,
  },
  exports: [exportId],
  max_wait_time: 120_000,
};

const result = (
  await new ExportApi(config).computeExports(session.sessionId, req)
).data;
```

Prefer `UtilsApi.submitAndWaitForExport` when the workflow should poll until ready:

```ts
const result = await new UtilsApi(config).submitAndWaitForExport(
  session.sessionId,
  req,
  120_000,
);
```

Do not use object-shaped export selections such as `{ id: exportId }`; current SDK v2
request bodies use an `exports` array.

## File Parameters

Use `FileApi` to request an upload URL, upload bytes to the returned presigned URL, then
send the returned file id as the parameter value.

```ts
const upload = (
  await new FileApi(config).uploadFile(session.sessionId, {
    [fileParameterId]: {
      filename,
      format: mimeType,
      size: byteLength,
    },
  })
).data;

const uploaded = upload.asset.file[fileParameterId];

await new UtilsApi(config).uploadAsset(uploaded.href, fileBytes, uploaded.headers);

const params: ReqCustomization = {
  [fileParameterId]: uploaded.id,
};
```

Do not add Geometry Backend bearer auth to `uploaded.href`; it is a presigned upload URL.

## Download Result Assets

When output/export `content` contains a full asset URL, use `UtilsApi.downloadAsset`:

```ts
const [downloadPromise] = new UtilsApi(config).downloadAsset(assetUrl, {
  responseType: "arraybuffer",
});
const bytes = (await downloadPromise).data;
```

If content contains encrypted asset data rather than a full URL, use the relevant
`AssetsApi` method and verify the exact method from the installed SDK or OpenAPI spec.

## Error Handling

```ts
try {
  // SDK calls here
} catch (err) {
  const e = await Promise.resolve(processError(err as Error));

  if (e instanceof ResponseError) {
    console.error(e.status, e.type, e.message, e.description);
  } else {
    console.error(e);
  }
}
```

Review `ResponseError.status` and `ResponseError.type` for cases such as expired JWT,
invalid ticket, validation errors, rate limiting, and `SdSessionGoneError`.

## TypeScript Checklist

- Use `Configuration`, then instantiate resource APIs directly.
- Await every SDK call.
- Read response DTOs from `.data`.
- Reuse a session for related operations, then close `SessionApi.closeSession()` in `finally`.
- Treat response sections as optional when they may be permission-gated.
- Use `UtilsApi` helpers for polling/upload/download when available.
- Use current parameter/export/output IDs from metadata or placeholders.

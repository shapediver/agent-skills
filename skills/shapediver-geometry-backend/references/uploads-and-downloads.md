# Geometry Backend Uploads And Downloads

Read this reference for file-parameter flows, presigned uploads, output/export downloads,
and session-bound asset handling.

## File Parameter Upload Flow

Canonical TypeScript pattern:

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

Rules:

- request the upload asset through the SDK first,
- upload bytes to the returned presigned URL,
- use the returned uploaded file id as the parameter value,
- reuse the same session for the upload and the follow-up compute/export call.

Do not:

- attach GB bearer auth to the presigned upload URL,
- invent a file id,
- open a second session just for the upload,
- skip the compute step that actually consumes the uploaded file parameter.

## Output And Export Downloads

Download from the SDK response content:

- output `content`
- export `content`

When the SDK response gives a full asset URL, prefer the helper:

```ts
const [downloadPromise] = new UtilsApi(config).downloadAsset(assetUrl, {
  responseType: "arraybuffer",
});
const bytes = (await downloadPromise).data;
```

Rules:

- treat result asset URLs as transient,
- download required session-bound assets before closing the session,
- check that the requested output/export exists and has `content`,
- treat missing content as a session-state or permission problem first.

## Session-Bound Asset Rule

Many download links are only valid for the active session lifetime.

Practical implications:

- create the session as late as practical,
- compute before downloading,
- download before closing,
- recreate the session if it is gone.

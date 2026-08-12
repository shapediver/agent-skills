# PHP SDK

Use this reference for PHP code using `GeometryBackendSdkPhp`.

## Install And Imports

The PHP SDK repository currently documents Composer installation via a VCS repository:

```json
{
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/shapediver/GeometryBackendSdkPhp.git"
    }
  ],
  "require": {
    "shapediver/geometry-api-v2": "dev-main#v1.0.0"
  }
}
```

Replace `v1.0.0` with the tag/version required by the project or user. The upstream README
states that the PHP SDK package is not currently uploaded to a public registry, so do not
invent a Packagist-only install path unless the user has one configured.

Then run:

```bash
composer install
```

Base imports:

```php
use ShapeDiver\GeometryApiV2\SdClient;
use ShapeDiver\GeometryApiV2\SdConfig;
use ShapeDiver\GeometryApiV2\Client\Api\SessionApi;
use ShapeDiver\GeometryApiV2\Client\Api\OutputApi;
use ShapeDiver\GeometryApiV2\Client\Api\ExportApi;
use ShapeDiver\GeometryApiV2\Client\Api\FileApi;
```

## Configuration

```php
$client = new SdClient();
$config = (new SdConfig())
    ->setHost($modelViewUrl)
    ->setAccessToken($jwt); // omit when the model does not require JWT authorization
```

Rules:

- Use the model's actual `modelViewUrl`.
- Keep backend tickets/JWTs on the server.
- Use a backend ticket for server-side use.

## Session Pattern

Reuse one session for the related operations in a workflow, then close it when no more SDK
calls need that session. Do not open/close a separate session around each output/export/file
call.

```php
$sessionApi = new SessionApi($client, $config);
$session = $sessionApi->createSessionByTicket($backendTicket);
$sessionId = $session->getSessionId();

try {
    $parameters = $session->getParameters();
    $outputs = $session->getOutputs();
    $exports = $session->getExports();
    // Run related OutputApi, ExportApi, FileApi, and download calls with this session ID here.
} finally {
    $sessionApi->closeSession($sessionId);
}
```

Generated PHP DTOs usually expose getters such as `getSessionId()`. If a project version
differs, inspect `vendor/` types or generated tests before guessing property access.

## Permissions And Response Shape

Some response sections are only returned when the session/ticket or JWT grants the required
permission. Code defensively:

```php
$exports = $session->getExports() ?? [];
if (!isset($exports[$exportId])) {
    throw new \RuntimeException(
        "Export {$exportId} is missing; check metadata and session/JWT permissions."
    );
}
```

Use null checks for settings, statistics, asset blocks, file upload/download data, and other
permission-gated sections. If a required section is absent, surface that the ticket, session,
or JWT may need additional permissions.

## Compute Outputs

```php
$params = [
    $parameterId => $parameterValue,
];

$result = (new OutputApi($client, $config))->computeOutputs($sessionId, $params);
$outputs = $result->getOutputs();
```

If the installed SDK requires generated request model classes instead of arrays, use those
classes and preserve the same payload shape.

## Compute Exports

```php
$request = [
    "parameters" => [
        $parameterId => $parameterValue,
    ],
    "exports" => [$exportId],
    "max_wait_time" => 120000,
];

$result = (new ExportApi($client, $config))->computeExports($sessionId, $request);
```

Do not use object-shaped export selections such as `["id" => $exportId]`; current Geometry
Backend API v2 request bodies use an `exports` array.

## File Parameters

Use `FileApi` to request upload assets, upload bytes to the returned presigned URL, then
send the returned file id as the parameter value.

```php
$upload = (new FileApi($client, $config))->uploadFile($sessionId, [
    $fileParameterId => [
        "filename" => $filename,
        "format" => $mimeType,
        "size" => filesize($path),
    ],
]);

$uploaded = $upload->getAsset()->getFile()[$fileParameterId];
$href = $uploaded->getHref();
$headers = $uploaded->getHeaders();
$fileId = $uploaded->getId();
```

Upload bytes to `$href` with the exact returned headers. Do not add Geometry Backend bearer
auth to the presigned upload URL. Use the returned `$fileId` as the file parameter value in
later output/export requests.

## Download Result Assets

When output/export content contains a full asset URL, download that URL with normal HTTP
tooling. This is still part of the SDK workflow because the SDK produced the content URL.

```php
$data = file_get_contents($assetUrl);
if ($data === false) {
    throw new \RuntimeException("Failed to download ShapeDiver asset.");
}
```

If content contains encrypted asset data instead of a full URL, use the SDK's generated
asset API if present in the installed version, or fetch the OpenAPI spec on demand to verify
the exact generated method.

## Error Handling

Catch generated API exceptions when available. Surface status code and response body.

```php
try {
    $session = $sessionApi->createSessionByTicket($backendTicket);
} catch (\Throwable $e) {
    throw new \RuntimeException("ShapeDiver request failed: " . $e->getMessage(), 0, $e);
}
```

Handle expired JWTs, invalid tickets, validation errors, rate limiting, and
`SdSessionGoneError` explicitly when the generated exception exposes those details.

## PHP Checklist

- Use the PHP SDK instead of handwritten REST for PHP tasks.
- Configure `SdClient` and `SdConfig` with the model's `modelViewUrl`.
- Use camelCase methods: `createSessionByTicket`, `computeOutputs`, `computeExports`,
  `uploadFile`, `closeSession`.
- Reuse a session for related operations, then close it in `finally`.
- Treat response sections as optional when they may be permission-gated.
- Verify exact DTO getter names from `vendor/` if code must be fully runnable.

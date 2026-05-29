# Python SDK

Use this reference for Python code using `geometry-api-v2`.

## Install And Imports

```bash
pip install geometry-api-v2
```

Current package examples use imports from `shapediver.geometry_api_v2`:

```python
from shapediver.geometry_api_v2 import (
    SdClient,
    Configuration,
    SessionApi,
    OutputApi,
    ExportApi,
    FileApi,
)
```

If a project is pinned to an older SDK and these imports fail, inspect the installed package
or tests before guessing; older examples used submodules such as
`shapediver.geometry_api_v2.client` and `shapediver.geometry_api_v2.sd_client`.

## Configuration

```python
client = SdClient(Configuration(model_view_url, access_token=jwt))
```

Rules:

- Use the model's actual `modelViewUrl` as `model_view_url`.
- Omit `access_token` only when the model does not require JWT authorization.
- Keep backend tickets/JWTs on the server.
- Use a backend ticket for server-side use.

## Session Pattern

Reuse one session for the related operations in a workflow, then close it when no more SDK
calls need that session. Do not open/close a separate session around each output/export/file
call.

```python
session_api = SessionApi(client)
session = session_api.create_session_by_ticket(backend_ticket)
session_id = session.session_id

try:
    print(session.parameters, session.outputs, session.exports)
    # Run related OutputApi, ExportApi, FileApi, and download calls with this session_id here.
finally:
    session_api.close_session(session_id)
```

Generated Python DTOs typically expose JSON fields as snake_case attributes, for example
`session_id`. If in doubt, inspect the installed type hints or `to_dict()` output.

## Permissions And Response Shape

Some response sections are only returned when the session/ticket or JWT grants the required
permission. Code defensively:

```python
parameters = getattr(session, "parameters", None) or {}
outputs = getattr(session, "outputs", None) or {}
exports = getattr(session, "exports", None) or {}

if export_id not in exports:
    raise RuntimeError(
        f"Export {export_id} is missing; check metadata and session/JWT permissions."
    )
```

Use `getattr`, `.get()`, or `to_dict()` checks for settings, statistics, asset blocks, file
upload/download data, and other permission-gated sections. If a required section is absent,
surface that the ticket, session, or JWT may need additional permissions.

## Compute Outputs

```python
params = {
    parameter_id: parameter_value,
}

result = OutputApi(client).compute_outputs(session_id, params)
output = result.outputs.get(output_id) if result.outputs else None
content = output.content if output else None
```

If the response contains delayed outputs, use cache/polling helpers if the installed SDK
provides them; otherwise inspect `delay`, wait, and verify the cache method against the
OpenAPI spec on demand.

## Compute Exports

```python
request = {
    "parameters": {
        parameter_id: parameter_value,
    },
    "exports": [export_id],
    "max_wait_time": 120000,
}

result = ExportApi(client).compute_exports(session_id, request)
```

Do not use object-shaped export selections such as `{"id": export_id}`; current Geometry
Backend API v2 request bodies use an `exports` array.

## File Parameters

Use `FileApi` to request upload assets, upload bytes to the returned presigned URL, then
send the returned file id as the parameter value.

```python
import requests

upload = FileApi(client).upload_file(session_id, {
    file_parameter_id: {
        "filename": filename,
        "format": mime_type,
        "size": byte_length,
    }
})

uploaded = upload.asset.file[file_parameter_id]

with open(path, "rb") as f:
    requests.put(uploaded.href, data=f, headers=uploaded.headers)

params = {
    file_parameter_id: uploaded.id,
}
```

Do not add Geometry Backend bearer auth to `uploaded.href`; it is a presigned upload URL.

## Download Result Assets

When output/export content contains a full asset URL, download that URL with normal HTTP
tooling. This is still part of the SDK workflow because the SDK produced the content URL.

```python
import requests

response = requests.get(asset_url, timeout=120)
response.raise_for_status()
data = response.content
```

If content contains encrypted asset data instead of a full URL, use the SDK's generated
asset API if present in the installed version, or fetch the OpenAPI spec on demand to verify
the exact generated method.

## Error Handling

The generated Python SDK raises exceptions from its HTTP stack and generated client. Catch
narrow exceptions if the project already imports them; otherwise surface response status,
body, and message from the exception object.

```python
try:
    session = SessionApi(client).create_session_by_ticket(backend_ticket)
except Exception as exc:
    status = getattr(exc, "status", None)
    body = getattr(exc, "body", None)
    raise RuntimeError(f"ShapeDiver request failed: {status} {body or exc}") from exc
```

Handle expired JWTs, invalid tickets, validation errors, rate limiting, and
`SdSessionGoneError` explicitly when those details are available in the error body.

## Python Checklist

- Use `geometry-api-v2`, not handwritten REST, for Python SDK tasks.
- Use current root imports where available.
- Use snake_case method names: `create_session_by_ticket`, `compute_outputs`,
  `compute_exports`, `upload_file`, `close_session`.
- Reuse a session for related operations, then close it in `finally`.
- Treat response sections as optional when they may be permission-gated.
- Verify exact DTO attributes from type hints or `to_dict()` if code must be fully runnable.

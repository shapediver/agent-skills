---
name: shapediver-headless
description: >
  Use this skill when the user needs server-side or backend-only ShapeDiver
  integration without a 3D viewport — parameter evaluation, automated export
  generation (STL, DXF, 3DM), data extraction from model outputs, price
  calculations, or CI/CD testing. Uses the @shapediver/sdk.geometry-api-sdk-v2
  package (Geometry SDK).
---

# ShapeDiver Geometry SDK — Headless Integration

This file is a **binding specification**. Follow every rule exactly as written.
Do not improvise, infer, or work around any constraint defined here.

## Obtaining Model-Specific Values

### Option A: Retrieve via API (preferred)

If the user provides a **model slug** (the URL identifier from `shapediver.com/app/m/{slug}`)
and **Platform API access keys** (access key ID + secret), you can retrieve `ticket`,
`modelViewUrl`, and full parameter/output/export metadata automatically.

Run the shared script at the repository root (self-contained — auto-installs
dependencies on first run, requires Node.js):

```bash
node ../../scripts/get-model-info.js <slug> <accessKeyId> <accessKeySecret>
```

The script outputs clean JSON to stdout (diagnostics to stderr) with `model`, `parameters`,
`outputs`, and `exports`. Run with `--help` for full usage and exit codes.

It performs a three-step flow:

1. **Authenticate** with the ShapeDiver Platform Backend API (`POST /oauth/token`)
2. **Get model info** by slug (`GET /api/v1/models/{slug}?embed=backend_ticket,backend_system`)
   — returns `backend_ticket` and `backend_system.model_view_url`
3. **Init session** on the Geometry Backend (`POST /api/v2/ticket/{ticket}`)
   — returns all parameters, outputs, and exports with their IDs, types, defaults, etc.
   The session is closed immediately after retrieving the metadata.

Use the returned data to populate `ticket`, `modelViewUrl`, parameter names/IDs, etc. in
generated code.

**Important:** The model must have "backend access" enabled. The script will attempt to
enable it automatically. Access keys are created at
https://www.shapediver.com/app/settings/developers

### Option B: Manual values from the user

If the user provides `ticket` and `modelViewUrl` directly (from the "Developers" tab on
shapediver.com), use those values as-is.

### Placeholders — Never Invent Model-Specific Values

Use ONLY values the user has explicitly provided or that were retrieved via the API script.
If missing, use the placeholder and ask.

| Value             | Placeholder                        |
| ----------------- | ---------------------------------- |
| `ticket`          | `"PASTE_YOUR_TICKET_HERE"`         |
| `modelViewUrl`    | `"PASTE_YOUR_MODEL_VIEW_URL_HERE"` |
| Parameter name/ID | `"PARAM_NAME_OR_ID"`               |
| Output name/ID    | `"OUTPUT_NAME_OR_ID"`              |
| Export name/ID    | `"EXPORT_NAME_OR_ID"`              |

Do NOT filter or group parameters by guessing names. If grouping is needed, ask the user
for exact names/IDs. `param.type` tells you how to render a control, not which group it
belongs to.

---

Use the `@shapediver/sdk.geometry-api-sdk-v2` package for server-side or backend-only use
cases where you don't need a 3D viewport.

## Key Differences from Viewer API

- **No viewport or canvas** — purely computational.
- **No scene tree** — outputs contain raw data/URLs, not renderable geometry.
- **Same credit model** — sessions consume credits. Exports consume additional credits.
- **Same domain whitelisting** — server IP/domain must be allowed if using embedding tickets.
  For backend use, prefer **backend tickets** (generated via the Platform API with your
  API key) instead of embedding tickets.

  ❌ Using an embedding ticket on a server — requires domain whitelisting and exposes the ticket
  ✅ Using a backend ticket generated via the Platform API — scoped to server use, no domain whitelisting needed

## When to Use

- Server-side rendering pipelines
- Automated export generation (STL, 3DM, DXF)
- Data extraction from model outputs
- Price calculations without a visual frontend
- CI/CD integration testing of Grasshopper models

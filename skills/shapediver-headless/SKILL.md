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

**Scope discipline:** Generate only server-side / backend code. Do not add a viewport,
canvas, or any visual UI. Do not suggest the Viewer API unless the user explicitly asks
for a 3D frontend.

---

## Workflow

Follow these steps in order.

### Step 1: Collect Credentials and Model Metadata

Obtain `ticket` (prefer **backend ticket**), `modelViewUrl`, and parameter/output/export
metadata. Use the API script (Option A below) or manual values from the user (Option B).

**Checkpoint:** You have real values for the backend ticket and modelViewUrl, OR you have
inserted placeholders and asked the user. You are using a **backend ticket**, not an
embedding ticket (see "Key Differences" below).

### Step 2: Determine the Use Case

Identify which of these the user needs:

- Customize parameters and read computed outputs
- Generate and download exports (STL, DXF, 3DM)
- Read data outputs (JSON, text)
- Automated pipeline (batch exports, CI/CD)

**Checkpoint:** You know exactly which SDK operations are needed. You are not adding
operations the user didn't request.

### Step 3: Install and Set Up

```bash
npm install @shapediver/sdk.geometry-api-sdk-v2
```

Write the initialization code: `Configuration` with `basePath`, then open a session via
`SessionApi.createSessionByTicket()`.

**Checkpoint:** The `basePath` uses the user's `modelViewUrl`. The ticket is a backend
ticket. Error handling wraps the session creation with `processError`.

### Step 4: Implement the Requested Operations

Use the SDK API classes and code examples from [references/sdk-examples.md](references/sdk-examples.md).

**Checkpoint:** Every SDK call is awaited. The session is closed in a `finally` block.
No model-specific values are invented.

### Step 5: Review and Deliver

**Checkpoint — exit criteria (all must be true):**

- The script is complete and runnable — not a fragment.
- `SessionApi.closeSession()` is called in a `finally` block.
- Backend ticket is used (not embedding ticket).
- Error handling uses `processError` from the SDK.
- No visual UI (canvas, viewport) was added.
- No model-specific values (parameter names, IDs) are invented — only user-provided or
  placeholder values.

---

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

## Key Differences from Viewer API

- **No viewport or canvas** — purely computational.
- **No scene tree** — outputs contain raw data/URLs, not renderable geometry.
- **Same credit model** — sessions consume credits. Exports consume additional credits.
- **Same domain whitelisting** — server IP/domain must be allowed if using embedding tickets.
  For backend use, prefer **backend tickets** (generated via the Platform API with your
  API key) instead of embedding tickets.

  Wrong: Using an embedding ticket on a server — requires domain whitelisting and exposes the ticket
  Correct: Using a backend ticket generated via the Platform API — scoped to server use, no domain whitelisting needed

## When to Use

- Server-side rendering pipelines
- Automated export generation (STL, 3DM, DXF)
- Data extraction from model outputs
- Price calculations without a visual frontend
- CI/CD integration testing of Grasshopper models

---

## SDK API Classes

| Class           | Purpose                                                            |
| :-------------- | :----------------------------------------------------------------- |
| `Configuration` | Holds `basePath` (model view URL) and optional `accessToken` (JWT) |
| `SessionApi`    | Create and close sessions by ticket                                |
| `OutputApi`     | Compute outputs, get cached outputs, list output versions          |
| `ExportApi`     | Compute exports (STL, DXF, 3DM, etc.)                              |
| `UtilsApi`      | Helper: `submitAndWaitForOutput`, `submitAndWaitForExport`         |
| `ModelApi`      | Get model info (requires backend JWT)                              |

For code examples (open session, customize, export, read outputs, error handling, full
pipeline), see [references/sdk-examples.md](references/sdk-examples.md).

---

## Anti-Rationalization Table

| You will think…                                                  | Why it is wrong                                                                                                                               |
| :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| "I'll use an embedding ticket — it's what the user gave me."     | Embedding tickets require domain whitelisting and are designed for browsers. Use a backend ticket for server-side code.                       |
| "I'll add a quick viewport to preview the output."               | This is the headless skill. If the user needs a viewport, they need the Viewer API skill.                                                     |
| "Error handling is boilerplate — I'll add a generic try/catch."  | The SDK has `processError`, `ResponseError`, and `SdGeometryError`. Generic catches hide actionable error details. Use the SDK's error types. |
| "I'll hardcode parameter IDs from the model metadata I can see." | Parameter IDs can change between model versions. Use the API script output or ask the user for current IDs.                                   |

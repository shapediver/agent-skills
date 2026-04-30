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

## Gotchas — Never Invent Model-Specific Values

Use ONLY values the user has explicitly provided. `ticket`, `modelViewUrl`,
parameter IDs, output IDs, and export IDs are all unique to each model. If the user has
not provided them, use placeholders (`"PASTE_YOUR_TICKET_HERE"`, `"PARAM_ID"`, etc.) and
ask. Do NOT guess or invent any of these.

`ticket` and `modelViewUrl` can only be obtained from the "Developers" tab on
shapediver.com. A public model URL does NOT expose these values. If the user shares a URL,
tell them: _"I need the `ticket` and `modelViewUrl` from the Developers tab."_

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

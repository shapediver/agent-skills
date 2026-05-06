# Geometry SDK — Code Examples

## Installation

```bash
npm install @shapediver/sdk.geometry-api-sdk-v2
```

## Open a Session

```ts
import { Configuration, SessionApi } from "@shapediver/sdk.geometry-api-sdk-v2";

const config = new Configuration({
  basePath: "PASTE_YOUR_MODEL_VIEW_URL_HERE", // e.g., "https://sdeuc1.eu-central-1.shapediver.com"
});

const ticket = "PASTE_YOUR_TICKET_HERE";
const res = (await new SessionApi(config).createSessionByTicket(ticket)).data;
const sessionId = res.sessionId;

// Session response contains all parameter definitions, output definitions, and export definitions
console.log("Parameters:", Object.keys(res.parameters));
console.log("Outputs:", Object.keys(res.outputs));
console.log("Exports:", Object.keys(res.exports));
```

## Open a Session with JWT (for models requiring authorization)

```ts
import { Configuration, SessionApi } from "@shapediver/sdk.geometry-api-sdk-v2";

const config = new Configuration({
  basePath: "PASTE_YOUR_MODEL_VIEW_URL_HERE",
  accessToken: "YOUR_JWT_TOKEN", // obtained via Platform API
});

const ticket = "PASTE_YOUR_TICKET_HERE";
const res = (await new SessionApi(config).createSessionByTicket(ticket)).data;
```

## List Parameters and Their Defaults

```ts
// After opening a session:
for (const [paramId, param] of Object.entries(res.parameters)) {
  console.log(`${param.name} (${param.type}): default = ${param.defval}`);
}
```

## Customize Parameters and Compute Outputs

Use `UtilsApi.submitAndWaitForOutput` to set parameter values and wait for the
computation to finish. The request body is a `ReqCustomization` object mapping
parameter IDs to their new values.

```ts
import {
  Configuration,
  SessionApi,
  UtilsApi,
  ReqCustomization,
} from "@shapediver/sdk.geometry-api-sdk-v2";

const config = new Configuration({
  basePath: "PASTE_YOUR_MODEL_VIEW_URL_HERE",
});

const ticket = "PASTE_YOUR_TICKET_HERE";
const resSession = (await new SessionApi(config).createSessionByTicket(ticket))
  .data;
const sessionId = resSession.sessionId;

// Build customization request — parameter IDs as keys, new values as strings
const reqCustomization: ReqCustomization = {
  PARAM_ID_1: "42", // e.g., a slider value
  PARAM_ID_2: "2", // e.g., a StringList index
  PARAM_ID_3: "#ff0000", // e.g., a color
};

// Submit and wait for computation to finish (-1 = wait indefinitely)
const resComp = await new UtilsApi(config).submitAndWaitForOutput(
  sessionId,
  reqCustomization,
  -1,
);

// Access computed outputs
for (const [outputId, output] of Object.entries(resComp.outputs)) {
  console.log(`Output ${outputId}:`, output);
  // output.content contains URLs to geometry/data files
}
```

## Compute Outputs Without Waiting

```ts
import {
  OutputApi,
  ReqCustomization,
} from "@shapediver/sdk.geometry-api-sdk-v2";

const reqCustomization: ReqCustomization = { PARAM_ID: "new_value" };
const resComp = (
  await new OutputApi(config).computeOutputs(sessionId, reqCustomization)
).data;
// resComp.outputs contains the computed results
```

## Get Cached Outputs

```ts
import { OutputApi } from "@shapediver/sdk.geometry-api-sdk-v2";

// Retrieve a previously computed output by its version string
const resCached = (
  await new OutputApi(config).getCachedOutputs(sessionId, {
    [outputId]: versionString,
  })
).data;
```

## Request an Export (STL, DXF, 3DM, etc.)

Exports produce downloadable files. Use `UtilsApi.submitAndWaitForExport` to
request an export and wait for the result.

```ts
import {
  Configuration,
  SessionApi,
  UtilsApi,
  ReqExport,
  ReqCustomization,
} from "@shapediver/sdk.geometry-api-sdk-v2";

const config = new Configuration({
  basePath: "PASTE_YOUR_MODEL_VIEW_URL_HERE",
});

const ticket = "PASTE_YOUR_TICKET_HERE";
const resSession = (await new SessionApi(config).createSessionByTicket(ticket))
  .data;
const sessionId = resSession.sessionId;

// Find the export you want (by name or iterate resSession.exports)
const exportDef = Object.values(resSession.exports).find(
  (e) => e.name === "EXPORT_NAME",
);

// Build parameter values for the export (use defaults if unchanged)
const parameters: ReqCustomization = {};
for (const paramId of exportDef.dependency) {
  const defval = resSession.parameters[paramId].defval;
  if (defval) parameters[paramId] = defval;
}

// Request the export
const reqExport: ReqExport = {
  exports: [exportDef.id],
  parameters,
};

const resExport = await new UtilsApi(config).submitAndWaitForExport(
  sessionId,
  reqExport,
  -1,
);

// Download the export file
const exportResult = resExport.exports[exportDef.id];
console.log("Export download URL:", exportResult.content?.[0]?.href);
```

## Read Data Outputs

Data outputs (JSON, text) are returned as content items with `contentType` and
`data` or `href` fields.

```ts
// After computing outputs:
const dataOutput = resComp.outputs[DATA_OUTPUT_ID];
if (dataOutput.content) {
  for (const item of dataOutput.content) {
    if (item.contentType === "application/json") {
      // item.data contains the JSON string
      const data = JSON.parse(item.data);
      console.log("Data output:", data);
    } else if (item.href) {
      // Download the content from the URL
      const response = await fetch(item.href);
      const content = await response.text();
      console.log("Downloaded content:", content);
    }
  }
}
```

## Close a Session

Always close sessions when done to free server resources and credits.

```ts
await new SessionApi(config).closeSession(sessionId);
```

## Complete Example: Automated Export Pipeline

```ts
import {
  Configuration,
  SessionApi,
  UtilsApi,
  ReqExport,
} from "@shapediver/sdk.geometry-api-sdk-v2";
import * as fs from "fs";
import * as https from "https";

async function generateExport(
  basePath: string,
  ticket: string,
  exportName: string,
  paramOverrides: Record<string, string> = {},
  outputPath: string,
) {
  const config = new Configuration({ basePath });
  const resSession = (
    await new SessionApi(config).createSessionByTicket(ticket)
  ).data;
  const sessionId = resSession.sessionId;

  try {
    // Find the export
    const exportDef = Object.values(resSession.exports).find(
      (e) => e.name === exportName,
    );
    if (!exportDef) throw new Error(`Export "${exportName}" not found`);

    // Build parameters: defaults + overrides
    const parameters: Record<string, string> = {};
    for (const paramId of exportDef.dependency) {
      parameters[paramId] =
        paramOverrides[paramId] ?? resSession.parameters[paramId]?.defval ?? "";
    }

    // Request the export
    const resExport = await new UtilsApi(config).submitAndWaitForExport(
      sessionId,
      { exports: [exportDef.id], parameters },
      -1,
    );

    // Download the file
    const href = resExport.exports[exportDef.id]?.content?.[0]?.href;
    if (href) {
      const file = fs.createWriteStream(outputPath);
      https.get(href, (response) => response.pipe(file));
      console.log(`Export saved to ${outputPath}`);
    }
  } finally {
    await new SessionApi(config).closeSession(sessionId);
  }
}
```

## Error Handling

```ts
import {
  processError,
  SdGeometryError,
  ResponseError,
} from "@shapediver/sdk.geometry-api-sdk-v2";

try {
  // ... SDK calls ...
} catch (err) {
  const e = await processError(err);
  if (e instanceof ResponseError) {
    console.error("API responded with error:", e.status, e.message);
  } else if (e instanceof SdGeometryError) {
    console.error("ShapeDiver error:", e.message);
  } else {
    throw err; // Unknown error
  }
}
```

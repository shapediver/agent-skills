# Session API (`ISessionApi`)

A session represents an instance of a model hosted on a ShapeDiver Geometry Backend.

### Creation & Configuration

```ts
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
});
```

- **`customizeOnParameterChange`** (default: `false`): When `true`, triggers `customize()`
  on every `param.value` change. **⚠️ Do NOT enable this.** Combined with `onInput` handlers,
  every drag movement triggers a server request.

### Customization

- **`session.customize(parameterValues?, force?, waitForViewportUpdate?)`**: Sends parameter
  values to backend. Returns `Promise<ITreeNode>`. Always `await` it.
  - `parameterValues`: optional `{ [paramId]: value }` shorthand.
  - `force`: calls backend even if no parameters changed.
  - `waitForViewportUpdate`: resolves only when geometry is visible.
- **`session.customizeParallel(parameterValues)`**: Runs customization without affecting
  current state. Node must be manually inserted.
- **`session.customizeResult(parameterValues)`**: Returns raw backend response only.
- **`session.cancelCustomization()`**: Cancels in-progress customization.

#### Customize Shorthand

You can pass parameter values directly to `customize()` instead of setting `param.value`
first. Both approaches are valid — the shorthand is simpler when updating known values:

```ts
// Shorthand — pass values directly (by name or ID)
await session.customize({
  Length: 1500,
  "Material Color": "#ff0000",
});

// Equivalent step-by-step approach
session.getParameterByName("Length")[0].value = 1500;
session.getParameterByName("Material Color")[0].value = "#ff0000";
await session.customize();
```

**When to use which:**

- **Shorthand**: Simple value updates where you know parameter names/IDs and don't need
  type conversion or validation.
- **Step-by-step**: When using `toSDValue()` for type-safe conversion, when building
  dynamic UIs from `session.parameters`, or when you need `param.isValid()` checks.

### Parameter & Output Access

Parameters, outputs, and exports can all be looked up by **name** or **ID** — use
whichever the user provides.

- **`session.parameters`**: `{ [id]: IParameterApi }` dictionary (keyed by ID).
- **`session.getParameterByName(name)`**: returns `IParameterApi[]` (multiple can share a name).
- **`session.getParameterById(id)`**: returns `IParameterApi | null`.
- **`session.getParameterByType(type)`**: returns `IParameterApi[]`.
- **`session.exports`**: `{ [id]: IExportApi }` dictionary (keyed by ID).
- **`session.getExportByName(name)`** / **`getExportById(id)`** / **`getExportByType(type)`**: lookup exports.
- **`session.outputs`**: `{ [id]: IOutputApi }` dictionary (keyed by ID).
- **`session.getOutputByName(name)`** / **`getOutputById(id)`** / **`getOutputByFormat(format)`**.
- **`session.parameterValues`**: read-only snapshot of current values.
- **`session.parameterSessionValues`**: snapshot from last successful `customize()`.
- **`session.parameterDefaultValues`**: model defaults.
- **`session.resetParameterValues(force?)`**: resets all to defaults and customizes.

Some models also define **dynamic parameters** in their AppBuilder output — these are
not found in `session.parameters` but in the `"AppBuilder"` output JSON. See
[dynamic-parameters.md](dynamic-parameters.md).

- **`session.updateOutputs()`**: applies pending scene tree changes from `updateOutputContent()`
  calls made with `preventUpdate: true`.
- **`session.close()`**: terminates session and frees resources.

### Session History

- **`session.canGoBack()`** / **`session.canGoForward()`**: check history state.
- **`session.goBack()`** / **`session.goForward()`**: returns `Promise<ITreeNode>`.

### Model States

Model states allow saving and restoring parameter configurations with optional
screenshots, custom data, and AR scenes. Each state gets a unique ID for later retrieval
or sharing (e.g., via URL parameter).

- **`session.createModelState(parameterValues?, omitSessionParameterValues?, image?, data?, arScene?)`**: creates a saved state. Returns `Promise<string>` (state id).
- **`session.getModelState(modelStateId?)`**: retrieves a model state.
- **`session.customizeWithModelState(modelState)`**: applies a saved state's parameter values.
- Model states expire after **6 months of inactivity** (the timer resets each time the state is accessed). Can be applied across models (matched by id/name).
- There is **no Viewer API to list all model states** — the Viewer SDK only supports get/create/apply by ID. To list all states for a model, use the Geometry SDK (`ModelStateApi.listModelStates`) or the Geometry Backend REST API: `GET /api/v2/model-state/model/{modelId}/list`.
- Use `modelStateId` in `createSession` options to apply a state at init time.

```ts
// Save current state with a screenshot
const stateId = await session.createModelState(
  {}, // use current parameter values
  false, // include session values
  () => viewport.getScreenshot(), // screenshot function
  { label: "User Config #1" }, // custom data (any object)
  async () => await viewport.convertToGlTF(), // optional AR scene
);
// stateId can be stored in a database or passed via URL

// Load a saved state at session creation time (avoids a round-trip)
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  modelStateId: "SAVED_STATE_ID",
});

// Apply a saved state to an existing session
await session.customizeWithModelState("SAVED_STATE_ID");
// Or pass the full model state object:
const state = await session.getModelState("SAVED_STATE_ID");
await session.customizeWithModelState(state);
```

### File Uploads & glTF

- **`session.uploadFileParameters(values)`**: uploads files for file parameters.
- **`session.convertToGlTF(convertForAR?)`**: converts session scene to glTF Blob.
- **`session.uploadSDTF(arrayBuffers)`**: uploads sdTF files.
- **`session.loadSdtf`** (default: `false`): load SDTF data.

### JWT & Settings

JWT (JSON Web Token) authorization adds an extra security layer for production models.
When enabled on the platform, all API requests require a valid JWT.

- **`session.jwtToken`**: current JWT token (read-only).
- **`session.setJwtToken(token)`**: set a new JWT token.
- **`session.refreshJwtToken`**: callback `() => Promise<string>` — called automatically
  when the current token expires. Set this to a function that fetches a fresh token
  from your backend.

```ts
// Set initial JWT at session creation
const session = await SDV.createSession({
  id: "session",
  ticket,
  modelViewUrl,
  jwtToken: "INITIAL_JWT_TOKEN",
});

// Auto-refresh when token expires
session.refreshJwtToken = async () => {
  const response = await fetch("/api/shapediver/token");
  const { token } = await response.json();
  return token;
};
```

See [API Authorization docs](https://help.shapediver.com/doc/api-authorization) for
backend token generation and the full security flow.

- **`session.saveSettings(viewportId?)`** / **`session.resetSettings(sections?)`** / **`session.applySettings(response, sections?)`**: viewport settings persistence.
- **`session.saveDefaultParameterValues()`**: saves current values as defaults.
- **`session.saveUiProperties()`**: saves displayname, order, hidden, tooltip.

### Credit Usage

- Each session consumes **at least one credit**. Each credit covers 10 minutes with unlimited
  customizations. Export requests consume additional credits.

### Session Update Callback

- **`session.updateCallback`**: `(newNode?, oldNode?) => void | Promise<void>` — called when
  the session's scene tree node is replaced.

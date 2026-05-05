# Dynamic Parameters — AppBuilder Output Pattern

Some ShapeDiver models define **dynamic parameters** in their AppBuilder output JSON.
These are not real Grasshopper parameters — they are generated dynamically by the model
and change based on the model's current state. Dynamic parameters can be of any type
(Int, Float, String, StringList, Bool, Color, Interaction, etc.).

This is the mechanism the App Builder uses to support parameters whose configuration
updates as the model changes.

---

## How Dynamic Parameters Work

### 1. The AppBuilder Output

The Grasshopper model has an output named `"AppBuilder"` that emits a JSON string.
This JSON contains a `parameters` array defining dynamic parameters.
Each parameter has an `id`, `name`, `type`, and type-specific properties.

```json
{
  "parameters": [
    {
      "id": "shelf_count",
      "name": "Number of Shelves",
      "type": "Int",
      "value": 3,
      "min": 1,
      "max": 10
    },
    {
      "id": "shelf_color",
      "name": "Shelf Color",
      "type": "Color",
      "value": "0x0000ffff"
    },
    {
      "id": "material_choice",
      "name": "Material",
      "type": "StringList",
      "choices": ["Wood", "Metal", "Glass"],
      "value": "Wood"
    },
    {
      "id": "dragging_parameter",
      "name": "Dragging",
      "type": "Interaction",
      "settings": {
        "type": "dragging",
        "props": {
          "hover": true,
          "objects": [
            {
              "nameFilter": "topShelf.topShelf_0",
              "restrictions": ["plane-1"],
              "dragAnchors": [{ "id": "dragAnchor_a", "position": [0, 0.2, 0] }]
            }
          ],
          "restrictions": [
            {
              "id": "plane-1",
              "type": "plane",
              "origin": [0, 0, 0],
              "vector_u": [1, 0, 0],
              "vector_v": [0, 1, 0]
            }
          ]
        }
      }
    }
  ]
}
```

### 2. Reading the AppBuilder Output

```ts
function getAppBuilderData() {
  const abOutput = session.getOutputByName("AppBuilder")[0];
  const raw = abOutput?.content?.[0]?.data;
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}
```

### 3. Finding Dynamic Parameters by Type

Dynamic parameters have a `type` field that identifies the parameter type.
For interaction-type parameters, `settings.type` further identifies the interaction kind.

#### Parameter Types

| `type`          | Description             | Value Location                          |
| :-------------- | :---------------------- | :-------------------------------------- |
| `"Int"`         | Integer slider          | `param.value`, `param.min`, `param.max` |
| `"Float"`       | Float slider            | `param.value`, `param.min`, `param.max` |
| `"String"`      | Text input              | `param.value`                           |
| `"StringList"`  | Dropdown                | `param.value`, `param.choices`          |
| `"Bool"`        | Checkbox / toggle       | `param.value`                           |
| `"Color"`       | Color picker            | `param.value`                           |
| `"Interaction"` | Interaction (see below) | `param.settings`                        |

#### Interaction Subtypes (when `type` is `"Interaction"`)

| `settings.type`        | Interaction Type   | Reference                                              |
| :--------------------- | :----------------- | :----------------------------------------------------- |
| `"dragging"`           | Drag objects       | [interactions-dragging.md](interactions-dragging.md)   |
| `"selection"`          | Select objects     | [interactions-selection.md](interactions-selection.md) |
| `"gumballTransform"`   | Gumball 3D gizmo   | [gumball-transform.md](gumball-transform.md)           |
| `"rectangleTransform"` | Rectangle 2D gizmo | [rectangle-transform.md](rectangle-transform.md)       |

```ts
const abData = getAppBuilderData();
if (abData?.parameters) {
  for (const param of abData.parameters) {
    // param.id    — unique identifier
    // param.name  — display name
    // param.type  — parameter type
    // param.value — current value (for non-interaction types)
    handleDynamicParam(param);
  }
}
```

### 4. Dynamic Updates

The AppBuilder output **regenerates** on every `customize()` call. When model parameters
change, the output JSON is updated with new dynamic parameter definitions. You must:

1. **Re-read the AppBuilder output** after each output update
2. **Re-process dynamic parameters** with the updated definitions
3. **Debounce** to avoid processing intermediate states

```ts
import { addListener, EVENTTYPE_OUTPUT } from "@shapediver/viewer";

let updateTimer = null;
addListener(EVENTTYPE_OUTPUT.OUTPUT_UPDATED, () => {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    const abData = getAppBuilderData();
    processDynamicParams(abData?.parameters);
  }, 150);
});
```

---

## Sending Values Back to the Model

Dynamic parameter values are sent back to the model through a real Grasshopper
parameter named `"AppBuilder"` (type: STRING or FILE). The value is a JSON string
containing **all** dynamic parameter values keyed by their IDs.

### Format

The JSON sent to the `AppBuilder` parameter maps each dynamic parameter ID to its
value as a **string**:

```json
{
  "shelf_count": "5",
  "shelf_color": "0xff0000ff",
  "material_choice": "Metal"
}
```

### Value Formats

| `type`         | Value Format (as string)                      |
| :------------- | :-------------------------------------------- |
| `"Int"`        | Integer as string, e.g. `"5"`                 |
| `"Float"`      | Float as string, e.g. `"3.14"`                |
| `"String"`     | The string value directly                     |
| `"StringList"` | The selected choice as string, e.g. `"Metal"` |
| `"Bool"`       | `"true"` or `"false"`                         |
| `"Color"`      | Color as hex string, e.g. `"0xff0000ff"`      |

For Interaction-type dynamic parameters, the value is a **stringified JSON** object.
See the respective interaction reference files for value format details.
The interaction settings are accessed via `param.settings?.props ?? param.settings`,
and `param.settings.type` identifies the interaction kind (e.g. `"dragging"`,
`"selection"`, `"gumballTransform"`, `"rectangleTransform"`).

For Drawing-type dynamic parameters, the value is also a **stringified JSON** object.
See [drawing-tools-reference.md](drawing-tools-reference.md) for the settings structure
and value format.

### Implementation

```ts
// Find the real AppBuilder input parameter
const appBuilderParam = Object.values(session.parameters).find(
  (p) => p.name === "AppBuilder" && p.type === "String",
);
if (!appBuilderParam) return;

// Build the value object with all dynamic parameter values
const customValues = {};
customValues["shelf_count"] = String(5);
customValues["shelf_color"] = "0xff0000ff";
customValues["material_choice"] = "Metal";

// Set and customize
appBuilderParam.value = JSON.stringify(customValues);
await session.customize();
```

---

## Dynamic vs Real Parameters

| Aspect               | Real Parameter                                 | Dynamic Parameter                               |
| :------------------- | :--------------------------------------------- | :---------------------------------------------- |
| Source               | `session.parameters`                           | `AppBuilder` output JSON `.parameters[]`        |
| Value write          | `param.value = ...; await session.customize()` | Write to `AppBuilder` STRING param as JSON      |
| Updates on customize | No — definition is static                      | Yes — output JSON regenerates with new settings |
| Use case             | Static config set in Grasshopper               | Dynamic config that depends on model state      |

### When to Use Each

- **Real parameters:** The model author configured static parameters in Grasshopper.
- **Dynamic parameters:** The model dynamically generates parameters based on its current
  state (e.g., a kitchen configurator where available options change as the user makes
  selections). Found in the AppBuilder output.

---

## Complete CDN Example

```html
<script
  src="https://viewer.shapediver.com/v3/latest/bundle.js"
  crossorigin="anonymous"
></script>
<script>
  (async () => {
    const viewport = await SDV.createViewport({
      id: "vp",
      canvas: document.getElementById("sd-canvas"),
    });
    const session = await SDV.createSession({
      id: "session",
      ticket: TICKET,
      modelViewUrl: URL,
    });

    // Find AppBuilder STRING parameter for sending values back
    const appBuilderParam = Object.values(session.parameters).find(
      (p) => p.name === "AppBuilder" && p.type === "String",
    );

    // Read dynamic parameters from AppBuilder output
    function getAppBuilderData() {
      const out = session.getOutputByName("AppBuilder")[0];
      const raw = out?.content?.[0]?.data;
      if (!raw) return null;
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    }

    // Process dynamic parameters
    const abData = getAppBuilderData();
    if (abData?.parameters) {
      for (const param of abData.parameters) {
        console.log(
          `Dynamic param: ${param.name} (${param.type}) = ${param.value}`,
        );
      }
    }

    // Send dynamic parameter values back
    async function commitToAppBuilder(values) {
      if (!appBuilderParam) return;
      appBuilderParam.value = JSON.stringify(values);
      await session.customize();
    }

    // Example: update a dynamic parameter value
    await commitToAppBuilder({ shelf_count: "5", material_choice: "Metal" });
  })();
</script>
```

---

## Gotchas

- **Dynamic parameter definitions update on every `customize()` call.** The AppBuilder
  output is regenerated, so available parameters, their ranges, and choices may change.
  Always re-read after output updates.
- **All values are strings.** The `AppBuilder` parameter value is a JSON object mapping
  parameter IDs to string values. Convert numbers and booleans to strings.
- **Debounce output update handlers.** A single `customize()` fires multiple
  `OUTPUT_UPDATED` events. Without debouncing (~150ms), you process stale intermediate
  states.
- **Dynamic parameter IDs are model-defined.** They come from the AppBuilder output JSON
  and may change between model versions. Don't hardcode them.
- **The `AppBuilder` input parameter has a max length.** If the JSON exceeds it, the App
  Builder falls back to sending via a FILE parameter (type `application/json`). For Viewer
  API usage, check `appBuilderParam.max` and handle overflow.

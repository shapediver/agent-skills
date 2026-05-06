# Parameter Value Formatting & `toSDValue()`

Ready-to-use formatting rules and the complete `toSDValue()` conversion function for all
parameter types.

For dynamic parameters (defined in the AppBuilder output, not in `session.parameters`),
see [dynamic-parameters.md](dynamic-parameters.md).

---

## Parameter Value Formatting

### Bool

```ts
param.value = true; // JS boolean
param.value = "true"; // string — both work
```

### Int / Float / Even / Odd

```ts
// Int
param.value = String(parseInt(rawValue, 10));

// Float — use decimalplaces if defined
const dp = param.decimalplaces != null ? param.decimalplaces : undefined;
param.value =
  dp != null ? parseFloat(rawValue).toFixed(dp) : String(parseFloat(rawValue));
```

### StringList

Value is the **numeric index** as a string (not the label). For `CHECKLIST` visualization,
comma-separated indices: `"0,2"`.

```ts
param.value = String(selectedIndex); // e.g. "2"
```

Option elements must use index as value:

```html
<option value="0">Red</option>
<option value="1">Green</option>
```

### Color

Native format is `0xRRGGBBAA` (10 chars). Browser `<input type="color">` only accepts `#RRGGBB`.

```ts
function nativeToPickerColor(v: string): string {
  if (v && (v.startsWith("0x") || v.startsWith("0X")))
    return "#" + v.slice(2, 8).toLowerCase(); // RRGGBB — NOT slice(-6)
  return v || "#ffffff";
}
param.value = e.target.value; // "#rrggbb" passes validation
```

### String

Pass directly. If `defval` suggests structured data (JSON, semicolons, etc.), **ask the user
for the expected format** before generating code.

### File

Pass `File`, `Blob`, or URL string. Uploaded automatically on `customize()`.
For file parameters, use `param.format` to check accepted MIME types (e.g., `["image/png", "image/jpeg"]`).

### Complete `toSDValue()` Reference

```ts
function toSDValue(param: any, rawValue: any): any {
  switch (param.type) {
    case "Bool":
      return typeof rawValue === "boolean" ? rawValue : rawValue === "true";
    case "Int":
    case "Even":
    case "Odd":
      return String(parseInt(rawValue, 10));
    case "Float": {
      const dp = param.decimalplaces != null ? param.decimalplaces : undefined;
      return dp != null
        ? parseFloat(rawValue).toFixed(dp)
        : String(parseFloat(rawValue));
    }
    case "StringList":
      return String(parseInt(rawValue, 10));
    case "Color":
      return String(rawValue);
    default:
      return String(rawValue);
  }
}
```

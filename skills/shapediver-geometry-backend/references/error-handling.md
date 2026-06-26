# Geometry Backend Error Handling

Read this reference when the answer needs SDK-specific failure handling rather than just a
happy path.

## Canonical TypeScript Pattern

```ts
try {
  // SDK calls
} catch (err) {
  const shapediverError = await Promise.resolve(processError(err as Error));

  if (shapediverError instanceof ResponseError) {
    console.error(
      shapediverError.status,
      shapediverError.type,
      shapediverError.message,
      shapediverError.description,
    );
  } else {
    console.error(shapediverError);
  }
}
```

## What To Surface

When available, surface:

- HTTP status
- ShapeDiver error `type`
- message
- description

Do not collapse everything into a generic message.

## Common Failure Classes

- Invalid or wrong-model ticket.
- Missing or expired JWT.
- Missing scope for a permission-gated field or operation.
- `SdSessionGoneError` after session timeout or explicit closure.
- Validation errors from a bad request shape.
- Delayed output/export states that need polling rather than immediate failure.

## Recovery Rules

- If the session is gone, create a new session and retry the workflow.
- If the JWT is expired or missing scope, return to PB for a fresh or broader token.
- If `outputs`, `exports`, upload assets, or `content` are missing, treat that as a
  metadata or permission issue before assuming the SDK is wrong.
- Use SDK polling helpers when the workflow should wait for delayed output/export results.

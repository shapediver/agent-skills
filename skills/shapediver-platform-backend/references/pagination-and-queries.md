# Platform Backend Pagination And Queries

Read this reference when the answer needs query loops, embeds, filters, sorting, or
response-shape handling.

## Wrapped Response Pattern

Read SDK results from:

- `getResponse.data`
- `queryResponse.data.result`
- `queryResponse.data.pagination.next_offset`

Treat `next_offset` as an opaque cursor.

## Canonical Query Pattern

```ts
const response = await client.models.query({
  filters: {
    "deleted_at[?]": null,
    "status[,]": ["done"],
  },
  sorters: {
    created_at: SdPlatformSortingOrder.Desc,
  },
  limit: 20,
  strict_limit: true,
  offset: null,
  embed: [SdPlatformModelQueryEmbeddableFields.BackendSystem],
});

for (const model of response.data.result) {
  console.log(model.id, model.title);
}
```

## Pagination Loop Pattern

```ts
let offset: string | null = null;

do {
  const page = await client.models.query({
    limit: 50,
    offset,
  });

  for (const model of page.data.result) {
    console.log(model.id);
  }

  offset = page.data.pagination?.next_offset ?? null;
} while (offset);
```

Rules:

- keep the returned `next_offset` unchanged,
- do not guess numeric page numbers,
- use resource-specific embed enums when available,
- do not assume embeds are present unless you requested them.

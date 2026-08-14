# Credentials gate — mandatory before any JSON

This file is **not optional**. If you are about to create or change App Builder settings JSON, read this **before** doc-flat, examples, or `themeOverrides`.

## The only allowed first response when credentials are missing

If the user did **not** include **slug** OR (**ticket** AND **modelViewUrl**) in their message, and the **target file** (the file you will create or edit — e.g. `public/my-store.json`) does not already contain real `sessions`:

**Your entire reply must be the credential question. Nothing else.**

### ⛔ Another file's `sessions` does NOT count

Finding `sessions` in a **different** `public/*.json` (e.g. `example-ecommerce-2.json`, `SS-9602.json`, `blank.json`) **does not** satisfy Step 0. **Do not** say:

- "Credentials already exist in `example-ecommerce-2.json`"
- "Учётные данные уже есть в …"
- "I'll reuse sessions from …"

Then continue with doc-flat / stack / theme work — that is a **Step 0 violation**.

| Check | Passes Step 0? |
| :---- | :------------- |
| User pasted slug or ticket + modelViewUrl in **this** message | Yes |
| **Target** file already has real `sessions` | Yes |
| Some **other** fixture has `sessions` | **No** — ask the user |
| User said "copy sessions from `other.json`" | Yes — after explicit instruction only |

**Target file** = the path the user asked you to create or edit. If the user did not name a file yet, there is no target with sessions → **ask**.

### Forbidden in that reply (violations)

- Any JSON (`{ "version": "1.0"`, `themeOverrides`, `sessions` with placeholders)
- Code blocks containing settings structure
- `public/foo.json` paths or file writes
- `npm run start`, preview URLs, `?g=`
- Reading `doc-flat.json`, `examples.md`, or **any** `public/*.json` for theme/stack/layout drafting
- Grep/search for stack widget, `themeOverrides`, or `appBuilderOverride` patterns
- Announcing that credentials exist in **another** JSON file (e.g. `example-ecommerce-2.json`)
- "Here's what the file will look like" with JSON preview
- Partial drafts "without sessions for now"

### Required content

Ask for **one** of:

1. **slug** — model name from shapediver.com URL  
2. **ticket** + **modelViewUrl** — model **Edit → Developers** tab  

Then **stop and wait** for the user.

## Credentials source — user only

`slug`, `ticket`, and `modelViewUrl` in `sessions` must come **only** from the **user in this conversation** (their current message or an explicit follow-up). **Ask** — do not infer.

### Forbidden sources (never copy or reuse)

| Source | Why forbidden |
| :----- | :------------ |
| Other `public/*.json` in the repo (`example-ecommerce-2.json`, `blank.json`, `SS-*.json`, `example-sessions-*.json`) | Fixture credentials are not the user's model — **even if that file has valid `sessions`** |
| `examples.md`, eval prompts, or skill text | Illustrations only — not real credentials |
| Prior chat / another task / Jira ticket description | Unless the user **re-pastes** them in **this** message |
| Guessing from model name, product, or URL pattern | Invented values break preview |
| `shapediver-router` or other skills' example tickets | Not authorized for this file |
| "Typical" `modelViewUrl` hosts (`sdr7euc1…`, `sdr7us…`) without user paste | Region/backend is per-model — ask |

### Forbidden values

- Placeholders: `my-model-slug`, `PASTE_TICKET_HERE`, `abc123ticket`, `your-ticket-here`
- Partial option B: `ticket` without `modelViewUrl` (or the reverse) — **ask for both**
- Reusing credentials from file A when creating file B unless the user says to copy them

### Allowed exceptions

| Situation | Skip ask? |
| :-------- | :-------- |
| User message contains real slug | Yes |
| User message contains ticket **and** modelViewUrl | Yes |
| You read the **target** `public/*.json` and it already has real `sessions` **for that file** | Yes — keep existing values; do not swap in credentials from another JSON |
| User only reports a validation error on keys under `themeOverrides` / `appBuilderOverride` and `sessions` is already valid | Yes |
| User says "use the same sessions as `other.json`" | Yes — copy **only** from that named file after user instruction |

### Wrong vs right (first turn)

**User:** "Create a red brand settings JSON, no layout changes."

**WRONG** — agent outputs JSON or theme advice first.

**RIGHT** — agent reply is only:

> I need your model reference for the required `sessions` block before I can create the settings file.
>
> Please send **one** of:
> - **Slug** (from your shapediver.com model URL), or  
> - **Ticket + modelViewUrl** (from the model **Edit → Developers** tab)
>
> Then I'll build the minimal red-brand `themeOverrides` you asked for.

**User:** "Create `public/my-store.json` with stack widget like in example-ecommerce-2."

**WRONG** — "Учётные данные уже есть в example-ecommerce-2.json. Ищу в проекте свойства темы и конфигурацию stack widget."

**RIGHT** — credential question only (same as above). After the user sends slug or ticket + modelViewUrl, **then** read `example-ecommerce-2.json` for stack **layout** — copy **only** `themeOverrides` / `appBuilderOverride` structure, **never** its `sessions`.

---
name: shapediver-appbuilder-iframe
description: >
  Use this skill when the user wants to embed a ShapeDiver App Builder
  configurator on their website using an iframe — the fastest path with zero
  code. Covers the iframe HTML snippet, prerequisite domain setup, and iframe
  settings. Activate when the user mentions embedding, iframe, putting a
  ShapeDiver model on a webpage, or wants the simplest integration without
  writing JavaScript.
---

# ShapeDiver App Builder — Iframe Embedding

Follow every rule in this file exactly. Do not improvise or work around any constraint.

**Scope discipline:** Deliver only the iframe snippet and prerequisite instructions. Do not
add JavaScript, custom styling beyond width/height, or suggest alternative strategies
unless the user's requirements cannot be met by an iframe.

---

## Workflow

Follow these steps in order.

### Step 1: Confirm Prerequisites with the User

Both prerequisites must be completed before the iframe will work. Walk the user through
each one.

1. **Embedding domains:** At least one domain must be listed in the "Global domains"
   for the account. Go to the [Settings page](https://www.shapediver.com/app/settings/domains) on
   shapediver.com to manage embedding domains.
   [Read more about embedding domains.](https://help.shapediver.com/doc/setup-domains-for-embedding)
   If the user provided an API token pair that grants read access on the user, you can check
   the existing domain settings programmatically via the Platform API.

2. **Allow iframe embedding for the model:** In the model's "Edit" page, find the "Iframe"
   section and check "Allow iframe embedding". Save changes.
   [Read more about iframe settings.](https://help.shapediver.com/doc/iframe-settings)
   If API tokens are available, you can check this setting using a script via the Platform API.

**Checkpoint:** The user has confirmed (or you have verified via API) that both domain
whitelisting and iframe embedding are enabled. Do not proceed without this — the iframe
will show a blank page or error.

### Step 2: Build the Iframe Snippet

Generate the iframe tag with the user's slug or ticket + modelViewUrl.

```html
<iframe
  width="100%"
  height="480"
  src="https://appbuilder.shapediver.com/v1/main/latest/?slug=YOUR_SLUG"
  referrerpolicy="origin"
  allowfullscreen
  allow="clipboard-write"
  style="overflow: hidden; border-width: 0;"
>
  <p>Your browser does not support iframes.</p>
</iframe>
```

Replace `YOUR_SLUG` with the model slug (e.g. `my-model-name`).

**Finding your slug:** Go to your model on shapediver.com. The slug is the URL identifier
shown in the model's URL.

**Alternative:** Instead of `slug`, you can use `ticket` and `modelViewUrl` URL parameters
to reference the model (requires "Allow direct embedding" in the Developers section).

**Checkpoint:** The snippet contains the user's actual slug (or ticket + modelViewUrl) — not
a placeholder, unless the user hasn't provided it yet (in which case ask).

### Step 3: Add URL Parameters (if requested)

Only if the user needs initial parameter values, a theme, model state, or other options.
Append these to the iframe `src` URL as query string parameters:

| Parameter                 | Description                                                                                |
| :------------------------ | :----------------------------------------------------------------------------------------- |
| `slug`                    | The model's URL identifier (simplest method).                                              |
| `ticket` + `modelViewUrl` | Alternative to slug; requires direct embedding enabled.                                    |
| `g`                       | URL to a theme JSON file for customizing appearance and behavior.                          |
| `modelStateId`            | ID of a model state to load initially.                                                     |
| `context`                 | Contextual info passed to the Grasshopper model (e.g., `cart`, `order`).                   |
| `_{PARAM_NAME}`           | Set initial parameter values by prefixing the parameter name with `_` (e.g., `_Width=10`). |
| `trackingDomain`          | Domain for web analytics tracking via plausible.io.                                        |

**Checkpoint:** All user-requested parameters are included in the URL. No parameters were
added that the user didn't ask for.

### Step 4: Deliver

Hand the user the complete, ready-to-paste HTML snippet.

**Checkpoint — exit criteria (all must be true):**

- Prerequisites (domain + iframe setting) have been confirmed or flagged.
- The snippet is complete HTML — not a fragment requiring surrounding code.
- `referrerpolicy="origin"` is present.
- The slug or ticket values are the user's actual values, not placeholders (unless still
  needed, in which case they are clearly marked).

---

## Anti-Rationalization Table

| You will think…                                                                    | Why it is wrong                                                                                                                    |
| :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| "I'll give them the iframe tag first and mention domain setup later."              | Without domain whitelisting, the iframe loads blank. Prerequisites must be confirmed before the snippet is useful.                 |
| "The `referrerpolicy` attribute is optional — most browsers don't need it."        | Some browsers silently block the iframe without it. Always include `referrerpolicy="origin"`.                                      |
| "I'll wrap the iframe in a JavaScript loader for better UX."                       | The user asked for an iframe embed — zero code. Adding JavaScript violates scope discipline and creates maintenance burden.        |
| "I'll use the ticket + modelViewUrl instead of the slug since it's more flexible." | Slug is simpler and doesn't expose credentials. Only use ticket + modelViewUrl if the user explicitly asks or doesn't have a slug. |

---

## App Builder Versioning

The URL `https://appbuilder.shapediver.com/v1/main/latest/` always uses the latest release.
To lock to a specific version, replace `latest` with the version number
(e.g., `https://appbuilder.shapediver.com/v1/main/1.0.12/`). Check the browser console for
the current version (`ShapeDiver App Builder SDK vX.Y.Z`).

---

## Gotchas

- **Domain setup is required BEFORE the iframe will work.** Without adding your domain to
  the account's "Global domains" list, the iframe will load blank or show an error.
- **Allow iframe embedding must be checked** on the model's Edit page. This is a separate
  setting from domain whitelisting.
- The `referrerpolicy="origin"` attribute is required — without it, the iframe may fail to
  load on some browsers.
- The `allow="clipboard-write"` attribute is needed for App Builder's copy-to-clipboard
  features. Without it, clipboard operations will silently fail in some browsers.
- The slug is NOT the ticket or modelViewUrl. It's the URL identifier from shapediver.com.
  However, `ticket` + `modelViewUrl` can also be used as URL parameters if direct embedding
  is enabled.

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

Embedding via iframe is the fastest way to get a ShapeDiver configurator on your website —
no ticket, no API code, no setup beyond domain whitelisting.

---

## Prerequisites

1. **Set up embedding domains:** At least one domain must be listed in the "Global domains"
   for the account. Go to the [Settings page](https://www.shapediver.com/app/settings/domains) on
   shapediver.com to manage embedding domains.
   [Read more about embedding domains.](https://help.shapediver.com/doc/setup-domains-for-embedding)
   If the user provided an API token pair that grants read access on the user, you can check
   the existing domain settings programmatically via the Platform API.

2. **Allow iframe embedding for the model:** In the model's "Edit" page, find the "Iframe"
   section and check "Allow iframe embedding". Save changes.
   [Read more about iframe settings.](https://help.shapediver.com/doc/iframe-settings)
   If API tokens are available, you can check this setting using a script via the Platform API.

---

## Iframe Embed

```html
<iframe
  src="https://appbuilder.shapediver.com/v1/main/latest/?slug=YOUR_SLUG"
  width="100%"
  height="600"
  referrerpolicy="origin"
  allowfullscreen
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

You can customize the width and height of the iframe as needed.

---

## URL Parameters

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
- The slug is NOT the ticket or modelViewUrl. It's the URL identifier from shapediver.com.
  However, `ticket` + `modelViewUrl` can also be used as URL parameters if direct embedding
  is enabled.

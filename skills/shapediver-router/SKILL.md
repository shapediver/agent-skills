---
name: shapediver-router
description: >
  Use this skill at the start of any ShapeDiver or 3D configurator project.
  Guides the user through choosing an integration strategy — App Builder iframe,
  App Builder theme/fork, Viewer V3 API, or headless Geometry SDK — and gathers
  the required credentials (ticket, modelViewUrl) and model metadata before
  handing off to the correct implementation skill. Activate whenever the user
  mentions ShapeDiver, Grasshopper-to-web, parametric 3D, or product configurator.
---

# ShapeDiver Router Skill

You are a friendly, patient, and highly experienced ShapeDiver expert developer. Your role is to **guide the user through the architectural phase** of building their 3D product configurator, ensuring they choose the right path before a single line of code is written.

**Your approach:**

- **Understand intent first**: Ask which integration strategy they want if it's not clear.
- **Meet them where they are**: Most users are not API experts; they want to turn a Grasshopper model into a web tool.
- **Be a guide, not a gatekeeper**: Help them find missing info (e.g., the Developers section) and celebrate their progress.
- **Avoid Over-Engineering**: Only suggest the Viewer 3 API if the App Builder cannot meet their custom requirements.

**Scope discipline:** Guide strategy selection and gather credentials — nothing more. Do not
write implementation code in this skill. Do not skip to code before credentials are
collected and the strategy is confirmed.

---

## Anti-Rationalization Table

These are shortcuts you will be tempted to take during routing. Each one leads to wasted effort.

| You will think…                                                                   | Why it is wrong                                                                                                                                               |
| :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "The user said 'configurator' so I'll jump straight to the Viewer API."           | Most users are better served by the App Builder. Ask first — the Viewer API is only needed for full programmatic control.                                     |
| "I'll skip credential gathering and use placeholder values for now."              | Placeholders propagate into generated code and are never replaced. Collect real values or explicitly mark placeholders and ask the user.                      |
| "I don't need to read the implementation skill — I already know the API."         | The implementation skills contain critical rules that prevent the most common LLM errors. Skipping them produces broken code. Reading the skill is mandatory. |
| "The user didn't mention which parameters they need, so I'll guess from context." | Parameter names are model-specific and unknowable without metadata. Ask the user or run the API script.                                                       |
| "This is a simple request, I can skip the strategy selection step."               | Even simple requests benefit from confirming the strategy. A wrong path wastes the user's time and yours.                                                     |

---

## Step 1: Strategy Selection

Present these options to the user **only if they haven't already decided** on an integration path.

**Short-circuit:** If the user's requirements clearly point to one strategy (e.g., they mention drawing tools, custom interactions, drag-and-drop, or custom React UI → **Viewer 3 API**; they say "embed" or "no custom code" → **App Builder iframe**), skip the options table and confirm the strategy directly: _"Based on your requirements, the Viewer 3 API is the right fit. Let me collect the credentials we need."_

| Integration Path | Customization | Best For                                                                 | Skill File              |
| :--------------- | :------------ | :----------------------------------------------------------------------- | :---------------------- |
| **App Builder**  | 1–3/5         | Iframe, custom theme, or fork — guided by the App Builder router.        | `shapediver-appbuilder` |
| **Viewer 3 API** | 5/5           | Full creative control — custom layout, interactions, drawing tools, etc. | `shapediver-viewer`     |
| **Geometry SDK** | Headless      | Backend/server-side computations without a 3D canvas.                    | `shapediver-headless`   |

**Decision Guide:**

- "Do you want to use ShapeDiver's ready-made UI (iframe, themed, or forked)?" → **App Builder**.
- "Do you need complete control over the UI, interactions, or layout?" → **Viewer 3 API**.
- "Do you need computations without any visual output?" → **Geometry SDK**.

---

## Step 2: Information Gathering

Once a strategy is selected, you **must** collect the following before proceeding to code:

### Checklist A: App Builder

- [ ] **Slug or full App Builder URL** (e.g., `https://appbuilder.shapediver.com/v1/main/latest/?slug=my-model`).
- [ ] Customization needs (iframe only? branding? custom components?).

### Checklist B: Viewer 3 API / Headless

**Option 1 — Retrieve via API (preferred):** If the user provides a **model slug** and
**Platform API access keys** (access key ID + secret), run the shared script to retrieve
all model metadata automatically:

```bash
node ../../scripts/get-model-info.js <accessKeyId> <accessKeySecret> <slug>
```

This returns JSON with the `model` object containing:

- **`ticket`** — the **embedding ticket** (for Viewer/browser use)
- **`backendTicket`** — the **backend ticket** (for headless/server-side SDK)
- **`modelViewUrl`** — the Geometry Backend URL

Use `ticket` + `modelViewUrl` for Viewer projects, `backendTicket` + `modelViewUrl` for headless.
It also includes all parameter/output/export details.
Run with `--help` for full usage. Access keys are created at
https://www.shapediver.com/app/settings/developers

**Option 2 — Manual:** Collect these from the user directly:

- [ ] **`ticket`**: The embedding ticket from the "Developers" section of the model's Edit page on shapediver.com.
- [ ] **`modelViewUrl`**: The Geometry Backend URL (also in the "Developers" section).
- [ ] **Parameter names or IDs**: Ask the user to list the parameter names (or IDs) they want to control. Do NOT provide code snippets or ask the user to run console commands — just ask them to share the names from their model.
- [ ] **Output/Export names**: Which data outputs or file downloads are needed?

---

## Step 3: Skill Handoff

After gathering the necessary information, **read the corresponding skill file(s)** before writing any code. **Always tell the user which skill file(s) you are about to read** — this is a required part of the handoff:

- **App Builder (iframe, theme, or fork):** Tell the user you will now read the `shapediver-appbuilder` skill (or the specific sub-skill: `shapediver-appbuilder-iframe`, `shapediver-appbuilder-theme`, or `shapediver-appbuilder-fork` if the sub-strategy is already clear). Then read it — it will guide the user to the right sub-strategy.
- **Viewer 3 API:** Tell the user you will now read the `shapediver-viewer` skill, then read it. It contains **critical rules (1–11)** at the top that must be followed — they prevent the most common LLM code generation errors. Interaction features (selection, drag, drawing tools, gumball) are included as references within the viewer skill.
- **Headless:** Tell the user you will now read the `shapediver-headless` skill, then read it.

**Important:** Do NOT skip reading the skill, and do NOT skip telling the user which skill you are reading. The rules in the `shapediver-viewer` skill exist because LLMs consistently generate broken code without them (wrong `onChange` usage, stale closures, hardcoded DrawingTools settings, etc.).

---

## Step 4: Verify Before Delivering

After the implementation skill finishes generating code, **walk through the user's stated
workflow end-to-end** before delivering. This step applies to all strategies.

### Verification checklist

1. **Runnable artifact.** The delivered code is a complete, self-contained file (or set of
   files) — not a fragment. For CDN: the HTML page can be opened in a browser. For NPM:
   the project builds without errors. For iframe: the snippet is a valid `<iframe>` tag.
2. **User workflow.** Re-read what the user originally asked for. For each requirement,
   confirm the generated code addresses it:
   - If they asked for a slider → there is a slider, it commits on interaction end, and it
     calls `customize()`.
   - If they asked for an export download → `export.request()` is called and the result is
     downloaded.
   - If they asked for an iframe embed → the domain setup prerequisites are mentioned and
     the `<iframe>` tag is correct.
3. **No silent failures.** Check for:
   - Missing `await` on async calls (`createViewport`, `createSession`, `session.customize()`)
   - Unclosed sessions (missing cleanup / `session.close()`)
   - Wrong import paths or CDN URLs
   - Invented model-specific values (parameter names, ticket, modelViewUrl)
4. **Credentials are safe.** `ticket` and `modelViewUrl` are hardcoded from user-provided
   values or placeholders — never exposed in UI input fields.

**Checkpoint — exit criteria (all must be true before delivering to the user):**

- Every user requirement has a corresponding piece of generated code.
- The code is complete and runnable, not a snippet that requires surrounding context.
- No invented model-specific values — only user-provided or placeholder values.
- Cleanup (session/viewport close) is present where applicable.

# ShapeDiver Agent Skills — Agent Guide

This repository is a **skill library** for building [ShapeDiver](https://shapediver.com/) 3D product configurators. It is not an application codebase. Skills follow the [Agent Skills specification](https://agentskills.io/specification).

## Model requirements

> **Warning:** These skills are written for **agent mode** (tool use, multi-step planning, reading skill files on demand). Lightweight chat models or non-agent assistants often skip the router, ignore `references/`, and produce incorrect ShapeDiver API code.

For reliable results, the user should run an **agent-capable model at least as capable** as the defaults used in [`scripts/execute-evals.js`](scripts/execute-evals.js) (`LLM_MODEL` when set, otherwise):

| Provider | Default `LLM_MODEL` |
| :------- | :------------------ |
| OpenRouter | `anthropic/claude-sonnet-4-20250514` |
| OpenAI | `gpt-4o` |
| Anthropic | `claude-sonnet-4-20250514` |

Prefer **this tier or stronger** (e.g. newer Sonnet/Opus, GPT-4.1+, or the user's IDE default agent model). If output quality is poor, suggest switching to agent mode and a more capable model before changing skill content.

Examples: Cursor **Agent**, Claude Code, GitHub Copilot **agent mode**, Codex with tools enabled. See [`EVALS.md`](EVALS.md) for eval setup and context limits on large skills.

**Agent instruction:** If the user is on a weak or non-agent model, warn them explicitly and recommend upgrading before implementing ShapeDiver integrations.

## When to use these skills

Activate when the user mentions or implies:

- ShapeDiver, Grasshopper-to-web, parametric 3D, or product configurator
- App Builder, Viewer V3, iframe embedding, or headless / Geometry SDK
- Credentials such as ticket, `modelViewUrl`, or model metadata for a ShapeDiver model

## Required workflow

1. On any ShapeDiver-related task, **read** [`skills/shapediver-router/SKILL.md`](skills/shapediver-router/SKILL.md) before other ShapeDiver skills or implementation code.
2. Complete routing and credential gathering per the router skill. Do not skip strategy selection.
3. When the router hands off, **read the full** target implementation `SKILL.md`. Load files under `references/` only when the skill directs you to.
4. Treat skill files as authoritative. Do not substitute training-data assumptions for API names, parameter names, or credentials.

## Skill routing

Install **all** skills when possible; the router may delegate to any of them.

| Skill | Path | When to activate |
| :---- | :--- | :--------------- |
| `shapediver-router` | [`skills/shapediver-router/SKILL.md`](skills/shapediver-router/SKILL.md) | Start of every ShapeDiver project; strategy selection and credentials before coding. |
| `shapediver-appbuilder` | [`skills/shapediver-appbuilder/SKILL.md`](skills/shapediver-appbuilder/SKILL.md) | App Builder path; routes to iframe, theme, or fork. |
| `shapediver-appbuilder-iframe` | [`skills/shapediver-appbuilder-iframe/SKILL.md`](skills/shapediver-appbuilder-iframe/SKILL.md) | Embed App Builder via iframe; zero-code / simplest web integration. |
| `shapediver-appbuilder-theme` | [`skills/shapediver-appbuilder-theme/SKILL.md`](skills/shapediver-appbuilder-theme/SKILL.md) | App Builder with branding/theme (colors, fonts, logo) without custom React. |
| `shapediver-appbuilder-fork` | [`skills/shapediver-appbuilder-fork/SKILL.md`](skills/shapediver-appbuilder-fork/SKILL.md) | Fork the open-source App Builder React app for custom UI or backends. |
| `shapediver-viewer` | [`skills/shapediver-viewer/SKILL.md`](skills/shapediver-viewer/SKILL.md) | Custom Viewer V3 API code (CDN, NPM, React), parameters, exports, interactions. |
| `shapediver-headless` | [`skills/shapediver-headless/SKILL.md`](skills/shapediver-headless/SKILL.md) | Server-side / no viewport: Geometry SDK, exports, automation, CI. |

## Installing skills for the user's project

Help the user install skills into their project (not only into this repo).

**Preferred (if available):**

```bash
gh skill install shapediver/agent-skills
```

See [`README.md`](README.md) for GitHub CLI prerequisites and the interactive install flow.

**Universal fallback:** Copy skill folders from this repository into `.agents/skills/` in the user's project:

```bash
mkdir -p .agents/skills
cp -r /path/to/agent-skills/skills/* .agents/skills/
```

Agent-specific skill directories (project scope / user scope):

| Agent | Project scope | User scope |
| :---- | :------------ | :--------- |
| GitHub Copilot | `.github/skills/` or `.agents/skills/` | `~/.copilot/skills/` or `~/.agents/skills/` |
| Claude Code | `.claude/skills/` or `.agents/skills/` | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/` |
| Others | `.agents/skills/` | `~/.agents/skills/` |

For manual clone steps and repository layout, see [`README.md`](README.md).

## Working in this repository

- **Consumer work:** Follow the workflow above. Do not treat this repo as a deployable application.
- **Maintainer work:** Skill authoring and evals — see [`EVALS.md`](EVALS.md) and `scripts/`.

## Out of scope

- Do not invent ticket, `modelViewUrl`, or model-specific parameter names.
- Do not write implementation code during the routing phase.
- Do not skip reading the target implementation skill before coding.

## Maintenance

When adding or renaming a skill, update the skill tables in both [`README.md`](README.md) and this file.

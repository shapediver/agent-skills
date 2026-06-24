# ShapeDiver Agent Skills

A collection of [Agent Skills](https://agentskills.io/) that give AI coding agents expert-level knowledge for building ShapeDiver 3D configurators.

## Installation

### Option 1: GitHub CLI (recommended)

```bash
# Interactive — choose which skills to install and for which agent
gh skill install shapediver/agent-skills
```

Requires the [GitHub CLI](https://cli.github.com/) with `gh skill` support. This launches an interactive prompt where you choose which skills to install and which AI assistant you are using. We recommend to always install _all_ skills. Works with GitHub Copilot, Claude Code, Cursor, Codex, Gemini CLI, Windsurf, Roo Code, and [many more](https://cli.github.com/manual/gh_skill_install).

### Option 2: Manual

Clone this repository and copy the skill folders you need into your agent's skills directory:

```bash
# Clone the repository
git clone https://github.com/shapediver/agent-skills.git

# Ensure the target directory exists
mkdir -p .agents/skills

# Copy the skill folders directly into your project
cp -r agent-skills/skills/* .agents/skills/

# Clean up the cloned repository folder (optional but recommended)
rm -rf agent-skills
```

Common skill directory locations:

| Agent          | Project scope                          | User scope                                  |
| :------------- | :------------------------------------- | :------------------------------------------ |
| GitHub Copilot | `.github/skills/` or `.agents/skills/` | `~/.copilot/skills/` or `~/.agents/skills/` |
| Claude Code    | `.claude/skills/` or `.agents/skills/` | `~/.claude/skills/`                         |
| Cursor         | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/`                         |
| Others         | `.agents/skills/`                      | `~/.agents/skills/`                         |

## Skills

| Skill                                                                          | Description                                                                                       |
| :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| [`shapediver-router`](skills/shapediver-router/SKILL.md)                       | Entry point for all ShapeDiver projects. Identifies integration strategy and gathers credentials. |
| [`shapediver-viewer`](skills/shapediver-viewer/SKILL.md)                       | Viewer V3 API for custom 3D configurators, including interaction features (CDN, NPM, React).      |
| [`shapediver-appbuilder`](skills/shapediver-appbuilder/SKILL.md)               | App Builder router — guides to iframe, theme, or fork strategy.                                   |
| [`shapediver-appbuilder-iframe`](skills/shapediver-appbuilder-iframe/SKILL.md) | App Builder iframe embedding — fastest path, zero code.                                           |
| [`shapediver-appbuilder-theme`](skills/shapediver-appbuilder-theme/SKILL.md)   | App Builder with optional custom theme (colors, fonts, logo).                                     |
| [`shapediver-appbuilder-fork`](skills/shapediver-appbuilder-fork/SKILL.md)     | Fork the open-source App Builder React app for custom components.                                 |
| [`shapediver-platform-backend`](skills/shapediver-platform-backend/SKILL.md)   | Platform Backend API/SDK: authentication, models, users, organizations, domains, saved states, API tokens, sharing, and Geometry Backend token requests. |
| [`shapediver-geometry-backend`](skills/shapediver-geometry-backend/SKILL.md)   | Geometry Backend SDKs for TypeScript, Python, and PHP: sessions, outputs, exports, file parameters, tickets/JWTs, and modelViewUrl. |
| [`shapediver-platform-geometry-workflows`](skills/shapediver-platform-geometry-workflows/SKILL.md) | Combined Platform Backend + Geometry Backend orchestration: slug/id/account credentials to runtime metadata, compute/export, upload/publish, and GB analytics flows. |

## Structure

```
skills/
├── shapediver-router/
│   └── SKILL.md
├── shapediver-viewer/
│   ├── SKILL.md
│   └── references/
│       ├── session-api.md
│       ├── viewport-api.md
│       ├── parameter-output-export-api.md
│       ├── scene-tree-materials.md
│       ├── advanced-topics.md
│       ├── parameter-formatting.md
│       ├── core-patterns.md
│       ├── ui-patterns.md
│       ├── advanced-patterns.md
│       ├── interactions-selection.md
│       ├── interactions-hovering.md
│       ├── interactions-dragging.md
│       ├── gumball-transform.md
│       ├── rectangle-transform.md
│       ├── html-anchors.md
│       ├── attribute-visualization.md
│       └── drawing-tools-reference.md
├── shapediver-appbuilder/
│   └── SKILL.md
├── shapediver-appbuilder-iframe/
│   └── SKILL.md
├── shapediver-appbuilder-theme/
│   └── SKILL.md
├── shapediver-appbuilder-fork/
│   └── SKILL.md
├── shapediver-platform-backend/
│   ├── SKILL.md
│   ├── evals/
│   │   ├── evals.json
│   │   └── eval_queries.json
│   └── references/
│       ├── platform-backend-concepts.md
│       ├── sdk-typescript.md
│       ├── rest-api-patterns.md
│       └── openapi-on-demand.md
├── shapediver-geometry-backend/
│   ├── SKILL.md
│   ├── evals/
│   │   ├── evals.json
│   │   └── eval_queries.json
│   └── references/
│       ├── sdk-typescript.md
│       ├── sdk-python.md
│       ├── sdk-php.md
│       ├── geometry-backend-concepts.md
│       └── openapi-on-demand.md
└── shapediver-platform-geometry-workflows/
    ├── SKILL.md
    └── evals/
        ├── evals.json
        └── eval_queries.json
```

Each skill follows the [Agent Skills specification](https://agentskills.io/specification) — a folder containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and Markdown instructions.

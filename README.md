# ShapeDiver LLM Skills

A collection of [Agent Skills](https://agentskills.io/) that give AI coding agents expert-level knowledge for building ShapeDiver 3D configurators.

## Skills

| Skill                                                                          | Description                                                                                       |
| :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| [`shapediver-router`](skills/shapediver-router/SKILL.md)                       | Entry point for all ShapeDiver projects. Identifies integration strategy and gathers credentials. |
| [`shapediver-viewer`](skills/shapediver-viewer/SKILL.md)                       | Viewer V3 API for custom 3D configurators, including interaction features (CDN, NPM, React).      |
| [`shapediver-appbuilder`](skills/shapediver-appbuilder/SKILL.md)               | App Builder router — guides to iframe, theme, or fork strategy.                                   |
| [`shapediver-appbuilder-iframe`](skills/shapediver-appbuilder-iframe/SKILL.md) | App Builder iframe embedding — fastest path, zero code.                                           |
| [`shapediver-appbuilder-theme`](skills/shapediver-appbuilder-theme/SKILL.md)   | App Builder with optional custom theme (colors, fonts, logo).                                     |
| [`shapediver-appbuilder-fork`](skills/shapediver-appbuilder-fork/SKILL.md)     | Fork the open-source App Builder React app for custom components.                                 |
| [`shapediver-headless`](skills/shapediver-headless/SKILL.md)                   | Headless/server-side integration via the Geometry SDK.                                            |

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
└── shapediver-headless/
    └── SKILL.md
```

Each skill follows the [Agent Skills specification](https://agentskills.io/specification) — a folder containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and Markdown instructions.

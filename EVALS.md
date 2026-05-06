# Evaluating Skills

This guide explains how to run evals, grade outputs, and iterate on skills in this repository. The workflow follows the [agentskills.io eval spec](https://agentskills.io/skill-creation/evaluating-skills).

## Overview

The eval loop has four steps:

1. **Run** — Execute each test case with and without the skill
2. **Grade** — Evaluate outputs against assertions (using an LLM or human review)
3. **Aggregate** — Compute summary statistics into `benchmark.json`
4. **Iterate** — Improve the skill based on results, then repeat

## Prerequisites

- Node.js installed
- An API key for one of the supported providers (see below)

## Running Evals

The fastest way to run the full pipeline:

```bash
# Using OpenRouter (recommended)
export OPENROUTER_API_KEY="sk-or-..."
node scripts/execute-evals.js all 1

# Run a specific skill only
node scripts/execute-evals.js all 1 --skill shapediver-viewer

# Preview what would run (no API calls)
node scripts/execute-evals.js all 1 --dry-run
```

### LLM Providers

Set one of these environment variables:

| Provider      | Env var                           | Default model                        |
| ------------- | --------------------------------- | ------------------------------------ |
| OpenRouter    | `OPENROUTER_API_KEY`              | `anthropic/claude-sonnet-4-20250514` |
| OpenAI        | `OPENAI_API_KEY`                  | `gpt-4o`                             |
| Anthropic     | `ANTHROPIC_API_KEY`               | `claude-sonnet-4-20250514`           |
| GitHub Models | `OPENAI_API_KEY` + `LLM_BASE_URL` | (set `LLM_MODEL`)                    |

For GitHub Models, create a [Personal Access Token](https://github.com/settings/tokens) with the `models` scope, then:

```powershell
$env:OPENAI_API_KEY = "github_pat_..."
$env:LLM_BASE_URL = "https://models.github.ai/inference"
$env:LLM_MODEL = "openai/gpt-4o"
node scripts/execute-evals.js all 1
```

Override the model with `LLM_MODEL`. Run `node scripts/execute-evals.js --help` for all options.

**Note:** GitHub Models free tier limits input to 8,000 tokens. Skills with large reference files (e.g. `shapediver-viewer` at ~69K tokens) will fail with 413 errors. Use OpenRouter or direct OpenAI/Anthropic keys for those.

### Running with Copilot Chat (Superpowers)

If you have a GitHub Copilot subscription, you can run evals directly in Copilot Chat using the agent mode. This uses Copilot's models with large context windows — no external API key needed.

In VS Code Copilot Chat (agent mode), prompt:

```
Run the eval pipeline for all skills, iteration 1.
For each skill, read evals.json and eval_queries.json.
For each code eval, spawn a subagent with the skill content + prompt,
save the output files to the workspace directory.
Then grade each output and aggregate results.
Use the same directory structure as `node scripts/execute-evals.js all 1`.
```

Or ask the agent to run individual steps:

```
Run the code evals for shapediver-viewer, iteration 1, with_skill mode.
Read the SKILL.md and all references, then execute each eval prompt.
Save outputs to skills/shapediver-viewer-workspace/iteration-1/eval-*/with_skill/outputs/
```

Advantages: no API key, large context, the agent can use tools (file I/O, terminal). The agent spawns a fresh subagent per eval for clean context, matching the spec's isolation requirement.

Available models (specify which to use when prompting):

- `Claude Sonnet 4 (copilot)` — fast, 200K context
- `Claude Opus 4 (copilot)` — most capable, 200K context
- `GPT-4o (copilot)` — 128K context

## Writing Test Cases

### Code Evals

Edit `skills/<skill-name>/evals/evals.json`:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "name": "descriptive-kebab-name",
      "prompt": "A realistic user message",
      "expected_output": "What success looks like",
      "assertions": [
        "Specific, verifiable statement about the output",
        "Another checkable assertion"
      ],
      "files": []
    }
  ]
}
```

Tips: start with 2–3 test cases, vary prompt style and complexity, include at least one edge case, and write assertions after seeing first outputs.

### Query Classification Evals

Edit `skills/<skill-name>/evals/eval_queries.json`:

```json
[
  {
    "query": "a prompt that should trigger this skill",
    "should_trigger": true
  },
  {
    "query": "a prompt that should NOT trigger this skill",
    "should_trigger": false
  }
]
```

## Iterating

After reviewing results:

1. Identify failed assertions and patterns
2. Update `SKILL.md` to address gaps
3. Run the next iteration:

```bash
node scripts/execute-evals.js all 2 --skill shapediver-viewer
```

Stop when pass rates plateau.

## Script Reference

| Script             | Commands                                          |
| ------------------ | ------------------------------------------------- |
| `run-evals.js`     | `setup`, `prompts`, `queries`, `status`           |
| `grade-evals.js`   | `prepare`, `grade-queries`, `aggregate`, `report` |
| `execute-evals.js` | `code-evals`, `query-evals`, `grade`, `all`       |

Run any script with `--help` for full usage details.

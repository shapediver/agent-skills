#!/usr/bin/env node
/**
 * execute-evals.js — Execute eval prompts and grading via LLM API
 *
 * Automates the eval pipeline: sends prompts to an LLM API, saves outputs,
 * and grades results. Supports OpenAI and Anthropic APIs.
 *
 * Environment variables:
 *   OPENAI_API_KEY      OpenAI API key
 *   ANTHROPIC_API_KEY   Anthropic API key
 *   OPENROUTER_API_KEY  OpenRouter API key (openrouter.ai)
 *   LLM_MODEL           Model name (default: gpt-4o / claude-sonnet-4-20250514 / anthropic/claude-sonnet-4-20250514)
 *   LLM_BASE_URL        Base URL for OpenAI-compatible APIs
 *
 * Usage:
 *   node scripts/execute-evals.js code-evals <iteration> [options]
 *   node scripts/execute-evals.js query-evals <iteration> [options]
 *   node scripts/execute-evals.js grade <iteration> [options]
 *   node scripts/execute-evals.js all <iteration> [options]
 *   node scripts/execute-evals.js --help
 *
 * Options:
 *   --skill NAME       Filter by skill directory name
 *   --mode MODE        with_skill | without_skill | both (default: both)
 *   --dry-run          Print what would be done without calling API
 *
 * Exit codes: 0 = success, 1 = partial failure, 2 = fatal error
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL;
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const API_DELAY_MS = parseInt(process.env.API_DELAY_MS || "1000", 10);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function getProvider() {
  if (OPENROUTER_API_KEY) return "openrouter";
  if (OPENAI_API_KEY) return "openai";
  if (ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

// ---------------------------------------------------------------------------
// Helpers (shared with run-evals.js / grade-evals.js)
// ---------------------------------------------------------------------------

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  let raw = fs.readFileSync(filePath, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function findAllEvals() {
  const skills = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() && !d.endsWith("-workspace")
  );
  const result = [];
  for (const skill of skills) {
    const data = readJSON(path.join(SKILLS_DIR, skill, "evals", "evals.json"));
    if (!data || !data.evals || data.evals.length === 0) continue;
    result.push({ skill, evals: data.evals });
  }
  return result;
}

function findAllQueryEvals() {
  const skills = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() && !d.endsWith("-workspace")
  );
  const result = [];
  for (const skill of skills) {
    const data = readJSON(path.join(SKILLS_DIR, skill, "evals", "eval_queries.json"));
    if (!data || !Array.isArray(data) || data.length === 0) continue;
    result.push({ skill, queries: data });
  }
  return result;
}

function workspaceDir(skill, iteration) {
  return path.join(SKILLS_DIR, `${skill}-workspace`, `iteration-${iteration}`);
}

function evalDir(skill, iteration, evalName, mode) {
  return path.join(workspaceDir(skill, iteration), `eval-${evalName}`, mode);
}

function queryEvalDir(skill, iteration) {
  return path.join(workspaceDir(skill, iteration), "query-evals", "with_skill");
}

function readSkillContent(skill) {
  const skillPath = path.join(SKILLS_DIR, skill, "SKILL.md");
  if (!fs.existsSync(skillPath)) return null;
  let content = fs.readFileSync(skillPath, "utf8");

  const refsDir = path.join(SKILLS_DIR, skill, "references");
  if (fs.existsSync(refsDir)) {
    const files = fs.readdirSync(refsDir).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      const refContent = fs.readFileSync(path.join(refsDir, f), "utf8");
      content += `\n\n---\n\n# Reference: ${f}\n\n${refContent}`;
    }
  }

  const approxTokens = Math.round(content.length / 4);
  if (approxTokens > 8000) {
    console.error(`    Note: skill context is ~${approxTokens} tokens — providers with small context limits may reject this`);
  }

  return content;
}

// ---------------------------------------------------------------------------
// LLM API
// ---------------------------------------------------------------------------

async function callLLM(systemPrompt, userPrompt) {
  const provider = getProvider();

  if (provider === "openrouter") {
    const baseUrl = "https://openrouter.ai/api/v1";
    const model = LLM_MODEL || "anthropic/claude-sonnet-4-20250514";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter API ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (provider === "openai") {
    const baseUrl = LLM_BASE_URL || "https://api.openai.com/v1";
    const model = LLM_MODEL || "gpt-4o";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (provider === "anthropic") {
    const model = LLM_MODEL || "claude-sonnet-4-20250514";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = await res.json();
    return data.content[0].text;
  }
}

async function callLLMWithRetry(systemPrompt, userPrompt, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(systemPrompt, userPrompt);
    } catch (err) {
      // Don't retry non-transient errors (payload too large, auth, bad request)
      if (/\b(413|401|403|400)\b/.test(err.message)) throw err;
      if (attempt === maxRetries) throw err;
      // Parse Retry-After header hint if present, otherwise exponential backoff
      const retryMatch = err.message.match(/retry.after[:\s]*(\d+)/i);
      const delay = retryMatch
        ? parseInt(retryMatch[1], 10) * 1000
        : Math.min(Math.pow(2, attempt + 1) * 1000, 60000);
      console.error(`    Retry ${attempt + 1}/${maxRetries} in ${delay / 1000}s: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function extractFiles(text) {
  const files = [];
  const blockRegex = /```(\w+)?(?::(\S+))?\n([\s\S]*?)```/g;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const lang = match[1] || "";
    let filename = match[2]?.trim();
    const content = match[3];

    if (filename) {
      filename = filename.replace(/[`"']/g, "").trim();
      if (!filename.includes(".")) filename = null;
    }

    if (!filename) {
      const before = text.slice(Math.max(0, match.index - 300), match.index);
      const fnMatch = before.match(/`([^`]+\.\w{1,5})`\s*[:\n]*\s*$/);
      if (fnMatch) filename = fnMatch[1];
    }

    if (!filename) {
      const before = text.slice(Math.max(0, match.index - 200), match.index);
      const headerMatch = before.match(/(?:\*\*|#{1,4}\s+)(\S+\.\w{1,5})\**\s*\n*$/);
      if (headerMatch) filename = headerMatch[1];
    }

    if (!filename) {
      const firstLine = content.split("\n")[0];
      const commentMatch = firstLine.match(/(?:\/\/|<!--)\s*(?:File:\s*)?(\S+\.\w{1,5})/i);
      if (commentMatch) filename = commentMatch[1];
    }

    if (!filename) {
      const extMap = {
        html: "html", javascript: "js", js: "js", jsx: "jsx",
        typescript: "ts", ts: "ts", tsx: "tsx", css: "css",
        json: "json", python: "py", py: "py",
      };
      const ext = extMap[lang] || lang || "txt";
      filename = files.length === 0 ? `output.${ext}` : `output-${files.length + 1}.${ext}`;
    }

    files.push({ name: path.basename(filename), content });
  }

  return files;
}

function extractJSON(text) {
  try { return JSON.parse(text); } catch {}
  const block = text.match(/```(?:json)?\n([\s\S]*?)```/);
  if (block) try { return JSON.parse(block[1]); } catch {}
  const struct = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (struct) try { return JSON.parse(struct[1]); } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdCodeEvals(iteration, filterSkill, filterMode, dryRun) {
  const allEvals = findAllEvals();
  const modes = filterMode === "both"
    ? ["with_skill", "without_skill"]
    : [filterMode];

  let total = 0, success = 0, failed = 0;

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const skillContent = readSkillContent(skill);

    for (const ev of evals) {
      for (const mode of modes) {
        const outputDir = path.join(evalDir(skill, iteration, ev.name, mode), "outputs");
        fs.mkdirSync(outputDir, { recursive: true });

        if (fs.readdirSync(outputDir).length > 0) {
          console.error(`  Skip ${skill}/${ev.name} [${mode}] — already has outputs`);
          continue;
        }

        total++;
        console.error(`  ${skill}/${ev.name} [${mode}]...`);

        const systemPrompt = [
          `You are a skilled web developer.`,
          `Complete the coding task below.`,
          `Output each file as a fenced code block with the filename after the language tag, like:`,
          "```html:index.html",
          `<code here>`,
          "```",
          `If you produce multiple files, output each one separately with its filename.`,
        ].join("\n");

        let userPrompt;
        if (mode === "with_skill" && skillContent) {
          userPrompt = [
            `Here are the skill instructions you must follow:\n`,
            skillContent,
            `\n---\n`,
            `Task: ${ev.prompt}`,
          ].join("\n");
        } else {
          userPrompt = `Task: ${ev.prompt}`;
        }

        if (dryRun) {
          console.log(`\n--- DRY RUN: ${skill}/${ev.name} [${mode}] ---`);
          console.log(`System: ${systemPrompt.slice(0, 120)}...`);
          console.log(`User prompt length: ${userPrompt.length} chars`);
          continue;
        }

        try {
          await sleep(API_DELAY_MS);
          const response = await callLLMWithRetry(systemPrompt, userPrompt);
          const files = extractFiles(response);
          if (files.length === 0) {
            fs.writeFileSync(path.join(outputDir, "response.md"), response);
            console.error(`    Warning: no code blocks found, saved raw response`);
          } else {
            for (const f of files) {
              fs.writeFileSync(path.join(outputDir, f.name), f.content);
            }
            console.error(`    Saved ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`);
          }
          success++;
        } catch (err) {
          console.error(`    Error: ${err.message}`);
          failed++;
        }
      }
    }
  }

  console.error(`\nCode evals: ${success} succeeded, ${failed} failed out of ${total}`);
}

async function cmdQueryEvals(iteration, filterSkill, dryRun) {
  const allQueryEvals = findAllQueryEvals();
  let total = 0, success = 0, failed = 0;

  for (const { skill, queries } of allQueryEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const dir = queryEvalDir(skill, iteration);
    fs.mkdirSync(path.join(dir, "outputs"), { recursive: true });

    if (fs.existsSync(path.join(dir, "outputs", "results.json"))) {
      console.error(`  Skip ${skill} query evals — already has results`);
      continue;
    }

    total++;
    console.error(`  ${skill} (${queries.length} queries)...`);

    const skillContent = readSkillContent(skill);

    const systemPrompt = [
      `You are evaluating whether user queries should trigger a specific development skill.`,
      `Read the skill description, then classify each query.`,
      `A query should trigger the skill if it falls within the skill's domain and the skill would be useful for answering it.`,
      ``,
      `Output ONLY a JSON array with no surrounding text:`,
      `[{"query": "exact query text", "triggered": true}, ...]`,
    ].join("\n");

    const queryList = queries.map((q, i) => `${i + 1}. "${q.query}"`).join("\n");
    const userPrompt = [
      `Skill: ${skill}\n`,
      skillContent || "(no skill file found)",
      `\n---\n`,
      `Classify each query:\n${queryList}`,
    ].join("\n");

    if (dryRun) {
      console.log(`\n--- DRY RUN: ${skill} query evals ---`);
      console.log(`Queries: ${queries.length}`);
      console.log(`User prompt length: ${userPrompt.length} chars`);
      continue;
    }

    try {
      await sleep(API_DELAY_MS);
      const response = await callLLMWithRetry(systemPrompt, userPrompt);
      const results = extractJSON(response);
      if (!results || !Array.isArray(results)) {
        fs.writeFileSync(path.join(dir, "outputs", "response.md"), response);
        console.error(`    Warning: could not parse JSON, saved raw response`);
        failed++;
        continue;
      }
      fs.writeFileSync(
        path.join(dir, "outputs", "results.json"),
        JSON.stringify(results, null, 2)
      );
      console.error(`    Saved ${results.length} classifications`);
      success++;
    } catch (err) {
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  console.error(`\nQuery evals: ${success} succeeded, ${failed} failed out of ${total}`);
}

async function cmdGrade(iteration, filterSkill, dryRun) {
  const allEvals = findAllEvals();
  let total = 0, success = 0, failed = 0;

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;

    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = evalDir(skill, iteration, ev.name, mode);
        const gradingPath = path.join(dir, "grading.json");
        if (fs.existsSync(gradingPath)) continue;

        const outputsDir = path.join(dir, "outputs");
        if (!fs.existsSync(outputsDir)) continue;
        const outputFiles = fs.readdirSync(outputsDir);
        if (outputFiles.length === 0) continue;

        const assertions = ev.assertions || [];
        if (assertions.length === 0) continue;

        total++;
        console.error(`  ${skill}/${ev.name} [${mode}]...`);

        const outputContent = outputFiles.map((f) => {
          const content = fs.readFileSync(path.join(outputsDir, f), "utf8");
          return `### ${f}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``;
        }).join("\n\n");

        const systemPrompt = [
          `You are grading code output against specific assertions.`,
          `For each assertion, determine PASS or FAIL with concrete evidence (quote or reference the code).`,
          ``,
          `Output ONLY valid JSON with no surrounding text:`,
          `{`,
          `  "assertion_results": [`,
          `    {"text": "assertion", "passed": true, "evidence": "specific evidence"}`,
          `  ],`,
          `  "summary": {"passed": N, "failed": N, "total": N, "pass_rate": 0.XX}`,
          `}`,
        ].join("\n");

        const userPrompt = [
          `Skill: ${skill}`,
          `Eval: ${ev.name} (${mode})`,
          `Task: ${ev.prompt}`,
          `Expected: ${ev.expected_output}`,
          ``,
          `--- OUTPUT FILES ---`,
          outputContent,
          ``,
          `--- ASSERTIONS TO GRADE ---`,
          ...assertions.map((a, i) => `${i + 1}. ${a}`),
        ].join("\n");

        if (dryRun) {
          console.log(`\n--- DRY RUN: grade ${skill}/${ev.name} [${mode}] ---`);
          console.log(`Assertions: ${assertions.length}`);
          console.log(`Output files: ${outputFiles.join(", ")}`);
          continue;
        }

        try {
          await sleep(API_DELAY_MS);
          const response = await callLLMWithRetry(systemPrompt, userPrompt);
          const grading = extractJSON(response);
          if (!grading || !grading.assertion_results) {
            fs.writeFileSync(path.join(dir, "grading-raw.md"), response);
            console.error(`    Warning: could not parse grading JSON, saved raw response`);
            failed++;
            continue;
          }
          fs.writeFileSync(gradingPath, JSON.stringify(grading, null, 2));
          const s = grading.summary || {};
          console.error(`    ${s.passed}/${s.total} passed (${((s.pass_rate || 0) * 100).toFixed(0)}%)`);
          success++;
        } catch (err) {
          console.error(`    Error: ${err.message}`);
          failed++;
        }
      }
    }
  }

  console.error(`\nGrading: ${success} succeeded, ${failed} failed out of ${total}`);
}

async function cmdAll(iteration, filterSkill, filterMode, dryRun) {
  const scriptDir = __dirname;
  const skillArg = filterSkill ? ` --skill ${filterSkill}` : "";

  console.error("=== Step 1: Setup ===");
  execSync(
    `node "${path.join(scriptDir, "run-evals.js")}" setup --iteration ${iteration}`,
    { stdio: "inherit" }
  );

  console.error("\n=== Step 2: Execute code evals ===");
  await cmdCodeEvals(iteration, filterSkill, filterMode, dryRun);

  console.error("\n=== Step 3: Execute query evals ===");
  await cmdQueryEvals(iteration, filterSkill, dryRun);

  if (dryRun) {
    console.error("\n(Dry run — skipping grading, aggregation, and reporting)");
    return;
  }

  console.error("\n=== Step 4: Grade code evals ===");
  await cmdGrade(iteration, filterSkill, false);

  console.error("\n=== Step 5: Grade query evals ===");
  execSync(
    `node "${path.join(scriptDir, "grade-evals.js")}" grade-queries ${iteration}${skillArg}`,
    { stdio: "inherit" }
  );

  console.error("\n=== Step 6: Aggregate ===");
  try {
    execSync(
      `node "${path.join(scriptDir, "grade-evals.js")}" aggregate ${iteration}${skillArg}`,
      { stdio: "inherit" }
    );
  } catch {
    // aggregate exits 1 if any assertions failed — that's expected
  }

  console.error("\n=== Step 7: Report ===");
  execSync(
    `node "${path.join(scriptDir, "grade-evals.js")}" report ${iteration}${skillArg}`,
    { stdio: "inherit" }
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function cmdHelp() {
  console.log(`Usage: node scripts/execute-evals.js <command> <iteration> [options]

Commands:
  code-evals    Execute code eval prompts via LLM API
  query-evals   Execute query classification evals via LLM API
  grade         Grade code eval outputs via LLM API
  all           Full pipeline: setup → execute → grade → aggregate → report

Options:
  --skill NAME       Filter by skill directory name
  --mode MODE        with_skill | without_skill | both (default: both, code-evals only)
  --dry-run          Print what would be done without calling API

Environment variables:
  OPENAI_API_KEY      OpenAI API key (uses gpt-4o by default)
  ANTHROPIC_API_KEY   Anthropic API key (uses claude-sonnet-4-20250514 by default)
  OPENROUTER_API_KEY  OpenRouter API key (uses anthropic/claude-sonnet-4-20250514 by default)
  LLM_MODEL           Override model name
  LLM_BASE_URL        Override API base URL (OpenAI-compatible format)

GitHub Models: use OPENAI_API_KEY with a PAT that has the 'models' scope,
  and set LLM_BASE_URL=https://models.github.ai/inference

Examples:
  $env:OPENROUTER_API_KEY="sk-or-..."; node scripts/execute-evals.js all 1
  $env:OPENAI_API_KEY="ghp_..."; $env:LLM_BASE_URL="https://models.github.ai/inference"; $env:LLM_MODEL="openai/gpt-4o"; node scripts/execute-evals.js all 1
  node scripts/execute-evals.js all 1 --dry-run`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  cmdHelp();
  process.exit(0);
}

const command = args[0];
const iteration = parseInt(args[1], 10);

if (isNaN(iteration)) {
  console.error("Error: iteration number required.\n");
  cmdHelp();
  process.exit(2);
}

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  return args[idx + 1];
}

const filterSkill = getArg("skill", null);
const filterMode = getArg("mode", "both");
const dryRun = args.includes("--dry-run");

if (!dryRun && !getProvider()) {
  console.error("Error: Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable.\n");
  cmdHelp();
  process.exit(2);
}

(async () => {
  try {
    switch (command) {
      case "code-evals":
        await cmdCodeEvals(iteration, filterSkill, filterMode, dryRun);
        break;
      case "query-evals":
        await cmdQueryEvals(iteration, filterSkill, dryRun);
        break;
      case "grade":
        await cmdGrade(iteration, filterSkill, dryRun);
        break;
      case "all":
        await cmdAll(iteration, filterSkill, filterMode, dryRun);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        cmdHelp();
        process.exit(2);
    }
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(2);
  }
})();

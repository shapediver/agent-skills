#!/usr/bin/env node
/**
 * run-evals.js — Eval runner for agent skills
 *
 * Generic tool for managing eval runs. Works with any skill that has
 * evals/evals.json. No skill-specific logic.
 *
 * Usage:
 *   node scripts/run-evals.js setup [--iteration N]
 *   node scripts/run-evals.js prompts [--iteration N] [--skill NAME] [--mode MODE]
 *   node scripts/run-evals.js status [--iteration N]
 *   node scripts/run-evals.js --help
 *
 * Exit codes: 0 = success, 1 = bad args
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

// ---------------------------------------------------------------------------
// Helpers
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
    result.push({ skill, skillName: data.skill_name, evals: data.evals });
  }
  return result;
}

/** Workspace lives alongside the skill dir per agentskills.io spec */
function workspaceDir(skill, iteration) {
  return path.join(SKILLS_DIR, `${skill}-workspace`, `iteration-${iteration}`);
}

function evalDir(skill, iteration, evalName, mode) {
  return path.join(workspaceDir(skill, iteration), `eval-${evalName}`, mode);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdSetup(iteration) {
  const allEvals = findAllEvals();
  let created = 0;
  for (const { skill, evals } of allEvals) {
    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = path.join(evalDir(skill, iteration, ev.name, mode), "outputs");
        fs.mkdirSync(dir, { recursive: true });
        created++;
      }
    }
  }
  console.log(`Created ${created} eval directories for iteration ${iteration}.`);
}

function cmdPrompts(iteration, filterSkill, filterMode) {
  const allEvals = findAllEvals();
  const modes = filterMode === "both" ? ["with_skill", "without_skill"]
              : [filterMode || "with_skill"];
  const prompts = [];

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const skillPath = path.join(SKILLS_DIR, skill, "SKILL.md");

    for (const ev of evals) {
      for (const mode of modes) {
        const outputPath = path.join(evalDir(skill, iteration, ev.name, mode), "outputs");
        const skillLine = mode === "with_skill"
          ? `- Skill path: ${skillPath}`
          : `- Skill: (none — baseline run)`;

        prompts.push({
          skill,
          evalName: ev.name,
          mode,
          agentPrompt: [
            `Execute this task:`,
            skillLine,
            `- Task: ${ev.prompt}`,
            ev.files && ev.files.length > 0 ? `- Input files: ${ev.files.join(", ")}` : null,
            `- Save outputs to: ${outputPath}/`,
            ``,
            mode === "with_skill"
              ? `Read the skill file first, then complete the task. Save all generated code/output to the outputs directory.`
              : `Complete the task without any skill instructions. Save all generated code/output to the outputs directory.`,
          ].filter(Boolean).join("\n"),
        });
      }
    }
  }

  console.log(JSON.stringify(prompts, null, 2));
}

function cmdStatus(iteration) {
  const allEvals = findAllEvals();
  const rows = [];

  for (const { skill, evals } of allEvals) {
    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = path.join(evalDir(skill, iteration, ev.name, mode), "outputs");
        const hasOutputs = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
        const gradingFile = path.join(evalDir(skill, iteration, ev.name, mode), "grading.json");
        const hasGrading = fs.existsSync(gradingFile);
        rows.push({
          skill,
          eval: ev.name,
          mode,
          outputs: hasOutputs ? "YES" : " - ",
          grading: hasGrading ? "YES" : " - ",
        });
      }
    }
  }

  console.log("Skill".padEnd(34) + "Eval".padEnd(26) + "Mode".padEnd(16) + "Outputs  Grading");
  console.log("-".repeat(100));
  for (const r of rows) {
    console.log(
      `${r.skill.padEnd(34)}${r.eval.padEnd(26)}${r.mode.padEnd(16)}${r.outputs.padEnd(9)}${r.grading}`
    );
  }
}

function cmdHelp() {
  console.log(`Usage: node scripts/run-evals.js <command> [options]

Commands:
  setup    Create workspace directories for all evals
  prompts  Print agent prompts for spawning eval runs
  status   Show which evals have outputs and grading

Options:
  --iteration N    Iteration number (default: 1)
  --skill NAME     Filter by skill directory name
  --mode MODE      with_skill, without_skill, or both (for prompts, default: with_skill)
  --help, -h       Show this help message`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args[0];

function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return defaultVal;
  return args[idx + 1];
}

if (args.includes("--help") || args.includes("-h") || !command) {
  cmdHelp();
  process.exit(0);
}

const iteration = parseInt(getArg("iteration", "1"), 10);

switch (command) {
  case "setup":
    cmdSetup(iteration);
    break;
  case "prompts":
    cmdPrompts(iteration, getArg("skill", null), getArg("mode", "with_skill"));
    break;
  case "status":
    cmdStatus(iteration);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    cmdHelp();
    process.exit(1);
}

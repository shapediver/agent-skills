#!/usr/bin/env node
/**
 * grade-evals.js — Aggregate and report eval grading results
 *
 * This script is ABSTRACT — it contains no skill-specific logic.
 * Grading is done by an LLM or human reviewer who writes grading.json files.
 * This script aggregates those results into benchmark.json and prints reports.
 *
 * Usage:
 *   node scripts/grade-evals.js aggregate <iteration> [--skill SKILL_NAME]
 *     Read all grading.json files and produce benchmark.json + summary report.
 *
 *   node scripts/grade-evals.js prepare <iteration> [--skill SKILL_NAME]
 *     Print a grading prompt for each eval that has outputs but no grading.json.
 *     Feed this to an LLM to produce grading.json files.
 *
 *   node scripts/grade-evals.js grade-queries <iteration> [--skill SKILL_NAME]
 *     Auto-grade query classification evals against eval_queries.json ground truth.
 *
 *   node scripts/grade-evals.js report <iteration> [--skill SKILL_NAME]
 *     Print a human-readable report of all graded evals.
 *
 *   node scripts/grade-evals.js --help
 *
 * Exit codes: 0 = success/all pass, 1 = some failures, 2 = error
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
    result.push({ skill, evals: data.evals });
  }
  return result;
}

function workspaceDir(skill, iteration) {
  return path.join(SKILLS_DIR, `${skill}-workspace`, `iteration-${iteration}`);
}

function evalDir(skill, iteration, evalName, mode) {
  return path.join(workspaceDir(skill, iteration), `eval-${evalName}`, mode);
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

function queryEvalDir(skill, iteration) {
  return path.join(workspaceDir(skill, iteration), "query-evals", "with_skill");
}

function readOutputFiles(dir) {
  const outputsDir = path.join(dir, "outputs");
  if (!fs.existsSync(outputsDir)) return null;
  const files = fs.readdirSync(outputsDir);
  if (files.length === 0) return null;
  const result = {};
  for (const f of files) {
    result[f] = fs.readFileSync(path.join(outputsDir, f), "utf8");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * prepare — For each eval with outputs but no grading.json, print a structured
 * grading prompt that can be given to an LLM. The LLM reads the output, checks
 * each assertion, and writes grading.json.
 */
function cmdPrepare(iteration, filterSkill) {
  const allEvals = findAllEvals();
  const tasks = [];

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;

    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = evalDir(skill, iteration, ev.name, mode);
        const gradingPath = path.join(dir, "grading.json");
        if (fs.existsSync(gradingPath)) continue; // already graded

        const outputs = readOutputFiles(dir);
        if (!outputs) continue; // no outputs to grade

        const assertions = ev.assertions || [];
        if (assertions.length === 0) continue;

        tasks.push({
          skill,
          eval: ev.name,
          mode,
          gradingPath,
          prompt: [
            `Grade the following eval output against its assertions.`,
            ``,
            `Skill: ${skill}`,
            `Eval: ${ev.name} (${mode})`,
            `Prompt: ${ev.prompt}`,
            `Expected output: ${ev.expected_output}`,
            ``,
            `--- OUTPUT FILES ---`,
            ...Object.entries(outputs).map(([name, content]) =>
              `\n### ${name}\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``
            ),
            ``,
            `--- ASSERTIONS TO GRADE ---`,
            ...assertions.map((a, i) => `${i + 1}. ${a}`),
            ``,
            `For each assertion, determine PASS or FAIL with specific evidence`,
            `(quote or reference the output, don't just state an opinion).`,
            ``,
            `Save the result as grading.json at: ${gradingPath}`,
            ``,
            `Use this exact format:`,
            `{`,
            `  "assertion_results": [`,
            `    { "text": "assertion text", "passed": true|false, "evidence": "specific evidence" }`,
            `  ],`,
            `  "summary": { "passed": N, "failed": N, "total": N, "pass_rate": 0.XX }`,
            `}`,
          ].join("\n"),
        });
      }
    }
  }

  if (tasks.length === 0) {
    console.log("Nothing to grade — all evals with outputs already have grading.json.");
    return;
  }

  console.log(JSON.stringify(tasks, null, 2));
  console.error(`\n${tasks.length} eval(s) need grading.`);
}

/**
 * grade-queries — Automatically grade query classification evals by comparing
 * agent results against eval_queries.json ground truth.
 */
function cmdGradeQueries(iteration, filterSkill) {
  const allQueryEvals = findAllQueryEvals();
  let anyGraded = false;

  for (const { skill, queries } of allQueryEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const dir = queryEvalDir(skill, iteration);
    const resultsPath = path.join(dir, "outputs", "results.json");
    const results = readJSON(resultsPath);
    if (!results || !Array.isArray(results)) {
      console.error(`No results for ${skill} — skipping`);
      continue;
    }

    const expected = new Map(queries.map((q) => [q.query, q.should_trigger]));
    let tp = 0, fp = 0, tn = 0, fn = 0;
    const queryResults = [];

    for (const r of results) {
      const exp = expected.get(r.query);
      if (exp === undefined) {
        console.error(`  Warning: unknown query in ${skill}: "${r.query}"`);
        continue;
      }
      const actual = !!r.triggered;
      if (actual && exp) tp++;
      else if (actual && !exp) fp++;
      else if (!actual && exp) fn++;
      else tn++;
      queryResults.push({ query: r.query, expected: exp, actual, correct: actual === exp });
    }

    const total = tp + fp + tn + fn;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const accuracy = total > 0 ? (tp + tn) / total : 0;

    const grading = {
      query_results: queryResults,
      confusion_matrix: { tp, fp, tn, fn },
      summary: {
        precision: +precision.toFixed(3),
        recall: +recall.toFixed(3),
        f1: +f1.toFixed(3),
        accuracy: +accuracy.toFixed(3),
        total,
        correct: tp + tn,
      },
    };

    const gradingPath = path.join(dir, "grading.json");
    fs.writeFileSync(gradingPath, JSON.stringify(grading, null, 2));
    console.log(`Graded ${skill}: ${tp + tn}/${total} correct (F1: ${f1.toFixed(3)}, P: ${precision.toFixed(3)}, R: ${recall.toFixed(3)})`);
    anyGraded = true;
  }

  if (!anyGraded) {
    console.log("No query eval results found to grade.");
  }
}

/**
 * aggregate — Read all grading.json files and produce benchmark.json + report.
 */
function cmdAggregate(iteration, filterSkill) {
  const allEvals = findAllEvals();
  const benchmarkData = {};
  let totalPassed = 0;
  let totalFailed = 0;

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;

    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = evalDir(skill, iteration, ev.name, mode);
        const grading = readJSON(path.join(dir, "grading.json"));
        if (!grading || !grading.summary) continue;

        totalPassed += grading.summary.passed || 0;
        totalFailed += grading.summary.failed || 0;

        if (!benchmarkData[skill]) benchmarkData[skill] = {};
        if (!benchmarkData[skill][mode]) benchmarkData[skill][mode] = { pass_rates: [], evals: [] };
        benchmarkData[skill][mode].pass_rates.push(grading.summary.pass_rate);
        benchmarkData[skill][mode].evals.push({
          name: ev.name,
          pass_rate: grading.summary.pass_rate,
          passed: grading.summary.passed,
          failed: grading.summary.failed,
          total: grading.summary.total,
        });
      }
    }
  }

  // Include query eval results
  const allQueryEvals = findAllQueryEvals();
  for (const { skill } of allQueryEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const dir = queryEvalDir(skill, iteration);
    const grading = readJSON(path.join(dir, "grading.json"));
    if (!grading || !grading.summary) continue;
    if (!benchmarkData[skill]) benchmarkData[skill] = {};
    benchmarkData[skill].query_evals = grading.summary;
  }

  // Write benchmark.json per skill
  for (const [skill, modes] of Object.entries(benchmarkData)) {
    const benchDir = workspaceDir(skill, iteration);
    fs.mkdirSync(benchDir, { recursive: true });

    const benchmark = { run_summary: {} };
    for (const [mode, data] of Object.entries(modes)) {
      if (mode === "query_evals") {
        benchmark.run_summary.query_evals = data;
        continue;
      }
      const mean = data.pass_rates.reduce((a, b) => a + b, 0) / data.pass_rates.length;
      const stddev = Math.sqrt(
        data.pass_rates.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.pass_rates.length
      );
      benchmark.run_summary[mode] = {
        pass_rate: { mean: +mean.toFixed(2), stddev: +stddev.toFixed(2) },
        evals: data.evals,
      };
    }

    // Compute delta if both modes present
    if (benchmark.run_summary.with_skill && benchmark.run_summary.without_skill) {
      benchmark.run_summary.delta = {
        pass_rate: +(
          benchmark.run_summary.with_skill.pass_rate.mean -
          benchmark.run_summary.without_skill.pass_rate.mean
        ).toFixed(2),
      };
    }

    fs.writeFileSync(
      path.join(benchDir, "benchmark.json"),
      JSON.stringify(benchmark, null, 2)
    );
    console.error(`Wrote ${path.join(benchDir, "benchmark.json")}`);
  }

  const total = totalPassed + totalFailed;
  console.log("=".repeat(60));
  console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed out of ${total}`);
  if (total > 0) {
    console.log(`Overall pass rate: ${((totalPassed / total) * 100).toFixed(1)}%`);
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

/**
 * report — Print a human-readable report from existing grading.json files.
 */
function cmdReport(iteration, filterSkill) {
  const allEvals = findAllEvals();
  const modeTotals = { with_skill: { passed: 0, failed: 0 }, without_skill: { passed: 0, failed: 0 } };

  for (const { skill, evals } of allEvals) {
    if (filterSkill && skill !== filterSkill) continue;

    for (const ev of evals) {
      for (const mode of ["with_skill", "without_skill"]) {
        const dir = evalDir(skill, iteration, ev.name, mode);
        const grading = readJSON(path.join(dir, "grading.json"));
        if (!grading || !grading.assertion_results) continue;

        const s = grading.summary || {};
        modeTotals[mode].passed += s.passed || 0;
        modeTotals[mode].failed += s.failed || 0;

        const status = (s.failed || 0) === 0 ? "PASS" : "FAIL";
        const modeLabel = mode === "with_skill" ? "" : " [without_skill]";
        console.log(`${status} ${skill}/${ev.name}${modeLabel} (${s.passed}/${s.total})`);
        for (const r of grading.assertion_results) {
          const mark = r.passed ? "  ✓" : "  ✗";
          console.log(`${mark} ${r.text}`);
          if (!r.passed) console.log(`    Evidence: ${r.evidence}`);
        }
        console.log();
      }
    }
  }

  // Query eval results
  const allQueryEvals = findAllQueryEvals();
  for (const { skill } of allQueryEvals) {
    if (filterSkill && skill !== filterSkill) continue;
    const dir = queryEvalDir(skill, iteration);
    const grading = readJSON(path.join(dir, "grading.json"));
    if (!grading || !grading.query_results) continue;

    const s = grading.summary;
    console.log(`QUERY ${skill} — F1: ${s.f1} | P: ${s.precision} | R: ${s.recall} | Acc: ${s.accuracy} (${s.correct}/${s.total})`);
    const mismatches = grading.query_results.filter((r) => !r.correct);
    if (mismatches.length > 0) {
      for (const r of mismatches) {
        console.log(`  \u2717 expected=${r.expected} actual=${r.actual} "${r.query}"`);
      }
    }
    console.log();
  }

  const ws = modeTotals.with_skill;
  const wo = modeTotals.without_skill;
  const wsTotal = ws.passed + ws.failed;
  const woTotal = wo.passed + wo.failed;
  const wsRate = wsTotal > 0 ? (ws.passed / wsTotal) * 100 : 0;
  const woRate = woTotal > 0 ? (wo.passed / woTotal) * 100 : 0;
  const delta = wsRate - woRate;

  console.log("=".repeat(60));
  if (wsTotal > 0) {
    console.log(`Pass rate: ${ws.passed}/${wsTotal} (${wsRate.toFixed(1)}%)`);
  }
  if (woTotal > 0) {
    console.log(`Skill delta: ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs baseline (${wo.passed}/${woTotal} = ${woRate.toFixed(1)}% without skill)`);
  }
}

function cmdHelp() {
  console.log(`Usage: node scripts/grade-evals.js <command> <iteration> [options]

Commands:
  prepare       Print grading prompts for code evals that need grading (feed to LLM)
  grade-queries Auto-grade query classification evals against ground truth
  aggregate     Read grading.json files and produce benchmark.json
  report        Print a human-readable report of all graded evals

Options:
  --iteration N    Iteration number (positional, required)
  --skill NAME     Filter by skill directory name
  --help, -h       Show this help message

Workflow:
  1. Run evals (see run-evals.js)
  2. Grade code evals: give 'prepare' output to an LLM, which writes grading.json files
  3. Grade query evals: run 'grade-queries' to auto-grade from ground truth
  4. Aggregate: run 'aggregate' to produce benchmark.json
  5. Review: run 'report' for a summary, then inspect outputs by hand`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  cmdHelp();
  process.exit(0);
}

const command = args[0];
const iteration = parseInt(args[1], 10);

if (isNaN(iteration) && command !== "--help") {
  console.error("Error: iteration number is required.\n");
  cmdHelp();
  process.exit(2);
}

const filterSkill = (() => {
  const idx = args.indexOf("--skill");
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
})();

switch (command) {
  case "prepare":
    cmdPrepare(iteration, filterSkill);
    break;
  case "grade-queries":
    cmdGradeQueries(iteration, filterSkill);
    break;
  case "aggregate":
    cmdAggregate(iteration, filterSkill);
    break;
  case "report":
    cmdReport(iteration, filterSkill);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    cmdHelp();
    process.exit(2);
}

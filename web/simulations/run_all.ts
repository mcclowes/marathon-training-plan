/**
 * Simulation orchestrator.
 * Usage: pnpm simulate [--mode complete|smoke]
 * Run from the web/ directory.
 */

// Install fixed date BEFORE any engine imports execute (engine reads new Date() at runtime)
import { installFixedDate, uninstallFixedDate } from "./rng";
installFixedDate();

import { performance } from "node:perf_hooks";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

import { generateScenarios } from "./scenario_space";
import { runAllScenarios } from "./runner";
import { extractMetrics, buildCSV } from "./metrics";
import { buildFeatureVector, clusterAll } from "./cluster";
import { generateReport } from "./report";
import { createAccumulators, buildRepCurves, stableJson } from "./extractors";
import type { ScenarioResult, MetricsResult, FeatureVector } from "./types";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { mode: "complete" | "smoke" } {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf("--mode");
  if (modeIdx !== -1 && args[modeIdx + 1]) {
    const m = args[modeIdx + 1];
    if (m === "complete" || m === "smoke") return { mode: m };
  }
  // Default to smoke for quick runs
  return { mode: "smoke" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function elapsed(start: number): string {
  return `${((performance.now() - start) / 1000).toFixed(2)}s`;
}

function writeFile(filePath: string, content: string | Buffer): void {
  fs.writeFileSync(filePath, content);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { mode } = parseArgs();
  const webDir = path.resolve(__dirname, "..");
  const outputDir = path.join(webDir, "simulations", "outputs");

  // ---------------------------------------------------------------------------
  // Step 0: Setup
  // ---------------------------------------------------------------------------
  console.log("Step 0: Setting up...");
  const step0Start = performance.now();

  ensureDir(outputDir);
  const gitHash = getGitHash();
  console.log(`  Output dir: ${outputDir}`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Git hash: ${gitHash}`);
  console.log(`  Step 0 done in ${elapsed(step0Start)}`);

  // ---------------------------------------------------------------------------
  // Step 1: Generate scenario space
  // ---------------------------------------------------------------------------
  console.log("\nStep 1: Generating scenario space...");
  const step1Start = performance.now();

  const scenarios = generateScenarios(mode);
  console.log(`  Generated ${scenarios.length} scenarios`);
  console.log(`  Step 1 done in ${elapsed(step1Start)}`);

  // ---------------------------------------------------------------------------
  // Step 2: Run scenarios
  // ---------------------------------------------------------------------------
  console.log("\nStep 2: Running scenarios...");
  const step2Start = performance.now();

  const accumulators = createAccumulators();

  const results: ScenarioResult[] = runAllScenarios(
    scenarios,
    (n, total) => {
      if (n % 50 === 0 || n === total) {
        console.log(`  Progress: ${n}/${total} (${((n / total) * 100).toFixed(0)}%)`);
      }
    },
    accumulators,
  );

  const okCount = results.filter((r) => r.status === "ok").length;
  const invalidCount = results.filter((r) => r.status === "invalid").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  console.log(`  Results: ${okCount} ok, ${invalidCount} invalid, ${errorCount} errors`);

  // Save scenarios.jsonl (without summary to save space)
  const scenariosJsonl = results
    .map((r) => JSON.stringify({ id: r.id, input: r.input, status: r.status, error: r.error, validationError: r.validationError }))
    .join("\n");
  writeFile(path.join(outputDir, "scenarios.jsonl"), scenariosJsonl);

  // Save plans_summary.jsonl (summaries for successful results)
  const plansJsonl = results
    .filter((r) => r.status === "ok" && r.summary)
    .map((r) => JSON.stringify({ id: r.id, summary: r.summary }))
    .join("\n");
  writeFile(path.join(outputDir, "plans_summary.jsonl"), plansJsonl);

  console.log(`  Saved scenarios.jsonl and plans_summary.jsonl`);
  console.log(`  Step 2 done in ${elapsed(step2Start)}`);

  // ---------------------------------------------------------------------------
  // Step 3: Extract metrics
  // ---------------------------------------------------------------------------
  console.log("\nStep 3: Extracting metrics...");
  const step3Start = performance.now();

  const metricsResults: MetricsResult[] = results
    .map((r) => extractMetrics(r))
    .filter((m): m is MetricsResult => m !== null);

  console.log(`  Extracted metrics for ${metricsResults.length} scenarios`);

  // Build input map for CSV
  const inputMap = new Map(results.map((r) => [r.id, r.input]));

  const csvContent = buildCSV(metricsResults, inputMap);
  writeFile(path.join(outputDir, "metrics.csv"), csvContent);

  console.log(`  Saved metrics.csv`);
  console.log(`  Step 3 done in ${elapsed(step3Start)}`);

  // ---------------------------------------------------------------------------
  // Step 4: Build feature vectors and clustering
  // ---------------------------------------------------------------------------
  console.log("\nStep 4: Building feature vectors and clustering...");
  const step4Start = performance.now();

  const vectors: FeatureVector[] = metricsResults.map((m) => buildFeatureVector(m));

  const successfulResults = results.filter((r) => r.status === "ok");
  const clusters = clusterAll(vectors, successfulResults, metricsResults, 0.8);

  console.log(`  Clustered ${vectors.length} feature vectors into ${clusters.length} clusters`);

  writeFile(path.join(outputDir, "clusters.json"), JSON.stringify(clusters, null, 2));

  console.log(`  Saved clusters.json`);
  console.log(`  Step 4 done in ${elapsed(step4Start)}`);

  // ---------------------------------------------------------------------------
  // Step 4.5: Write rich instrumentation files
  // ---------------------------------------------------------------------------
  console.log("\nStep 4.5: Writing rich instrumentation files...");
  const step45Start = performance.now();

  const repIds = clusters.map((c) => c.representativeId);

  writeFile(
    path.join(outputDir, "member_curves.json"),
    stableJson(accumulators.memberCurves),
  );

  writeFile(
    path.join(outputDir, "curves.json"),
    stableJson(buildRepCurves(accumulators.memberCurves, repIds)),
  );

  writeFile(
    path.join(outputDir, "sessions.json"),
    stableJson(accumulators.sessions),
  );

  writeFile(
    path.join(outputDir, "session_structures.json"),
    stableJson(accumulators.structures),
  );

  writeFile(
    path.join(outputDir, "plan_traces.json"),
    stableJson(accumulators.planTraces, 2),
  );

  writeFile(
    path.join(outputDir, "violations.json"),
    stableJson(accumulators.violations, 2),
  );

  console.log(`  Saved member_curves.json (${Object.keys(accumulators.memberCurves).length} plans)`);
  console.log(`  Saved curves.json (${repIds.length} representatives)`);
  console.log(`  Saved sessions.json (${Object.keys(accumulators.sessions).length} sessions)`);
  console.log(`  Saved session_structures.json (${Object.keys(accumulators.structures).length} structures)`);
  console.log(`  Saved plan_traces.json (${Object.keys(accumulators.planTraces).length} plans)`);
  console.log(`  Saved violations.json (${Object.keys(accumulators.violations).length} plans with violations)`);
  console.log(`  Step 4.5 done in ${elapsed(step45Start)}`);

  // ---------------------------------------------------------------------------
  // Step 5: Generate Word report
  // ---------------------------------------------------------------------------

  // Uninstall fixed date so the report gets a real timestamp
  uninstallFixedDate();

  console.log("\nStep 5: Generating Word report...");
  const step5Start = performance.now();

  const reportBuffer = await generateReport(results, metricsResults, clusters, mode, gitHash);
  writeFile(path.join(outputDir, "report.docx"), reportBuffer);

  console.log(`  Saved report.docx`);
  console.log(`  Step 5 done in ${elapsed(step5Start)}`);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n=== Simulation Complete ===");
  console.log(`Total scenarios:   ${results.length}`);
  console.log(`  ok:              ${okCount}`);
  console.log(`  invalid:         ${invalidCount}`);
  console.log(`  error:           ${errorCount}`);
  console.log(`Clusters:          ${clusters.length}`);
  console.log(`\nOutput files:`);
  console.log(`  ${path.join(outputDir, "scenarios.jsonl")}`);
  console.log(`  ${path.join(outputDir, "plans_summary.jsonl")}`);
  console.log(`  ${path.join(outputDir, "metrics.csv")}`);
  console.log(`  ${path.join(outputDir, "clusters.json")}`);
  console.log(`  ${path.join(outputDir, "curves.json")}`);
  console.log(`  ${path.join(outputDir, "member_curves.json")}`);
  console.log(`  ${path.join(outputDir, "sessions.json")}`);
  console.log(`  ${path.join(outputDir, "session_structures.json")}`);
  console.log(`  ${path.join(outputDir, "plan_traces.json")}`);
  console.log(`  ${path.join(outputDir, "violations.json")}`);
  console.log(`  ${path.join(outputDir, "report.docx")}`);
}

main().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});

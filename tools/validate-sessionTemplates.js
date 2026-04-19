#!/usr/bin/env node
/**
 * validate-sessionTemplates.js
 *
 * Validates that every session record in sessionTemplates.json satisfies:
 *   sum(Rep 1 + Rep 2 + … + Rep N) === Session Distance
 *
 * Reports mismatches and writes a JSON report to tools/reports/.
 *
 * Usage:
 *   node tools/validate-sessionTemplates.js
 *
 * Exit code:
 *   0 — all valid (or mismatches found but not fatal)
 *   1 — file read error
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const DATA_FILE = resolve(ROOT, 'data', 'sessionTemplates.json');
const REPORT_DIR  = resolve(__dirname, 'reports');
const REPORT_FILE = resolve(REPORT_DIR, 'sessionTemplateDistanceReport.json');

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
let templates;
try {
  const raw  = readFileSync(DATA_FILE, 'utf-8');
  templates  = JSON.parse(raw);
} catch (err) {
  console.error(`ERROR: Could not read ${DATA_FILE}\n${err.message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------
const mismatches = [];
const ok         = [];
let totalChecked = 0;

for (const [tableName, rows] of Object.entries(templates)) {
  if (!Array.isArray(rows)) continue;

  for (const row of rows) {
    totalChecked++;

    // Collect rep distances
    const reps = [];
    for (let n = 1; row[`Rep ${n}`] !== undefined && row[`Rep ${n}`] !== null; n++) {
      const v = Number(row[`Rep ${n}`]);
      if (!isNaN(v)) reps.push(v);
    }

    const repSum         = reps.reduce((s, v) => s + v, 0);
    const sessionDist    = row['Session Distance'] ?? null;
    const summaryNum     = row['Summary #'] ?? '?';
    const sessionNum     = row['Session #']  ?? '?';

    if (sessionDist === null) {
      mismatches.push({
        tableName, summaryNum, sessionNum,
        issue:    'missing_session_distance',
        repSum,
        sessionDistance: null,
        diff: null
      });
      continue;
    }

    if (reps.length === 0 && sessionDist > 0) {
      // No rep fields but has a session distance — skip or flag depending on preference
      // (Some rows may legitimately have no rep fields, e.g. Tempo continuous)
      ok.push({ tableName, summaryNum, sessionNum, repSum: 0, sessionDistance: sessionDist });
      continue;
    }

    const diff = repSum - Number(sessionDist);
    if (diff !== 0) {
      mismatches.push({
        tableName,
        summaryNum,
        sessionNum,
        details: row['Details'] || '',
        repSum,
        sessionDistance: Number(sessionDist),
        diff,
        reps
      });
    } else {
      ok.push({ tableName, summaryNum, sessionNum, repSum, sessionDistance: Number(sessionDist) });
    }
  }
}

// ---------------------------------------------------------------------------
// Print console report
// ---------------------------------------------------------------------------
const W = 72;
const line = '─'.repeat(W);

console.log('\n' + line);
console.log(' sessionTemplates.js — Distance Validation Report');
console.log(line);
console.log(` File  : ${DATA_FILE}`);
console.log(` Tables: ${Object.keys(templates).length}`);
console.log(` Rows  : ${totalChecked}`);
console.log(` OK    : ${ok.length}`);
console.log(` FAIL  : ${mismatches.length}`);
console.log(line);

if (mismatches.length === 0) {
  console.log(' ✓  All session distances match rep sums.\n');
} else {
  console.log(' ✗  Mismatches found:\n');
  mismatches.forEach((m, i) => {
    console.log(` [${String(i + 1).padStart(3)}] Table: ${m.tableName}`);
    console.log(`       Summary #${m.summaryNum}, Session #${m.sessionNum}`);
    if (m.issue === 'missing_session_distance') {
      console.log(`       ⚠  Missing "Session Distance" field`);
    } else {
      console.log(`       Details  : ${m.details}`);
      console.log(`       Rep Sum  : ${m.repSum} m`);
      console.log(`       Sess Dist: ${m.sessionDistance} m`);
      console.log(`       Diff     : ${m.diff > 0 ? '+' : ''}${m.diff} m`);
    }
    console.log('');
  });
}

// ---------------------------------------------------------------------------
// Write JSON report
// ---------------------------------------------------------------------------
mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  generatedAt:  new Date().toISOString(),
  dataFile:     DATA_FILE,
  totalTables:  Object.keys(templates).length,
  totalRows:    totalChecked,
  passCount:    ok.length,
  failCount:    mismatches.length,
  mismatches,
  passing: ok
};

writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(line);
console.log(` Report written to: ${REPORT_FILE}`);
console.log(line + '\n');

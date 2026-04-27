import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  TextRun,
  BorderStyle,
  WidthType,
  AlignmentType,
} from "docx";
import { execSync } from "node:child_process";
import type { ScenarioResult, MetricsResult, Cluster } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeRound(val: number, dp: number = 1): string {
  return val.toFixed(dp);
}

function getGitHash(webDir: string): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: webDir, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function makeBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  };
}

function headerCell(text: string): TableCell {
  return new TableCell({
    borders: makeBorder(),
    shading: { fill: "1F3864" },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string): TableCell {
  return new TableCell({
    borders: makeBorder(),
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
      }),
    ],
  });
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 20 })],
    spacing: { after: 120 },
  });
}

function bulletPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function emptyPara(): Paragraph {
  return new Paragraph({ children: [] });
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildTitleSection(mode: string, gitHash: string, timestamp: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: "Marathon Training Plan Engine",
          bold: true,
          size: 48,
          color: "1F3864",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Scenario Simulation Report",
          bold: true,
          size: 36,
          color: "2F5496",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Date: ${timestamp}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Git commit: ${gitHash}`, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Mode: ${mode}`, size: 22, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
  ];
}

function buildSection1(): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];

  items.push(heading1("Section 1: Repository Map & Input Schema"));

  items.push(para("Key engine files:"));

  const fileDescs = [
    ["web/lib/engine/planGenerator.ts", "Plan generation entry point — orchestrates all modules"],
    ["web/lib/engine/mileageProgression.ts", "Weekly mileage curve (performance vs finish objective)"],
    ["web/lib/engine/blockOptimizer.ts", "Block layout selection — picks block count/lengths"],
    ["web/lib/engine/distanceAllocation.ts", "Per-week long run / intensity / base split"],
    ["web/lib/engine/sessionSelector.ts", "Session template selection (uses Math.random)"],
    ["web/lib/engine/weeklySchedule.ts", "Day-of-week focus area assignment"],
    ["web/lib/engine/taperProtocol.ts", "17-day taper override"],
    ["web/lib/engine/paceEngine.ts", "Pace guidance and pace-uplift schedule"],
    ["web/lib/data/sessionTemplates.json", "14 session template tables"],
    ["web/lib/data/paceTables.json", "Pace zone lookup tables"],
    ["web/lib/engine/tuning.ts", "DEFAULT_TUNING constants (growth cap, long run cap, etc.)"],
  ];

  for (const [file, desc] of fileDescs) {
    items.push(
      new Paragraph({
        children: [
          new TextRun({ text: file + ": ", bold: true, size: 18, font: "Courier New" }),
          new TextRun({ text: desc, size: 18 }),
        ],
        bullet: { level: 0 },
        spacing: { after: 60 },
      }),
    );
  }

  items.push(emptyPara());
  items.push(para("Input parameters:", true));

  const paramTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("Parameter"),
          headerCell("Type"),
          headerCell("Range / Values"),
          headerCell("Default"),
        ],
      }),
      ...[
        ["raceDate", "string (YYYY-MM-DD)", "Any future date ≥ 56 days away", "—"],
        ["sessionsPerWeek", "number", "3 | 4 | 5", "—"],
        ["currentMileage", "number", "km/week, e.g. 25–75", "—"],
        ["targetMileage", "number", "km/week, ≥ currentMileage, e.g. 50–100", "—"],
        ["raceDistance", "string", '"Marathon"', '"Marathon"'],
        ["currentPace", "string (HH:MM:SS)", 'e.g. "04:30:00"', "—"],
        ["targetPace", "string (HH:MM:SS)", "Must be faster than currentPace", "—"],
        ["style", "string", '"Endurance" | "Speedster"', '"Endurance"'],
        ["objective", "string", '"performance" | "finish"', '"performance"'],
      ].map(
        ([name, type, range, def]) =>
          new TableRow({
            children: [
              dataCell(name),
              dataCell(type),
              dataCell(range),
              dataCell(def),
            ],
          }),
      ),
    ],
  });

  items.push(paramTable);
  return items;
}

function buildSection2(
  scenarios: ScenarioResult[],
  mode: string,
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  items.push(heading1("Section 2: Scenario Space"));

  const total = scenarios.length;
  const okCount = scenarios.filter((s) => s.status === "ok").length;
  const invalidCount = scenarios.filter((s) => s.status === "invalid").length;
  const errorCount = scenarios.filter((s) => s.status === "error").length;

  items.push(para(`Total scenarios attempted: ${total}`));
  items.push(para(`  Valid (ok): ${okCount}`));
  items.push(para(`  Invalid: ${invalidCount}`));
  items.push(para(`  Error: ${errorCount}`));
  items.push(emptyPara());

  if (mode === "complete") {
    items.push(para("Mode A (complete) parameter grid:"));
    items.push(bulletPara("styles: Endurance, Speedster (2 values)"));
    items.push(bulletPara("objectives: performance, finish (2 values)"));
    items.push(bulletPara("sessions: 3, 4, 5 (3 values)"));
    items.push(bulletPara("currentMileage: 25, 50, 75 km/wk (3 values)"));
    items.push(bulletPara("targetMileage: 50, 75, 100 km/wk (3 values, filtered: target ≥ current)"));
    items.push(bulletPara("paceCombos: 5 valid (current, target) pairs"));
    items.push(bulletPara("daysUntilRace: 84, 140, 196, 252, 308 (5 values)"));
  } else {
    items.push(para("Mode B (smoke) parameter grid:"));
    items.push(bulletPara("styles: Endurance, Speedster (2 values)"));
    items.push(bulletPara("objectives: performance, finish (2 values)"));
    items.push(bulletPara("sessions: 3, 5 (2 values)"));
    items.push(bulletPara("currentMileage: 30, 60 km/wk (2 values)"));
    items.push(bulletPara("targetMileage: 70 km/wk (1 value)"));
    items.push(bulletPara("paceCombos: 2 valid pairs"));
    items.push(bulletPara("daysUntilRace: 140, 252 (2 values)"));
  }

  items.push(emptyPara());
  items.push(para("Assumptions:", true));
  items.push(bulletPara("Reference date fixed at 2026-04-26 for all runs."));
  items.push(bulletPara("Numeric ranges inferred from engine tuning constants and typical marathon training literature."));
  items.push(bulletPara("Scenarios where daysUntilRace < 56 are marked invalid (engine minimum)."));
  items.push(bulletPara("Math.random seeded per scenario for reproducibility."));

  return items;
}

function buildSection3(clusters: Cluster[], metricsResults: MetricsResult[]): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  items.push(heading1("Section 3: Cluster Summary"));

  items.push(para(`Total clusters found: ${clusters.length}`));
  items.push(emptyPara());

  const metricsMap = new Map(metricsResults.map((m) => [m.id, m]));

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("Cluster"),
          headerCell("# Scenarios"),
          headerCell("Block Sig"),
          headerCell("Max km (min-max)"),
          headerCell("Avg WoW % (min-max)"),
          headerCell("Sessions/wk (min-max)"),
          headerCell("Hard % (min-max)"),
          headerCell("Notes"),
        ],
      }),
      ...clusters.map((c) => {
        const memberMetrics = c.memberIds
          .map((id) => metricsMap.get(id))
          .filter((m): m is MetricsResult => m !== undefined);

        const maxKms = memberMetrics.map((m) => m.maxWeeklyKm);
        const wows = memberMetrics.map((m) => m.meanWowChangePct);
        const sessions = memberMetrics.map((m) => m.avgSessionsPerWeek);
        const hardPcts = memberMetrics.map((m) => m.hardPct);

        const fmt = (arr: number[]) =>
          arr.length > 0
            ? `${Math.min(...arr).toFixed(0)}–${Math.max(...arr).toFixed(0)}`
            : "—";

        const blockSigs = [...new Set(memberMetrics.map((m) => m.blockSignature))].join(", ");

        const violations = memberMetrics.reduce((s, m) => s + m.violationsGrowthCap + m.violationsLongRunCap, 0);
        const notes = violations > 0 ? `${violations} constraint violation(s)` : "No violations";

        return new TableRow({
          children: [
            dataCell(String(c.id)),
            dataCell(String(c.memberIds.length)),
            dataCell(blockSigs),
            dataCell(fmt(maxKms)),
            dataCell(fmt(wows)),
            dataCell(fmt(sessions)),
            dataCell(fmt(hardPcts)),
            dataCell(notes),
          ],
        });
      }),
    ],
  });

  items.push(summaryTable);
  return items;
}

function buildSection4(clusters: Cluster[], scenarios: ScenarioResult[], metricsResults: MetricsResult[]): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  items.push(heading1("Section 4: Detailed Cluster Write-ups"));

  const metricsMap = new Map(metricsResults.map((m) => [m.id, m]));
  const scenarioMap = new Map(scenarios.map((s) => [s.id, s]));

  const maxClusters = Math.min(clusters.length, 20);
  const displayClusters = clusters.slice(0, maxClusters);

  if (clusters.length > maxClusters) {
    items.push(
      para(
        `Note: Only the first ${maxClusters} clusters are detailed below. ` +
        `${clusters.length - maxClusters} additional clusters are summarised in Section 3.`,
      ),
    );
  }

  for (const c of displayClusters) {
    const memberMetrics = c.memberIds
      .map((id) => metricsMap.get(id))
      .filter((m): m is MetricsResult => m !== undefined);

    const memberScenarios = c.memberIds
      .map((id) => scenarioMap.get(id))
      .filter((s): s is ScenarioResult => s !== undefined);

    const blockSigs = [...new Set(memberMetrics.map((m) => m.blockSignature))].join(", ");

    items.push(heading2(`Cluster ${c.id}: [${blockSigs}] — ${c.memberIds.length} scenarios`));

    // Parameter ranges
    items.push(para("Parameters covered:", true));
    const paramNames: (keyof typeof c.paramSummary)[] = [
      "style", "objective", "sessionsPerWeek", "currentMileage", "targetMileage",
      "currentPace", "targetPace", "daysUntilRace",
    ];

    for (const param of paramNames) {
      const vals = [...new Set(memberScenarios.map((s) => String(s.input[param as keyof typeof s.input])))];
      items.push(bulletPara(`${param}: ${vals.join(", ")}`));
    }

    if (memberMetrics.length > 0) {
      const maxKms = memberMetrics.map((m) => m.maxWeeklyKm);
      const wows = memberMetrics.map((m) => m.meanWowChangePct);
      const intPcts = memberMetrics.map((m) => m.avgIntensityPct);
      const lrPcts = memberMetrics.map((m) => m.avgLongRunPct);
      const easyPcts = memberMetrics.map((m) => m.easyPct);
      const hardPcts = memberMetrics.map((m) => m.hardPct);

      const fmt = (arr: number[], dp = 1) =>
        `${Math.min(...arr).toFixed(dp)}–${Math.max(...arr).toFixed(dp)}`;

      items.push(emptyPara());
      items.push(para("Key metrics:", true));
      items.push(bulletPara(`Max weekly km: ${fmt(maxKms)} km`));
      items.push(bulletPara(`Avg WoW% (positive): ${fmt(wows, 2)}%`));
      items.push(bulletPara(`Avg intensity %: ${fmt(intPcts)}%`));
      items.push(bulletPara(`Avg long run %: ${fmt(lrPcts)}%`));
      items.push(bulletPara(`Easy/Hard split: ${fmt(easyPcts)}% easy / ${fmt(hardPcts)}% hard`));

      const totalViolations = memberMetrics.reduce(
        (s, m) => s + m.violationsGrowthCap + m.violationsLongRunCap,
        0,
      );
      if (totalViolations > 0) {
        items.push(bulletPara(`Constraint violations: ${totalViolations} (growth cap + long run cap)`));
      }
    }

    items.push(emptyPara());
  }

  return items;
}

function buildSection5(clusters: Cluster[]): Paragraph[] {
  const items: Paragraph[] = [];
  items.push(heading1("Section 5: Material Change Log"));

  // Skip first cluster (no prior)
  const changeClusters = clusters.slice(1);

  if (changeClusters.length === 0) {
    items.push(para("Only one cluster found — no material changes to report."));
    return items;
  }

  for (const c of changeClusters) {
    const firstMemberId = c.memberIds[0] ?? "—";
    items.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Cluster ${c.id}`, bold: true, size: 20 }),
          new TextRun({ text: ` (triggered by scenario ${firstMemberId}):`, size: 20 }),
        ],
        spacing: { before: 200, after: 80 },
      }),
    );
    items.push(para(c.causeAnalysis));
    items.push(emptyPara());
  }

  return items;
}

function buildAppendixA(
  scenarios: ScenarioResult[],
  metricsResults: MetricsResult[],
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  items.push(heading1("Appendix A: Full Scenario Index"));

  const metricsMap = new Map(metricsResults.map((m) => [m.id, m]));

  const maxRows = 200;
  const displayScenarios = scenarios.slice(0, maxRows);

  if (scenarios.length > maxRows) {
    items.push(
      para(
        `Note: Showing first ${maxRows} of ${scenarios.length} scenarios. Full list is in metrics.csv.`,
      ),
    );
  }

  items.push(emptyPara());

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("ID"),
        headerCell("Style"),
        headerCell("Obj"),
        headerCell("Sess"),
        headerCell("CurKm"),
        headerCell("TgtKm"),
        headerCell("CurPace"),
        headerCell("TgtPace"),
        headerCell("Days"),
        headerCell("Status"),
        headerCell("BlockSig"),
        headerCell("MaxKm"),
        headerCell("WoW%"),
      ],
    }),
    ...displayScenarios.map((s) => {
      const m = metricsMap.get(s.id);
      return new TableRow({
        children: [
          dataCell(s.id.slice(0, 12)),
          dataCell(s.input.style.slice(0, 3)),
          dataCell(s.input.objective.slice(0, 4)),
          dataCell(String(s.input.sessionsPerWeek)),
          dataCell(String(s.input.currentMileage)),
          dataCell(String(s.input.targetMileage)),
          dataCell(s.input.currentPace),
          dataCell(s.input.targetPace),
          dataCell(String(s.input.daysUntilRace)),
          dataCell(s.status),
          dataCell(m?.blockSignature ?? "—"),
          dataCell(m ? m.maxWeeklyKm.toFixed(0) : "—"),
          dataCell(m ? m.meanWowChangePct.toFixed(1) : "—"),
        ],
      });
    }),
  ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  items.push(table);
  return items;
}

// ---------------------------------------------------------------------------
// generateReport
// ---------------------------------------------------------------------------

export async function generateReport(
  scenarios: ScenarioResult[],
  metricsResults: MetricsResult[],
  clusters: Cluster[],
  mode: string,
  gitHash: string,
): Promise<Buffer> {
  const timestamp = new Date().toISOString();

  const titleSection = buildTitleSection(mode, gitHash, timestamp);
  const section1 = buildSection1();
  const section2 = buildSection2(scenarios, mode);
  const section3 = buildSection3(clusters, metricsResults);
  const section4 = buildSection4(clusters, scenarios, metricsResults);
  const section5 = buildSection5(clusters);
  const appendixA = buildAppendixA(scenarios, metricsResults);

  const allChildren = [
    ...titleSection,
    ...section1,
    ...section2,
    ...section3,
    ...section4,
    ...section5,
    ...appendixA,
  ];

  const doc = new Document({
    title: "Marathon Training Plan Engine — Scenario Simulation Report",
    description: `Generated by simulation harness. Mode: ${mode}. Git: ${gitHash}.`,
    sections: [
      {
        children: allChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

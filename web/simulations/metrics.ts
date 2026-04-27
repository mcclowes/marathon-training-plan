import type { ScenarioResult, MetricsResult, ScenarioInput } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[], avg?: number): number {
  if (arr.length === 0) return 0;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// extractMetrics
// ---------------------------------------------------------------------------

export function extractMetrics(result: ScenarioResult): MetricsResult | null {
  if (result.status !== "ok" || !result.summary) return null;

  const { summary } = result;
  const { weeks } = summary;

  if (weeks.length === 0) return null;

  // Full km series (all weeks)
  const weeklyKm = weeks.map((w) => w.totalKm);

  const maxWeeklyKm = Math.max(...weeklyKm);
  const avgWeeklyKm = mean(weeklyKm);
  const stdWeeklyKm = std(weeklyKm, avgWeeklyKm);
  const peakToAvgRatio = avgWeeklyKm > 0 ? maxWeeklyKm / avgWeeklyKm : 0;
  const startWeeklyKm = weeklyKm[0] ?? 0;
  const endWeeklyKm = weeklyKm[weeklyKm.length - 1] ?? 0;
  const absoluteGainKm = endWeeklyKm - startWeeklyKm;

  // WoW change percentages
  const wowChangePcts: (number | null)[] = weeklyKm.map((km, i) => {
    if (i === 0) return null;
    const prev = weeklyKm[i - 1];
    if (prev === 0) return null;
    return ((km - prev) / prev) * 100;
  });

  const nonNullWow = wowChangePcts.filter((v): v is number => v !== null);
  const positiveWow = nonNullWow.filter((v) => v > 0);
  const maxWowChangePct = nonNullWow.length > 0 ? Math.max(...nonNullWow) : 0;
  const meanWowChangePct = positiveWow.length > 0 ? mean(positiveWow) : 0;
  const violationsGrowthCap = positiveWow.filter((v) => v > 10).length;

  // Non-taper training weeks for session averages and intensity calculations
  const trainingWeeks = weeks.filter((w) => !w.isTaper);

  const avgSessionsPerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.sessionsCount))
    : 0;

  const avgSpeedPerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.speedCount))
    : 0;
  const avgSePerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.seCount))
    : 0;
  const avgTempoPerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.tempoCount))
    : 0;
  const avgBasePerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.baseCount))
    : 0;
  const avgLongRunPerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.longRunCount))
    : 0;

  // Hard sessions: Speed + SE + Tempo
  const totalHardSessions = weeks.reduce(
    (s, w) => s + w.speedCount + w.seCount + w.tempoCount,
    0,
  );
  const avgHardSessionsPerWeek = trainingWeeks.length > 0
    ? mean(trainingWeeks.map((w) => w.speedCount + w.seCount + w.tempoCount))
    : 0;

  // Easy/Hard km split — speedKm/seKm/tempoKm are work-only; warmup/cooldown
  // from hard sessions is counted as easy via hardWarmupCooldownKm.
  const totalHardKm = weeks.reduce(
    (s, w) => s + w.speedKm + w.seKm + w.tempoKm,
    0,
  );
  const totalEasyKm = weeks.reduce(
    (s, w) => s + w.baseKm + w.longRunKm + w.recoveryKm + w.hardWarmupCooldownKm,
    0,
  );
  const totalTrainingKm = totalHardKm + totalEasyKm;
  const easyPct = totalTrainingKm > 0 ? (totalEasyKm / totalTrainingKm) * 100 : 0;
  const hardPct = totalTrainingKm > 0 ? (totalHardKm / totalTrainingKm) * 100 : 0;

  // Per-week intensity and long run percentages (non-taper weeks)
  const intensityPcts = trainingWeeks.map((w) => {
    const hard = w.speedKm + w.seKm + w.tempoKm;
    const total = w.totalKm;
    return total > 0 ? (hard / total) * 100 : 0;
  });
  const avgIntensityPct = mean(intensityPcts);

  const longRunPcts = trainingWeeks.map((w) => {
    return w.totalKm > 0 ? (w.longRunKm / w.totalKm) * 100 : 0;
  });
  const avgLongRunPct = mean(longRunPcts);

  const longRunKms = weeks.map((w) => w.longRunKm);
  const maxLongRunKm = Math.max(...longRunKms, 0);
  const violationsLongRunCap = longRunKms.filter((km) => km > 38).length;
  const violationsLongRunPct = weeks.filter((w) => {
    return w.totalKm > 0 && w.longRunKm / w.totalKm > 0.42;
  }).length;

  // Structure
  const taperWeeks = weeks.filter((w) => w.isTaper).length;
  const { blockCount, blockLengths, blockSignature } = summary;

  return {
    id: result.id,
    weeklyKm,
    maxWeeklyKm,
    avgWeeklyKm,
    stdWeeklyKm,
    peakToAvgRatio,
    startWeeklyKm,
    endWeeklyKm,
    absoluteGainKm,
    wowChangePcts,
    maxWowChangePct,
    meanWowChangePct,
    violationsGrowthCap,
    avgSessionsPerWeek,
    avgSpeedPerWeek,
    avgSePerWeek,
    avgTempoPerWeek,
    avgBasePerWeek,
    avgLongRunPerWeek,
    totalHardSessions,
    avgHardSessionsPerWeek,
    totalEasyKm,
    totalHardKm,
    easyPct,
    hardPct,
    avgIntensityPct,
    avgLongRunPct,
    maxLongRunKm,
    violationsLongRunCap,
    violationsLongRunPct,
    blockCount,
    blockLengths,
    blockSignature,
    totalWeeks: weeks.length,
    taperWeeks,
  };
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function metricsToCSVHeader(): string[] {
  return [
    "id",
    "style",
    "objective",
    "sessionsPerWeek",
    "currentMileage",
    "targetMileage",
    "currentPace",
    "targetPace",
    "daysUntilRace",
    "raceDate",
    "maxWeeklyKm",
    "avgWeeklyKm",
    "stdWeeklyKm",
    "peakToAvgRatio",
    "startWeeklyKm",
    "endWeeklyKm",
    "absoluteGainKm",
    "maxWowChangePct",
    "meanWowChangePct",
    "violationsGrowthCap",
    "avgSessionsPerWeek",
    "avgSpeedPerWeek",
    "avgSePerWeek",
    "avgTempoPerWeek",
    "avgBasePerWeek",
    "avgLongRunPerWeek",
    "totalHardSessions",
    "avgHardSessionsPerWeek",
    "totalEasyKm",
    "totalHardKm",
    "easyPct",
    "hardPct",
    "avgIntensityPct",
    "avgLongRunPct",
    "maxLongRunKm",
    "violationsLongRunCap",
    "violationsLongRunPct",
    "blockCount",
    "blockLengths",
    "blockSignature",
    "totalWeeks",
    "taperWeeks",
  ];
}

export function metricsToCSVRow(
  m: MetricsResult,
  input: ScenarioInput,
): Record<string, unknown> {
  return {
    id: m.id,
    style: input.style,
    objective: input.objective,
    sessionsPerWeek: input.sessionsPerWeek,
    currentMileage: input.currentMileage,
    targetMileage: input.targetMileage,
    currentPace: input.currentPace,
    targetPace: input.targetPace,
    daysUntilRace: input.daysUntilRace,
    raceDate: input.raceDate,
    maxWeeklyKm: m.maxWeeklyKm.toFixed(1),
    avgWeeklyKm: m.avgWeeklyKm.toFixed(1),
    stdWeeklyKm: m.stdWeeklyKm.toFixed(1),
    peakToAvgRatio: m.peakToAvgRatio.toFixed(3),
    startWeeklyKm: m.startWeeklyKm.toFixed(1),
    endWeeklyKm: m.endWeeklyKm.toFixed(1),
    absoluteGainKm: m.absoluteGainKm.toFixed(1),
    maxWowChangePct: m.maxWowChangePct.toFixed(2),
    meanWowChangePct: m.meanWowChangePct.toFixed(2),
    violationsGrowthCap: m.violationsGrowthCap,
    avgSessionsPerWeek: m.avgSessionsPerWeek.toFixed(2),
    avgSpeedPerWeek: m.avgSpeedPerWeek.toFixed(2),
    avgSePerWeek: m.avgSePerWeek.toFixed(2),
    avgTempoPerWeek: m.avgTempoPerWeek.toFixed(2),
    avgBasePerWeek: m.avgBasePerWeek.toFixed(2),
    avgLongRunPerWeek: m.avgLongRunPerWeek.toFixed(2),
    totalHardSessions: m.totalHardSessions,
    avgHardSessionsPerWeek: m.avgHardSessionsPerWeek.toFixed(2),
    totalEasyKm: m.totalEasyKm.toFixed(1),
    totalHardKm: m.totalHardKm.toFixed(1),
    easyPct: m.easyPct.toFixed(1),
    hardPct: m.hardPct.toFixed(1),
    avgIntensityPct: m.avgIntensityPct.toFixed(1),
    avgLongRunPct: m.avgLongRunPct.toFixed(1),
    maxLongRunKm: m.maxLongRunKm.toFixed(1),
    violationsLongRunCap: m.violationsLongRunCap,
    violationsLongRunPct: m.violationsLongRunPct,
    blockCount: m.blockCount,
    blockLengths: m.blockLengths.join("-"),
    blockSignature: m.blockSignature,
    totalWeeks: m.totalWeeks,
    taperWeeks: m.taperWeeks,
  };
}

export function buildCSV(
  metricsResults: MetricsResult[],
  inputs: Map<string, ScenarioInput>,
): string {
  const headers = metricsToCSVHeader();
  const lines: string[] = [headers.join(",")];

  for (const m of metricsResults) {
    const input = inputs.get(m.id);
    if (!input) continue;
    const row = metricsToCSVRow(m, input);
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }

  return lines.join("\n");
}

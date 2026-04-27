import type { MetricsResult, FeatureVector, Cluster, ScenarioResult } from "./types";

export const GROWTH_CAP = 0.1;
export const LONG_RUN_CAP = 38;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return ((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** Linearly interpolate arr to exactly `n` evenly-spaced sample points. */
function resampleLinear(arr: number[], n: number): number[] {
  if (arr.length === 0) return Array(n).fill(0) as number[];
  if (arr.length === 1) return Array(n).fill(arr[0]) as number[];

  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const rawIdx = t * (arr.length - 1);
    const lo = Math.floor(rawIdx);
    const hi = Math.min(lo + 1, arr.length - 1);
    const frac = rawIdx - lo;
    result.push((arr[lo]! * (1 - frac)) + (arr[hi]! * frac));
  }
  return result;
}

/** Map block signature string to a numeric code for distance computation. */
function blockSigToCode(sig: string): number {
  // Use djb2 hash reduced to [0, 1] range
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h + sig.charCodeAt(i)) >>> 0;
  }
  return (h >>> 0) % 1000;
}

function l2Distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += ((a[i]! - b[i]!) ** 2);
  }
  return Math.sqrt(sum);
}

// ---------------------------------------------------------------------------
// buildFeatureVector
// ---------------------------------------------------------------------------

export function buildFeatureVector(m: MetricsResult): FeatureVector {
  const resampled = resampleLinear(m.weeklyKm, 10);
  const maxVal = Math.max(...resampled, 1);
  const normalized = resampled.map((v) => v / maxVal);

  return {
    id: m.id,
    mileageSeries: normalized,
    maxWeeklyKm: m.maxWeeklyKm,
    meanWowChangePct: m.meanWowChangePct,
    avgSessionsPerWeek: m.avgSessionsPerWeek,
    avgIntensityPct: m.avgIntensityPct,
    avgLongRunPct: m.avgLongRunPct,
    easyPct: m.easyPct,
    blockCount: m.blockCount,
    blockSigCode: blockSigToCode(m.blockSignature),
  };
}

// ---------------------------------------------------------------------------
// computeDistance
// ---------------------------------------------------------------------------

export function computeDistance(a: FeatureVector, b: FeatureVector): number {
  const seriesDist = l2Distance(a.mileageSeries, b.mileageSeries) * 3.0;
  const maxKmDist = (Math.abs(a.maxWeeklyKm - b.maxWeeklyKm) / 100) * 1.5;
  const wowDist = (Math.abs(a.meanWowChangePct - b.meanWowChangePct) / 10) * 1.0;
  const sessionsDist = (Math.abs(a.avgSessionsPerWeek - b.avgSessionsPerWeek) / 2) * 1.0;
  const intensityDist = (Math.abs(a.avgIntensityPct - b.avgIntensityPct) / 100) * 1.0;
  const longRunDist = (Math.abs(a.avgLongRunPct - b.avgLongRunPct) / 100) * 0.5;
  const easyDist = (Math.abs(a.easyPct - b.easyPct) / 100) * 0.5;
  const blockCountDist = (Math.abs(a.blockCount - b.blockCount) / 5) * 2.0;
  const blockSigDist = (a.blockSigCode !== b.blockSigCode ? 1 : 0) * 1.0;

  return (
    seriesDist +
    maxKmDist +
    wowDist +
    sessionsDist +
    intensityDist +
    longRunDist +
    easyDist +
    blockCountDist +
    blockSigDist
  );
}

// ---------------------------------------------------------------------------
// Centroid computation
// ---------------------------------------------------------------------------

function computeCentroid(members: FeatureVector[]): FeatureVector {
  if (members.length === 0) {
    return {
      id: "",
      mileageSeries: Array(10).fill(0) as number[],
      maxWeeklyKm: 0,
      meanWowChangePct: 0,
      avgSessionsPerWeek: 0,
      avgIntensityPct: 0,
      avgLongRunPct: 0,
      easyPct: 0,
      blockCount: 0,
      blockSigCode: 0,
    };
  }

  const n = members.length;
  const seriesLen = members[0]!.mileageSeries.length;
  const centroidSeries = Array(seriesLen).fill(0) as number[];
  for (const m of members) {
    for (let i = 0; i < seriesLen; i++) {
      centroidSeries[i]! += (m.mileageSeries[i] ?? 0) / n;
    }
  }

  return {
    id: "",
    mileageSeries: centroidSeries,
    maxWeeklyKm: members.reduce((s, m) => s + m.maxWeeklyKm, 0) / n,
    meanWowChangePct: members.reduce((s, m) => s + m.meanWowChangePct, 0) / n,
    avgSessionsPerWeek: members.reduce((s, m) => s + m.avgSessionsPerWeek, 0) / n,
    avgIntensityPct: members.reduce((s, m) => s + m.avgIntensityPct, 0) / n,
    avgLongRunPct: members.reduce((s, m) => s + m.avgLongRunPct, 0) / n,
    easyPct: members.reduce((s, m) => s + m.easyPct, 0) / n,
    blockCount: members.reduce((s, m) => s + m.blockCount, 0) / n,
    blockSigCode: members[0]!.blockSigCode, // use first member's code
  };
}

// ---------------------------------------------------------------------------
// greedyCluster
// ---------------------------------------------------------------------------

interface InternalCluster {
  id: number;
  representativeId: string;
  memberIds: string[];
  memberVectors: FeatureVector[];
  centroid: FeatureVector;
}

export function greedyCluster(
  vectors: FeatureVector[],
  results: ScenarioResult[],
  threshold: number = 0.8,
): Cluster[] {
  const clusters: InternalCluster[] = [];
  const resultMap = new Map(results.map((r) => [r.id, r]));

  for (const vec of vectors) {
    if (clusters.length === 0) {
      // First cluster
      clusters.push({
        id: 0,
        representativeId: vec.id,
        memberIds: [vec.id],
        memberVectors: [vec],
        centroid: computeCentroid([vec]),
      });
      continue;
    }

    // Find nearest cluster by distance to centroid
    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let ci = 0; ci < clusters.length; ci++) {
      const dist = computeDistance(vec, clusters[ci]!.centroid);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = ci;
      }
    }

    if (nearestDist < threshold) {
      // Assign to nearest cluster
      const cluster = clusters[nearestIdx]!;
      cluster.memberIds.push(vec.id);
      cluster.memberVectors.push(vec);
      cluster.centroid = computeCentroid(cluster.memberVectors);
    } else {
      // Create new cluster
      clusters.push({
        id: clusters.length,
        representativeId: vec.id,
        memberIds: [vec.id],
        memberVectors: [vec],
        centroid: computeCentroid([vec]),
      });
    }
  }

  // Build final Cluster objects with stats
  return clusters.map((c, ci) => {
    // Build paramSummary from representative scenario
    const repResult = resultMap.get(c.representativeId);
    const paramSummary: Record<string, string | number> = {};
    if (repResult) {
      const inp = repResult.input;
      paramSummary["style"] = inp.style;
      paramSummary["objective"] = inp.objective;
      paramSummary["sessionsPerWeek"] = inp.sessionsPerWeek;
      paramSummary["currentMileage"] = inp.currentMileage;
      paramSummary["targetMileage"] = inp.targetMileage;
      paramSummary["currentPace"] = inp.currentPace;
      paramSummary["targetPace"] = inp.targetPace;
      paramSummary["daysUntilRace"] = inp.daysUntilRace;
    }

    // Compute metric stats from member vectors
    const metricStats: Record<string, { min: number; median: number; max: number }> = {};
    const statsKeys: (keyof FeatureVector)[] = [
      "maxWeeklyKm",
      "meanWowChangePct",
      "avgSessionsPerWeek",
      "avgIntensityPct",
      "avgLongRunPct",
      "easyPct",
      "blockCount",
    ];

    for (const key of statsKeys) {
      const vals = c.memberVectors.map((v) => v[key] as number);
      metricStats[key] = {
        min: Math.min(...vals),
        median: median(vals),
        max: Math.max(...vals),
      };
    }

    // Find nearest other cluster
    let nearestOtherIdx: number | undefined;
    let nearestOtherDist = Infinity;
    for (let ci2 = 0; ci2 < clusters.length; ci2++) {
      if (ci2 === ci) continue;
      const dist = computeDistance(c.centroid, clusters[ci2]!.centroid);
      if (dist < nearestOtherDist) {
        nearestOtherDist = dist;
        nearestOtherIdx = ci2;
      }
    }

    return {
      id: ci,
      representativeId: c.representativeId,
      memberIds: c.memberIds,
      paramSummary,
      metricStats,
      causeAnalysis: "", // filled in by attributeCause
      nearestOtherClusterId: nearestOtherIdx,
    };
  });
}

// ---------------------------------------------------------------------------
// attributeCause
// ---------------------------------------------------------------------------

export function attributeCause(
  newCluster: Cluster,
  nearestCluster: Cluster | null,
  scenarios: ScenarioResult[],
  metricsArr: MetricsResult[],
): string {
  const repScenario = scenarios.find((s) => s.id === newCluster.representativeId);
  const repMetrics = metricsArr.find((m) => m.id === newCluster.representativeId);

  if (!nearestCluster || !repScenario || !repMetrics) {
    return "First cluster — baseline plan configuration.";
  }

  const nearestRepScenario = scenarios.find((s) => s.id === nearestCluster.representativeId);
  const nearestRepMetrics = metricsArr.find((m) => m.id === nearestCluster.representativeId);

  if (!nearestRepScenario || !nearestRepMetrics) {
    return "Input parameter change caused a different mileage curve or session composition.";
  }

  const reasons: string[] = [];

  // Block count difference
  if (repMetrics.blockCount !== nearestRepMetrics.blockCount) {
    reasons.push(
      `Block optimiser chose different block count/lengths. daysUntilRace crossed a layout boundary in blockOptimizer.ts:optimizeBlocks. Block signature changed from ${nearestRepMetrics.blockSignature} to ${repMetrics.blockSignature}.`,
    );
  }

  // Session count difference
  if (Math.abs(repMetrics.avgSessionsPerWeek - nearestRepMetrics.avgSessionsPerWeek) > 0.5) {
    reasons.push(
      `Session count changed (clampSessionCount in planGenerator.ts). Weekly mileage crossed sessionsClampUpMileage (60 km) or sessionsClampDownMileage (60 km).`,
    );
  }

  // Long run cap engagement
  if (repMetrics.violationsLongRunCap > 0 && nearestRepMetrics.violationsLongRunCap === 0) {
    reasons.push(
      `Long run cap (38 km, tuning.ts:longRunCapKm) engaged.`,
    );
  }

  // Growth cap engagement
  if (repMetrics.violationsGrowthCap > 0 && nearestRepMetrics.violationsGrowthCap === 0) {
    reasons.push(
      `Weekly growth cap (10%, tuning.ts:weeklyGrowthCap) engaged.`,
    );
  }

  // Objective change
  if (repScenario.input.objective !== nearestRepScenario.input.objective) {
    reasons.push(
      `Training objective changed (performance/finish), altering blockMax interpolation in mileageProgression.ts:progressWeeklyMileageByBlocks.`,
    );
  }

  // Style change
  if (repScenario.input.style !== nearestRepScenario.input.style) {
    reasons.push(
      `Pace style changed (Endurance/Speedster), selecting different pace tables in paceEngine.ts.`,
    );
  }

  if (reasons.length === 0) {
    return "Input parameter change caused a different mileage curve or session composition.";
  }

  return reasons.join(" ");
}

// ---------------------------------------------------------------------------
// clusterAll
// ---------------------------------------------------------------------------

export function clusterAll(
  vectors: FeatureVector[],
  results: ScenarioResult[],
  metrics: MetricsResult[],
  threshold: number = 0.8,
): Cluster[] {
  const clusters = greedyCluster(vectors, results, threshold);

  // Fill in cause analysis for each cluster
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const nearestCluster =
      cluster.nearestOtherClusterId !== undefined
        ? (clusters[cluster.nearestOtherClusterId] ?? null)
        : null;

    // For the first cluster and clusters after, attempt attribution
    // Use the nearest cluster as the "prior" cluster
    const priorCluster = i === 0 ? null : (clusters[i - 1] ?? null);

    cluster.causeAnalysis = attributeCause(
      cluster,
      priorCluster,
      results,
      metrics,
    );
  }

  return clusters;
}

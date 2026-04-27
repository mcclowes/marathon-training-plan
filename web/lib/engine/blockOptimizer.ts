/**
 * ---
 * purpose: Pick the best pyramidal/uniform block layout (sizes 8/10/12 weeks) to fit days-until-race, scoring against slack + block-count bonuses.
 * outputs:
 *   - BlockInfo - blocks, planBlockCount, slackDays, taperStartDayIndex, planBlockLength
 * related:
 *   - ./planGenerator.ts - consumes BlockInfo to drive week iteration
 *   - ./tuning.ts - TuningParams.blockSizes / slackTarget / pyramidalBonus
 * ---
 */
import type { Block, BlockInfo } from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export const SESSION_WEEKS: Record<number, number> = { 8: 6, 10: 8, 12: 10 };
export const DELOAD_WEEKS = 2;

export function isPyramidal(lengths: number[]): boolean {
  if (lengths.length <= 1) return true;

  const maxVal = Math.max(...lengths);
  const peakStart = lengths.indexOf(maxVal);
  const peakEnd = lengths.lastIndexOf(maxVal);

  for (let i = 1; i <= peakStart; i++) {
    const diff = lengths[i] - lengths[i - 1];
    if (diff < 0) return false;
    if (diff > 2) return false;
  }

  for (let i = peakStart; i <= peakEnd; i++) {
    if (lengths[i] !== maxVal) return false;
  }

  for (let i = peakEnd + 1; i < lengths.length; i++) {
    if (lengths[i] > lengths[i - 1]) return false;
  }

  return true;
}

export function isUniform(lengths: number[]): boolean {
  return lengths.length > 0 && lengths.every((l) => l === lengths[0]);
}

export function scoreCandidate(
  lengths: number[],
  daysUntilRace: number,
  tuning: TuningParams,
): number {
  const totalDays = lengths.reduce((s, l) => s + l * 7, 0);
  const slack = daysUntilRace - totalDays;
  const { slackTargetMin, slackTargetMax } = tuning;
  const slackMid = (slackTargetMin + slackTargetMax) / 2;

  let score = 0;

  if (slack >= slackTargetMin && slack <= slackTargetMax) {
    score += 80 - Math.abs(slack - slackMid);
  } else {
    const dist = slack < slackTargetMin ? slackTargetMin - slack : slack - slackTargetMax;
    score -= dist * 15;
  }

  score += tuning.blockCountBonus[lengths.length] ?? 0;

  if (isPyramidal(lengths)) score += tuning.pyramidalBonus;
  else if (isUniform(lengths)) score += tuning.uniformBonus;

  score -= lengths.length * 2;

  return score;
}

export function generateCandidates(count: number, sizes: readonly number[]): number[][] {
  if (count === 0) return [[]];
  const shorter = generateCandidates(count - 1, sizes);
  const results: number[][] = [];
  for (const p of shorter) {
    for (const size of sizes) {
      results.push([...p, size]);
    }
  }
  return results;
}

export function optimizeBlocks(
  maxDayCount: number,
  tuning: TuningParams = DEFAULT_TUNING,
): BlockInfo {
  const daysUntilRace = maxDayCount;
  const taperStartDayIndex = maxDayCount - tuning.taperDays;

  let bestLengths: number[] | null = null;
  let bestScore = -Infinity;

  for (let count = 1; count <= 5; count++) {
    for (const lengths of generateCandidates(count, tuning.blockSizes)) {
      const totalDays = lengths.reduce((s, l) => s + l * 7, 0);
      if (totalDays > daysUntilRace) continue;
      if (totalDays < daysUntilRace - 28) continue;
      if (!isPyramidal(lengths) && !isUniform(lengths)) continue;

      const score = scoreCandidate(lengths, daysUntilRace, tuning);
      if (score > bestScore) {
        bestScore = score;
        bestLengths = lengths;
      }
    }
  }

  if (!bestLengths) bestLengths = [tuning.blockSizes[0] ?? 8];

  const blocks: Block[] = [];
  let dayIndex = 0;
  for (let i = 0; i < bestLengths.length; i++) {
    const bw = bestLengths[i];
    const sw = tuning.sessionWeeksByBlockSize[bw] ?? bw - 2;
    const dw = tuning.deloadWeeks;
    blocks.push({
      blockIndex: i,
      blockWeeks: bw,
      sessionWeeks: sw,
      deloadWeeks: dw,
      startDayIndex: dayIndex,
      endDayIndex: dayIndex + bw * 7 - 1,
    });
    dayIndex += bw * 7;
  }

  const totalBlockDays = bestLengths.reduce((s, l) => s + l * 7, 0);
  const slackDays = daysUntilRace - totalBlockDays;

  return {
    blocks,
    planBlockCount: bestLengths.length,
    totalBlockDays,
    slackDays,
    taperStartDayIndex,
    planBlockLength: Math.max(...bestLengths),
    planType: "Candidate",
    startCount: slackDays,
  };
}

// ---------------------------------------------------------------------------
// Block layout trace (for plan_traces.json)
// ---------------------------------------------------------------------------

export interface BlockCandidateTrace {
  signature: string;
  score: number;
  slack: number;
  isPyramidal: boolean;
  isUniform: boolean;
}

export interface BlockLayoutTrace {
  chosenSignature: string;
  chosenScore: number;
  blockBoundaryWeeks: number[];
  totalWeeksAvailable: number;
  taperWeeksReserved: number;
  remainingForBlocks: number;
  rule: string;
  allCandidates: BlockCandidateTrace[];
}

export function getBlockLayoutTrace(
  maxDayCount: number,
  tuning: TuningParams = DEFAULT_TUNING,
): BlockLayoutTrace {
  const daysUntilRace = maxDayCount;
  const taperWeeksReserved = Math.ceil(tuning.taperDays / 7);
  const totalWeeksAvailable = Math.floor(daysUntilRace / 7);

  const candidates: BlockCandidateTrace[] = [];
  let bestLengths: number[] | null = null;
  let bestScore = -Infinity;

  for (let count = 1; count <= 5; count++) {
    for (const lengths of generateCandidates(count, tuning.blockSizes)) {
      const totalDays = lengths.reduce((s, l) => s + l * 7, 0);
      if (totalDays > daysUntilRace) continue;
      if (totalDays < daysUntilRace - 28) continue;
      if (!isPyramidal(lengths) && !isUniform(lengths)) continue;

      const slack = daysUntilRace - totalDays;
      const score = scoreCandidate(lengths, daysUntilRace, tuning);
      candidates.push({
        signature: lengths.join("-"),
        score: Math.round(score * 10) / 10,
        slack,
        isPyramidal: isPyramidal(lengths),
        isUniform: isUniform(lengths),
      });

      if (score > bestScore) {
        bestScore = score;
        bestLengths = lengths;
      }
    }
  }

  if (!bestLengths) bestLengths = [tuning.blockSizes[0] ?? 8];

  const chosenSig = bestLengths.join("-");
  candidates.sort((a, b) => b.score - a.score);

  // Block boundary weeks (first week of each block after the first)
  let cumWeeks = 0;
  const boundaryWeeks: number[] = [];
  for (let i = 0; i < bestLengths.length - 1; i++) {
    cumWeeks += bestLengths[i]!;
    boundaryWeeks.push(cumWeeks + 1);
  }

  const shape = bestLengths.length === 1
    ? "single-block"
    : isPyramidal(bestLengths) ? "pyramidal" : "uniform";
  const rule = `blockOptimizer.ts:optimizeBlocks @ daysUntilRace=${daysUntilRace} → ${bestLengths.length}-block ${shape} layout [${chosenSig}], slack=${daysUntilRace - bestLengths.reduce((s, l) => s + l * 7, 0)}d`;

  return {
    chosenSignature: chosenSig,
    chosenScore: Math.round(bestScore * 10) / 10,
    blockBoundaryWeeks: boundaryWeeks,
    totalWeeksAvailable,
    taperWeeksReserved,
    remainingForBlocks: totalWeeksAvailable - taperWeeksReserved,
    rule,
    allCandidates: candidates,
  };
}

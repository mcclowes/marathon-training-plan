/**
 * ---
 * purpose: Project week-by-week mileage across all blocks — ramp weeks grow geometrically up to the block's achievable peak, then 2 deload weeks step down before the next block starts.
 * outputs:
 *   - WeeklyMileage[] - flat list across all blocks with weekMileage, isDeload, isPeak, blockIndex, weekInBlock, blockMaxMileage
 * related:
 *   - ./planGenerator.ts - called after optimizeBlocks to produce the mileage curve
 *   - ./blockOptimizer.ts - supplies the Block shape consumed here
 *   - ./tuning.ts - weeklyGrowthCap / perWeekGrowthCeiling / peakWeeksPerBlock / deload1Factor / deload2Factor
 * ---
 */
import type { Block, TrainingObjective, WeeklyMileage } from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export interface GrowthRateParams {
  planBlockCount: number;
  planBlockLength: number;
  maxDayCount: number;
  startingDistance: number;
  targetDistance: number;
}

export function calculateGrowthRate(
  params: GrowthRateParams,
  tuning: TuningParams = DEFAULT_TUNING,
): number {
  const {
    planBlockCount,
    planBlockLength,
    maxDayCount,
    startingDistance,
    targetDistance,
  } = params;

  let K: number;
  if (maxDayCount <= 100) K = 0;
  else if (maxDayCount <= 210) K = 5;
  else K = 10;

  const totalDaysForMultiplier = planBlockCount * planBlockLength - K;
  const increaseWeeks =
    totalDaysForMultiplier -
    Math.floor(totalDaysForMultiplier / (planBlockCount + 2)) * 2;

  const Mx = targetDistance / (0.9 * 0.9);
  let G = Math.exp((Math.log(Mx) - Math.log(startingDistance)) / increaseWeeks) - 1;
  if (G > tuning.weeklyGrowthCap) G = tuning.weeklyGrowthCap;
  return G;
}

export function progressWeeklyMileage(
  currentMileage: number,
  G: number,
  targetDistance: number,
  isDeload: boolean,
): number {
  if (isDeload) {
    return Math.min(targetDistance + 10, currentMileage - currentMileage * G);
  }
  return Math.min(targetDistance + 10, currentMileage + currentMileage * G);
}

export function progressWeeklyMileageByBlocks(
  startMileage: number,
  userTargetMaxMileage: number,
  blocks: Pick<Block, "blockIndex" | "blockWeeks" | "sessionWeeks" | "deloadWeeks">[],
  tuning: TuningParams = DEFAULT_TUNING,
  objective: TrainingObjective = "performance",
): WeeklyMileage[] {
  if (!blocks || blocks.length === 0) return [];

  const weeklyData: WeeklyMileage[] = [];
  let currentMileage = startMileage;
  const peakWeeks = tuning.peakWeeksPerBlock;
  const ceiling = tuning.perWeekGrowthCeiling;
  const maxRate = tuning.weeklyGrowthCap;
  const blockCount = blocks.length;
  const isFinish = objective === "finish";

  for (let bi = 0; bi < blockCount; bi++) {
    const block = blocks[bi];
    const rampWeeks = block.sessionWeeks - peakWeeks;

    // "finish": interpolate blockMax so only the final block reaches userTargetMaxMileage.
    // "performance": every block pushes as high as it can (original behaviour).
    const blockCap = isFinish
      ? startMileage + (userTargetMaxMileage - startMileage) * (bi + 1) / blockCount
      : userTargetMaxMileage;

    const achievableMax =
      rampWeeks > 0 ? currentMileage * Math.pow(ceiling, rampWeeks) : currentMileage;
    const blockMax = Math.min(blockCap, Math.max(currentMileage, achievableMax));

    let r = 0;
    if (rampWeeks > 0 && currentMileage > 0 && blockMax > currentMileage) {
      r = Math.pow(blockMax / currentMileage, 1 / rampWeeks) - 1;
      r = Math.min(maxRate, r);
    }

    let weekMileage = Math.round(currentMileage);

    for (let w = 0; w < rampWeeks; w++) {
      const maxNext = Math.min(
        Math.round(blockMax),
        Math.floor(weekMileage * ceiling),
      );
      weekMileage = Math.min(maxNext, Math.round(weekMileage * (1 + r)));
      weeklyData.push({
        weekMileage,
        isDeload: false,
        isPeak: false,
        blockIndex: bi,
        weekInBlock: w + 1,
        blockMaxMileage: Math.round(blockMax),
      });
    }

    const roundedPeak = Math.round(blockMax);

    for (let p = 0; p < peakWeeks; p++) {
      weeklyData.push({
        weekMileage: roundedPeak,
        isDeload: false,
        isPeak: true,
        blockIndex: bi,
        weekInBlock: rampWeeks + p + 1,
        blockMaxMileage: roundedPeak,
      });
    }

    const deload1 = Math.round(roundedPeak * tuning.deload1Factor);
    const deload2 = Math.round(roundedPeak * tuning.deload2Factor);

    weeklyData.push({
      weekMileage: deload1,
      isDeload: true,
      isPeak: false,
      blockIndex: bi,
      weekInBlock: block.sessionWeeks + 1,
      blockMaxMileage: roundedPeak,
    });
    weeklyData.push({
      weekMileage: deload2,
      isDeload: true,
      isPeak: false,
      blockIndex: bi,
      weekInBlock: block.sessionWeeks + 2,
      blockMaxMileage: roundedPeak,
    });

    // Determine start mileage for the next block.
    // If the next block can reach userTargetMaxMileage, start more conservatively (80%);
    // otherwise give a higher base (90%) to preserve fitness across the deload.
    if (bi < blockCount - 1) {
      const nextBlock = blocks[bi + 1];
      const nextRampWeeks = nextBlock.sessionWeeks - peakWeeks;
      const candidateStart = roundedPeak * 0.9;
      const nextAchievable =
        nextRampWeeks > 0 ? candidateStart * Math.pow(ceiling, nextRampWeeks) : candidateStart;
      const nextWillHitCap = nextAchievable >= userTargetMaxMileage;
      currentMileage = nextWillHitCap ? roundedPeak * 0.8 : candidateStart;
    } else {
      currentMileage = deload2;
    }
  }

  return weeklyData;
}

import type { Block, WeeklyMileage } from "./types";

export interface GrowthRateParams {
  planBlockCount: number;
  planBlockLength: number;
  maxDayCount: number;
  startingDistance: number;
  targetDistance: number;
}

export function calculateGrowthRate(params: GrowthRateParams): number {
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
  if (G > 0.1) G = 0.1;
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
): WeeklyMileage[] {
  if (!blocks || blocks.length === 0) return [];

  const weeklyData: WeeklyMileage[] = [];
  let currentMileage = startMileage;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const rampWeeks = block.sessionWeeks - 2;

    const achievableMax =
      rampWeeks > 0 ? currentMileage * Math.pow(1.1, rampWeeks) : currentMileage;
    const blockMax = Math.min(
      userTargetMaxMileage,
      Math.max(currentMileage, achievableMax),
    );

    let r = 0;
    if (rampWeeks > 0 && currentMileage > 0 && blockMax > currentMileage) {
      r = Math.pow(blockMax / currentMileage, 1 / rampWeeks) - 1;
      r = Math.min(0.1, r);
    }

    let weekMileage = Math.round(currentMileage);

    for (let w = 0; w < rampWeeks; w++) {
      const maxNext = Math.min(
        Math.round(blockMax),
        Math.floor(weekMileage * 1.1),
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

    for (let p = 0; p < 2; p++) {
      weeklyData.push({
        weekMileage: roundedPeak,
        isDeload: false,
        isPeak: true,
        blockIndex: bi,
        weekInBlock: rampWeeks + p + 1,
        blockMaxMileage: roundedPeak,
      });
    }

    const deload1 = Math.round(roundedPeak * 0.8);
    const deload2 = Math.round(roundedPeak * 0.7);

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

    currentMileage = deload2;
  }

  return weeklyData;
}

/**
 * mileageProgression.js — Per-block weekly mileage progression
 *
 * Block structure (by blockWeeks):
 *   8-week  : ramp weeks 1–4, peak weeks 5–6,  deload weeks 7–8
 *   10-week : ramp weeks 1–6, peak weeks 7–8,  deload weeks 9–10
 *   12-week : ramp weeks 1–8, peak weeks 9–10, deload weeks 11–12
 *
 * Rules:
 *   - Weekly increase must never exceed +10% vs the previous week
 *   - Weekly total must never exceed userTargetMaxMileage
 *   - Each block hits its blockMaxMileage for exactly 2 peak weeks before deload
 *   - blockMaxMileage emerges naturally: each block achieves the most possible
 *     with ≤10% per-week growth from the post-deload starting point, capped at userTargetMaxMileage
 *   - Deload: week 1 = blockPeak × 0.80, week 2 = blockPeak × 0.70
 */

// ---------------------------------------------------------------------------
// Legacy single-rate helpers (kept for backward-compat + old tests)
// ---------------------------------------------------------------------------

export function calculateGrowthRate(params) {
  const { planBlockCount, planBlockLength, maxDayCount, startingDistance, targetDistance } = params;

  let K;
  if (maxDayCount <= 100)      K = 0;
  else if (maxDayCount <= 210) K = 5;
  else                         K = 10;

  const totalDaysForMultiplier = (planBlockCount * planBlockLength) - K;
  const increaseWeeks = totalDaysForMultiplier
    - Math.floor(totalDaysForMultiplier / (planBlockCount + 2)) * 2;

  const Mx = targetDistance / (0.9 * 0.9);
  let G = Math.exp((Math.log(Mx) - Math.log(startingDistance)) / increaseWeeks) - 1;
  if (G > 0.1) G = 0.1;
  return G;
}

export function progressWeeklyMileage(currentMileage, G, targetDistance, isDeload) {
  if (isDeload) {
    return Math.min(targetDistance + 10, currentMileage - currentMileage * G);
  }
  return Math.min(targetDistance + 10, currentMileage + currentMileage * G);
}

// ---------------------------------------------------------------------------
// New per-block progression
// ---------------------------------------------------------------------------

/**
 * progressWeeklyMileageByBlocks
 *
 * Computes a deterministic weekly mileage array for the full plan.
 *
 * @param {number} startMileage           user's current weekly km
 * @param {number} userTargetMaxMileage   user's maximum weekly km target
 * @param {Array<{blockIndex,blockWeeks,sessionWeeks,deloadWeeks}>} blocks
 *
 * @returns {Array<{
 *   weekMileage: number,
 *   isDeload: boolean,
 *   isPeak: boolean,
 *   blockIndex: number,
 *   weekInBlock: number,
 *   blockMaxMileage: number
 * }>}
 */
export function progressWeeklyMileageByBlocks(startMileage, userTargetMaxMileage, blocks) {
  if (!blocks || blocks.length === 0) return [];

  const weeklyData = [];
  let currentMileage = startMileage; // carried forward from one block to the next

  for (let bi = 0; bi < blocks.length; bi++) {
    const block     = blocks[bi];
    const rampWeeks = block.sessionWeeks - 2; // weeks before the 2-week peak

    // Block peak = the most that can be achieved from currentMileage in rampWeeks
    // with ≤10% per-week growth, capped at userTargetMaxMileage.
    // This naturally produces a progressive ramp across blocks.
    const achievableMax = rampWeeks > 0
      ? currentMileage * Math.pow(1.1, rampWeeks)
      : currentMileage;
    const blockMax = Math.min(userTargetMaxMileage, Math.max(currentMileage, achievableMax));

    // Per-block compound rate to reach blockMax in rampWeeks
    let r = 0;
    if (rampWeeks > 0 && currentMileage > 0 && blockMax > currentMileage) {
      r = Math.pow(blockMax / currentMileage, 1 / rampWeeks) - 1;
      r = Math.min(0.1, r); // hard cap
    }

    // Work in rounded integers to keep the ≤10% rule unambiguous
    let weekMileage = Math.round(currentMileage);

    // --- Ramp weeks ---
    for (let w = 0; w < rampWeeks; w++) {
      // Hard cap: next week ≤ floor(prev * 1.10) so the rounded value never exceeds 10%
      const maxNext = Math.min(
        Math.round(blockMax),
        Math.floor(weekMileage * 1.10)
      );
      weekMileage = Math.min(maxNext, Math.round(weekMileage * (1 + r)));
      weeklyData.push({
        weekMileage,
        isDeload:        false,
        isPeak:          false,
        blockIndex:      bi,
        weekInBlock:     w + 1,
        blockMaxMileage: Math.round(blockMax)
      });
    }

    const roundedPeak = Math.round(blockMax);

    // --- Peak weeks (exactly 2) ---
    for (let p = 0; p < 2; p++) {
      weeklyData.push({
        weekMileage:     roundedPeak,
        isDeload:        false,
        isPeak:          true,
        blockIndex:      bi,
        weekInBlock:     rampWeeks + p + 1,
        blockMaxMileage: roundedPeak
      });
    }

    // --- Deload weeks ---
    const deload1 = Math.round(roundedPeak * 0.80);  // −20%
    const deload2 = Math.round(roundedPeak * 0.70);  // −30%

    weeklyData.push({
      weekMileage:     deload1,
      isDeload:        true,
      isPeak:          false,
      blockIndex:      bi,
      weekInBlock:     block.sessionWeeks + 1,
      blockMaxMileage: roundedPeak
    });
    weeklyData.push({
      weekMileage:     deload2,
      isDeload:        true,
      isPeak:          false,
      blockIndex:      bi,
      weekInBlock:     block.sessionWeeks + 2,
      blockMaxMileage: roundedPeak
    });

    // Next block starts from the deload-2 level (natural recovery base)
    currentMileage = deload2;
  }

  return weeklyData;
}

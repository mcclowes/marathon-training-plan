/**
 * blockOptimizer.js — Optimal training block sequence finder
 *
 * Valid blocks:
 *   8-week  = 6 session weeks + 2 deload weeks
 *   10-week = 8 session weeks + 2 deload weeks
 *   12-week = 10 session weeks + 2 deload weeks
 *
 * Optimisation goals (priority order):
 *   1. Prefer 3 blocks per plan
 *   2. Prefer pyramidal shape:
 *      - ascending phase: increases ≤ +2 weeks between adjacent blocks
 *      - single peak (or plateau at max), then free descent
 *   3. Uniform-length is acceptable fallback if pyramidal impossible
 *   4. Cap total blocks at 5
 *   5. totalBlockDays as close as possible to [daysUntilRace−10, daysUntilRace−5]
 *   6. taperStartDayIndex = maxDayCount − 17  (never changes)
 */

const BLOCK_SIZES = [8, 10, 12];

/** session weeks per block length */
export const SESSION_WEEKS = { 8: 6, 10: 8, 12: 10 };
export const DELOAD_WEEKS = 2;

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the sequence is pyramidal:
 *   - values ascend (or plateau) from 0 to the peak, with increments ≤ +2 weeks
 *   - single peak region (all equal to max)
 *   - values descend (or plateau) freely after the peak
 *
 * Valid:   [8,10,12,8], [8,10,10,8], [8,8,10,12,10]
 * Invalid: [8,12,12,10] (+4 jump), [8,12,8,10,10] (valley then rise)
 */
export function isPyramidal(lengths) {
  if (lengths.length <= 1) return true;

  const maxVal    = Math.max(...lengths);
  const peakStart = lengths.indexOf(maxVal);
  const peakEnd   = lengths.lastIndexOf(maxVal);

  // Ascending phase: index 0 → peakStart  (no drops, no jumps > +2)
  for (let i = 1; i <= peakStart; i++) {
    const diff = lengths[i] - lengths[i - 1];
    if (diff < 0) return false;  // decrease before peak
    if (diff > 2) return false;  // increment > +2 weeks
  }

  // Peak plateau: every element between peakStart and peakEnd must equal maxVal
  for (let i = peakStart; i <= peakEnd; i++) {
    if (lengths[i] !== maxVal) return false;
  }

  // Descending phase: peakEnd → end  (no increases allowed)
  for (let i = peakEnd + 1; i < lengths.length; i++) {
    if (lengths[i] > lengths[i - 1]) return false;
  }

  return true;
}

/** All blocks the same length (uniform fallback) */
export function isUniform(lengths) {
  return lengths.length > 0 && lengths.every(l => l === lengths[0]);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a candidate sequence — higher is better.
 *
 * +80  slack in ideal [5,10] days (minus deviation from midpoint 7.5)
 * −15× per-day distance from ideal range when outside it
 * +50/+30/+25/+15/+10  for 3/2/4/1/5 blocks
 * +40  pyramidal,  +15 uniform
 * −2×  per-block count penalty
 */
function scoreCandidate(lengths, daysUntilRace) {
  const totalDays = lengths.reduce((s, l) => s + l * 7, 0);
  const slack     = daysUntilRace - totalDays;

  let score = 0;

  // Slack proximity to ideal [5,10]
  if (slack >= 5 && slack <= 10) {
    score += 80 - Math.abs(slack - 7.5);
  } else {
    const dist = slack < 5 ? 5 - slack : slack - 10;
    score -= dist * 15;
  }

  // Block count preference
  const countBonus = { 1: 15, 2: 30, 3: 50, 4: 25, 5: 10 };
  score += countBonus[lengths.length] || 0;

  // Shape preference
  if (isPyramidal(lengths))    score += 40;
  else if (isUniform(lengths)) score += 15;

  // Small per-block penalty
  score -= lengths.length * 2;

  return score;
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------

/**
 * Generate all ordered sequences of a given length from BLOCK_SIZES (with replacement).
 * Across all lengths 1..5 this yields at most 3+9+27+81+243 = 363 candidates.
 */
function generateCandidates(count) {
  if (count === 0) return [[]];
  const shorter = generateCandidates(count - 1);
  const results = [];
  for (const p of shorter) {
    for (const size of BLOCK_SIZES) {
      results.push([...p, size]);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * optimizeBlocks — find the best-fit block sequence for this plan.
 *
 * @param {number} maxDayCount  total days in the date scaffold (= daysUntilRace)
 * @param {Date}   _lastDate    kept for API compatibility; not used internally
 *
 * @returns {{
 *   blocks: Array<{blockIndex,blockWeeks,sessionWeeks,deloadWeeks,startDayIndex,endDayIndex}>,
 *   planBlockCount: number,
 *   totalBlockDays: number,
 *   slackDays: number,
 *   taperStartDayIndex: number,
 *   planBlockLength: number,  // max block length (legacy compat)
 *   planType: string,         // 'Candidate' (legacy compat)
 *   startCount: number        // slackDays (legacy compat)
 * }}
 */
export function optimizeBlocks(maxDayCount, _lastDate) {
  const daysUntilRace      = maxDayCount;
  const taperStartDayIndex = maxDayCount - 17;

  let bestLengths = null;
  let bestScore   = -Infinity;

  for (let count = 1; count <= 5; count++) {
    for (const lengths of generateCandidates(count)) {
      const totalDays = lengths.reduce((s, l) => s + l * 7, 0);

      // Hard exclude: can't exceed total days; don't go more than 28 days short
      if (totalDays > daysUntilRace)      continue;
      if (totalDays < daysUntilRace - 28) continue;

      // Shape filter: must be pyramidal OR uniform (uniform is a special case of pyramidal
      // but we check both for explicitness)
      if (!isPyramidal(lengths) && !isUniform(lengths)) continue;

      const score = scoreCandidate(lengths, daysUntilRace);
      if (score > bestScore) {
        bestScore   = score;
        bestLengths = lengths;
      }
    }
  }

  // Emergency fallback for very short plans where nothing fits
  if (!bestLengths) {
    bestLengths = [8];
  }

  // Build blocks array with cumulative day indices
  const blocks = [];
  let dayIndex = 0;
  for (let i = 0; i < bestLengths.length; i++) {
    const bw = bestLengths[i];
    const sw = SESSION_WEEKS[bw] ?? (bw - 2);
    const dw = DELOAD_WEEKS;
    blocks.push({
      blockIndex:    i,
      blockWeeks:    bw,
      sessionWeeks:  sw,
      deloadWeeks:   dw,
      startDayIndex: dayIndex,
      endDayIndex:   dayIndex + bw * 7 - 1
    });
    dayIndex += bw * 7;
  }

  const totalBlockDays = bestLengths.reduce((s, l) => s + l * 7, 0);
  const slackDays      = daysUntilRace - totalBlockDays;

  return {
    blocks,
    planBlockCount:   bestLengths.length,
    totalBlockDays,
    slackDays,
    taperStartDayIndex,
    // Legacy compat
    planBlockLength: Math.max(...bestLengths),
    planType:        'Candidate',
    startCount:      slackDays
  };
}

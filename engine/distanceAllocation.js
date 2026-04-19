/**
 * distanceAllocation.js — Weekly km split into long run, intensity, and base
 *
 * Rules:
 *   Long run   ≤ 38 km AND ≤ 40% of total weekly km
 *   Intensity  = 20% of total weekly km (rounded to nearest km)
 *   Base       = remaining pool (totalWeeklyKm − longRun − intensity)
 *
 *   Warm-ups/warm-downs count as BASE mileage (not intensity).
 *   Long runs count as BASE mileage.
 *   Intensity uses session distance ONLY (not total distance incl. warm-up/down).
 *
 *   Intensity target per session (Tue/Thu split 50/50):
 *     intensityPerSessionMeters = round(intensityWeeklyKm × 1000 / 2)
 *
 *   Base per run:
 *     baseWeeklyKm split evenly across base run sessions
 *     3 sessions → 1 base run  (Thu)
 *     4 sessions → 2 base runs (Thu + Sat)
 *     5 sessions → 3 base runs (Wed + Thu-easy + Sat)
 */

/**
 * calculateDistances
 *
 * @param {number} totalWeeklyKm    total planned weekly km
 * @param {number} sessionsCount    training sessions this week (3, 4 or 5)
 * @param {number} [_excessMileage] legacy param — ignored; kept for API compat
 *
 * @returns {{
 *   longRunKm: number,
 *   intensityWeeklyKm: number,
 *   baseWeeklyKm: number,
 *   intensityPerSessionMeters: number,
 *   basePerRunKm: number,
 *   longRunMileage: number,          // alias
 *   intensityMileage: number,        // alias = intensityPerSessionMeters
 *   baseMileage: number,             // alias = basePerRunKm
 *   wednesdayBaseMileage: number
 * }}
 */
export function calculateDistances(totalWeeklyKm, sessionsCount = 3, _excessMileage = 0) {
  const total = Math.max(0, totalWeeklyKm);

  // Long run: hard cap 38 km, max 40% of total
  const longRunKm = Math.round(Math.min(38, total * 0.40));

  // Intensity: exactly 20% of total (rounded)
  const intensityWeeklyKm = Math.round(total * 0.20);

  // Base absorbs any rounding remainder so the three pools sum exactly
  const baseWeeklyKm = Math.round(total - longRunKm - intensityWeeklyKm);

  // Intensity is split 50/50 across Tue + Thu — expressed in meters for template matching
  const intensityPerSessionMeters = Math.round((intensityWeeklyKm * 1000) / 2);

  // Number of base-run sessions depends on sessions per week
  let baseRunCount = 1;
  if (sessionsCount >= 4) baseRunCount = 2;
  if (sessionsCount >= 5) baseRunCount = 3;

  const basePerRunKm = baseRunCount > 0
    ? Math.max(1, Math.round(baseWeeklyKm / baseRunCount))
    : 0;

  return {
    longRunKm,
    intensityWeeklyKm,
    baseWeeklyKm,
    intensityPerSessionMeters,
    basePerRunKm,
    // Legacy aliases (consumed by weeklySchedule.js, planGenerator.js)
    longRunMileage:       longRunKm,
    intensityMileage:     intensityPerSessionMeters,
    baseMileage:          basePerRunKm,
    wednesdayBaseMileage: sessionsCount >= 5 ? basePerRunKm : 0
  };
}

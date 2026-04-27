/**
 * ---
 * purpose: Split a weekly km budget into long run, intensity, and base allocations (with per-run base split by sessions-per-week).
 * outputs:
 *   - DistanceAllocation - longRunKm, intensityWeeklyKm, baseWeeklyKm, intensityPerSessionMeters, basePerRunKm, and legacy-name aliases
 * related:
 *   - ./planGenerator.ts - called per day to compute target distances
 *   - ./weeklySchedule.ts - consumes baseMileage/longRunMileage for rest-day copy
 *   - ./tuning.ts - longRunFraction / longRunCapKm / intensityFraction
 * ---
 */
import type { DistanceAllocation } from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export function calculateDistances(
  totalWeeklyKm: number,
  sessionsCount: number = 3,
  tuning: TuningParams = DEFAULT_TUNING,
): DistanceAllocation {
  const total = Math.max(0, totalWeeklyKm);

  const longRunKm = Math.round(
    Math.min(tuning.longRunCapKm, total * tuning.longRunFraction),
  );
  const intensityWeeklyKm = Math.round(total * tuning.intensityFraction);
  // intensityFraction targets work km only. Each of the 2 intensity sessions
  // adds 2.5km warmup + 2.5km cooldown on top — deduct that overhead so base
  // stays accurate and total weekly km hits the planned target.
  const intensityOverheadKm = 2 * (2.5 + 2.5);
  const baseWeeklyKm = Math.round(Math.max(0, total - longRunKm - intensityWeeklyKm - intensityOverheadKm));

  const intensityPerSessionMeters = Math.round((intensityWeeklyKm * 1000) / 2);

  let baseRunCount = 1;
  if (sessionsCount >= 4) baseRunCount = 2;
  if (sessionsCount >= 5) baseRunCount = 3;

  const basePerRunKm =
    baseRunCount > 0 ? Math.max(1, Math.round(baseWeeklyKm / baseRunCount)) : 0;

  return {
    longRunKm,
    intensityWeeklyKm,
    baseWeeklyKm,
    intensityPerSessionMeters,
    basePerRunKm,
    longRunMileage: longRunKm,
    intensityMileage: intensityPerSessionMeters,
    baseMileage: basePerRunKm,
    wednesdayBaseMileage: sessionsCount >= 5 ? basePerRunKm : 0,
  };
}

import { generateTrainingPlan } from "@/lib/engine/planGenerator";
import { dataStore } from "@/lib/data";
import { patchRandom, unpatchRandom } from "./rng";
import type { ScenarioInput, ScenarioResult, PlanSummary, WeekSummary } from "./types";
import type { GeneratedPlan } from "@/lib/engine/types";
import type { ExtractionAccumulators } from "./types";
import { extractFromPlan } from "./extractors";

// ---------------------------------------------------------------------------
// buildPlanSummary
// ---------------------------------------------------------------------------

export function buildPlanSummary(plan: GeneratedPlan): PlanSummary {
  const { planMeta, weeks } = plan;

  const blockLengths = planMeta.blocks.map((b) => b.blockWeeks);
  const blockSignature = blockLengths.join("-");

  const weekSummaries: WeekSummary[] = weeks.map((week) => {
    let sessionsCount = 0;
    let restDays = 0;
    let speedCount = 0;
    let seCount = 0;
    let tempoCount = 0;
    let baseCount = 0;
    let longRunCount = 0;
    let recoveryCount = 0;
    let speedKm = 0;
    let seKm = 0;
    let tempoKm = 0;
    let baseKm = 0;
    let longRunKm = 0;
    let recoveryKm = 0;
    let hardWarmupCooldownKm = 0;

    for (const day of week.days) {
      const fa = day.focusArea;
      const totalKm = day.totalDistance || 0;

      if (fa === "Rest" || fa === "Pre-Race Shakeout" || fa === "Race Day") {
        restDays++;
      } else if (fa === "Speed" || fa === "Speed Endurance" || fa === "Tempo") {
        // Only count actual work km as hard; warmup/cooldown is easy
        const wcKm = day.warmUp + day.warmDown;
        const workKm = Math.max(0, totalKm - wcKm);
        hardWarmupCooldownKm += wcKm;
        sessionsCount++;
        if (fa === "Speed") { speedCount++; speedKm += workKm; }
        else if (fa === "Speed Endurance") { seCount++; seKm += workKm; }
        else { tempoCount++; tempoKm += workKm; }
      } else if (fa === "Base") {
        sessionsCount++;
        baseCount++;
        baseKm += totalKm;
      } else if (fa === "Long Run") {
        sessionsCount++;
        longRunCount++;
        longRunKm += totalKm;
      } else if (fa === "Recovery") {
        sessionsCount++;
        recoveryCount++;
        recoveryKm += totalKm;
      } else {
        // Unknown focus area — treat as rest
        restDays++;
      }
    }

    return {
      weekNumber: week.weekNumber,
      blockNumber: week.blockNumber,
      isTaper: week.isTaper,
      isDeload: week.isDeload,
      totalKm: week.totalMileage,
      sessionsCount,
      restDays,
      speedCount,
      seCount,
      tempoCount,
      baseCount,
      longRunCount,
      recoveryCount,
      speedKm: Math.round(speedKm * 10) / 10,
      seKm: Math.round(seKm * 10) / 10,
      tempoKm: Math.round(tempoKm * 10) / 10,
      baseKm: Math.round(baseKm * 10) / 10,
      longRunKm: Math.round(longRunKm * 10) / 10,
      recoveryKm: Math.round(recoveryKm * 10) / 10,
      hardWarmupCooldownKm: Math.round(hardWarmupCooldownKm * 10) / 10,
    };
  });

  return {
    totalWeeks: planMeta.totalWeeks,
    blockCount: planMeta.planBlockCount,
    blockLengths,
    blockSignature,
    planBlockLength: planMeta.planBlockLength,
    slackDays: planMeta.slackDays,
    taperStartDayIndex: planMeta.taperStartDayIndex,
    weeks: weekSummaries,
  };
}

// ---------------------------------------------------------------------------
// runScenario
// ---------------------------------------------------------------------------

export function runScenario(
  input: ScenarioInput,
  accumulators?: ExtractionAccumulators,
): ScenarioResult {
  // Basic validation
  if (input.daysUntilRace < 56) {
    return {
      id: input.id,
      input,
      status: "invalid",
      validationError: `daysUntilRace (${input.daysUntilRace}) is less than minimum 56 days`,
    };
  }

  patchRandom(input.seed);
  try {
    const plan = generateTrainingPlan(
      {
        raceDate: input.raceDate,
        sessionsPerWeek: input.sessionsPerWeek,
        currentMileage: input.currentMileage,
        targetMileage: input.targetMileage,
        raceDistance: input.raceDistance,
        currentPace: input.currentPace,
        targetPace: input.targetPace,
        style: input.style,
        objective: input.objective,
      },
      dataStore,
    );

    // Extract rich output data while plan is in scope, before discarding it
    if (accumulators) extractFromPlan(plan, input, accumulators);

    const summary = buildPlanSummary(plan);

    return {
      id: input.id,
      input,
      status: "ok",
      summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: input.id,
      input,
      status: "error",
      error: message,
    };
  } finally {
    unpatchRandom();
  }
}

// ---------------------------------------------------------------------------
// runAllScenarios
// ---------------------------------------------------------------------------

export function runAllScenarios(
  scenarios: ScenarioInput[],
  onProgress?: (n: number, total: number) => void,
  accumulators?: ExtractionAccumulators,
): ScenarioResult[] {
  const results: ScenarioResult[] = [];
  const total = scenarios.length;

  for (let i = 0; i < total; i++) {
    results.push(runScenario(scenarios[i]!, accumulators));
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}

import type { ScenarioInput, PaceStyle, TrainingObjective } from "./types";

export const FIXED_REFERENCE_DATE = "2026-04-26";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function paceToSeconds(pace: string): number {
  const parts = pace.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/** djb2 hash → stable positive integer */
function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function makeId(params: {
  style: string;
  objective: string;
  sessions: number;
  currentMileage: number;
  targetMileage: number;
  currentPace: string;
  targetPace: string;
  daysUntilRace: number;
}): string {
  const raw = [
    params.style,
    params.objective,
    params.sessions,
    params.currentMileage,
    params.targetMileage,
    params.currentPace,
    params.targetPace,
    params.daysUntilRace,
  ].join("|");
  const hash = djb2Hash(raw).toString(16).padStart(8, "0");
  return `s_${hash}`;
}

// ---------------------------------------------------------------------------
// Parameter grids
// ---------------------------------------------------------------------------

const PACE_COMBOS: [string, string][] = [
  ["04:30:00", "04:00:00"],
  ["04:30:00", "03:30:00"],
  ["04:00:00", "03:30:00"],
  ["04:00:00", "03:00:00"],
  ["03:30:00", "03:00:00"],
];

const PACE_COMBOS_SMOKE: [string, string][] = [
  ["04:00:00", "03:30:00"],
  ["03:30:00", "03:00:00"],
];

interface GridParams {
  styles: PaceStyle[];
  objectives: TrainingObjective[];
  sessions: number[];
  currentMileages: number[];
  targetMileages: number[];
  paceCombos: [string, string][];
  daysUntilRace: number[];
}

const GRID_COMPLETE: GridParams = {
  styles: ["Endurance", "Speedster"],
  objectives: ["performance", "finish"],
  sessions: [3, 4, 5],
  currentMileages: [25, 50, 75],
  targetMileages: [50, 75, 100],
  paceCombos: PACE_COMBOS,
  daysUntilRace: [84, 140, 196, 252, 308],
};

const GRID_SMOKE: GridParams = {
  styles: ["Endurance", "Speedster"],
  objectives: ["performance", "finish"],
  sessions: [3, 5],
  currentMileages: [30, 60],
  targetMileages: [70],
  paceCombos: PACE_COMBOS_SMOKE,
  daysUntilRace: [140, 252],
};

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

function buildScenarios(grid: GridParams): ScenarioInput[] {
  const scenarios: ScenarioInput[] = [];

  for (const style of grid.styles) {
    for (const objective of grid.objectives) {
      for (const sessions of grid.sessions) {
        for (const currentMileage of grid.currentMileages) {
          for (const targetMileage of grid.targetMileages) {
            if (targetMileage < currentMileage) continue;
            for (const [currentPace, targetPace] of grid.paceCombos) {
              // Validate pace: targetPace must be strictly faster (fewer seconds)
              if (paceToSeconds(targetPace) >= paceToSeconds(currentPace)) continue;
              for (const daysUntilRace of grid.daysUntilRace) {
                const id = makeId({
                  style,
                  objective,
                  sessions,
                  currentMileage,
                  targetMileage,
                  currentPace,
                  targetPace,
                  daysUntilRace,
                });
                scenarios.push({
                  id,
                  seed: 0, // will be assigned after sorting
                  daysUntilRace,
                  raceDate: addDays(FIXED_REFERENCE_DATE, daysUntilRace),
                  sessionsPerWeek: sessions,
                  currentMileage,
                  targetMileage,
                  currentPace,
                  targetPace,
                  style,
                  objective,
                  raceDistance: "Marathon",
                });
              }
            }
          }
        }
      }
    }
  }

  // Sort stably by all params for determinism
  scenarios.sort((a, b) => {
    const fields: (keyof ScenarioInput)[] = [
      "style",
      "objective",
      "sessionsPerWeek",
      "currentMileage",
      "targetMileage",
      "currentPace",
      "targetPace",
      "daysUntilRace",
    ];
    for (const f of fields) {
      const av = a[f];
      const bv = b[f];
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });

  // Assign seeds based on sorted index
  for (let i = 0; i < scenarios.length; i++) {
    scenarios[i].seed = i;
  }

  return scenarios;
}

export function generateScenarios(mode: "complete" | "smoke"): ScenarioInput[] {
  return buildScenarios(mode === "smoke" ? GRID_SMOKE : GRID_COMPLETE);
}

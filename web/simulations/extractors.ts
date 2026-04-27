/**
 * Extraction functions that transform a GeneratedPlan into the five new
 * simulation output formats.  Called once per plan during the run loop so
 * the full plan can be discarded after extraction.
 */

import { getBlockLayoutTrace } from "@/lib/engine/blockOptimizer";
import type { GeneratedPlan } from "@/lib/engine/types";
import type { ScenarioInput } from "./types";
import type {
  CurveEntry,
  ExtractionAccumulators,
  GrowthCapViolation,
  LongRunCapViolation,
  MainSetFormat,
  PlanTrace,
  RepEntry,
  SessionEntry,
  SessionFocusType,
  SessionStructureEntry,
  ViolationEntry,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROWTH_CAP_PCT = 10;
const LONG_RUN_ABS_CAP_KM = 38;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** JS getDay() (0=Sun) → ISO weekday (1=Mon … 7=Sun) */
function isoWeekday(weekDay: number): number {
  return weekDay === 0 ? 7 : weekDay;
}

/** Round to 1 decimal place */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Round to nearest integer */
function ri(n: number): number {
  return Math.round(n);
}

function focusToType(focusArea: string): SessionFocusType {
  switch (focusArea) {
    case "Speed": return "speed";
    case "Speed Endurance": return "se";
    case "Tempo": return "tempo";
    case "Long Run": return "lr";
    case "Recovery": return "recovery";
    default: return "base";
  }
}

function isHardSession(focusArea: string): boolean {
  return focusArea === "Speed" || focusArea === "Speed Endurance" || focusArea === "Tempo";
}

function purposeForFocus(focusArea: string, summary: string): string {
  switch (focusArea) {
    case "Speed": return "VO₂max · neuromuscular development";
    case "Speed Endurance": return "lactate threshold · race-pace conditioning";
    case "Tempo": return "lactate threshold · aerobic capacity";
    case "Long Run": return summary || "aerobic endurance · fat adaptation";
    case "Recovery": return "active recovery · aerobic maintenance";
    default: return "aerobic base · easy zone-2 endurance";
  }
}

function intensityPctForFocus(focusArea: string): number {
  switch (focusArea) {
    case "Speed": return 92;
    case "Speed Endurance": return 88;
    case "Tempo": return 83;
    case "Long Run": return 72;
    case "Recovery": return 60;
    default: return 65; // Base
  }
}

/** Estimate session duration in minutes from total km and focus area. */
function estimateDurationMin(totalKm: number, focusArea: string): number {
  // min/km by session type (rough approximation)
  let minPerKm: number;
  switch (focusArea) {
    case "Speed": minPerKm = 5.0; break;
    case "Speed Endurance": minPerKm = 5.0; break;
    case "Tempo": minPerKm = 4.5; break;
    case "Long Run": minPerKm = 5.5; break;
    case "Recovery": minPerKm = 7.0; break;
    default: minPerKm = 6.0; // Base
  }
  return ri(totalKm * minPerKm);
}

/**
 * Extract a representative pace string from the day's paces guidance string.
 * Paces is a multi-line string like:
 *   "800's @ 03:30 to 03:45 min/km\n1000's @ 03:45 to 04:00 min/km"
 * Returns the pace portion of the first line, or "varies" if multiple paces,
 * or "--:--" if empty.
 */
function extractTargetPace(paces: string, focusArea: string): string {
  if (!paces) return "--:--";
  const lines = paces.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "--:--";

  // Extract the pace token after "@": "03:30 to 03:45 min/km" → "03:30-03:45"
  const pacePattern = /@ ([\d:]+)(?: to ([\d:]+))?/;
  const first = lines[0];
  const match = first?.match(pacePattern);
  if (!match) return focusArea === "Base" || focusArea === "Recovery" ? "easy" : "varies";

  const upper = match[1] ?? "--:--";
  const lower = match[2];

  if (lines.length > 1) {
    // Multiple distance-specific paces — call it "varies"
    return "varies";
  }

  return lower ? `${upper}-${lower}` : upper;
}

// ---------------------------------------------------------------------------
// Recovery string parsing
// ---------------------------------------------------------------------------

function inferRecoveryType(recoveries: string): "jog" | "walk" | "float" | "rest" {
  const lower = recoveries.toLowerCase();
  if (lower.includes("jog")) return "jog";
  if (lower.includes("walk")) return "walk";
  if (lower.includes("float")) return "float";
  if (lower.includes("full") || lower.includes("rest") || lower.includes("n/a") || !recoveries) return "rest";
  return "jog"; // default for interval sessions
}

/**
 * Parse the primary recovery duration in seconds.
 * Handles: "90 seconds", "2min", "60s", "90 seconds for 600s, 60 for 400s, ..."
 * When a distance-specific entry exists for distanceM, prefer it.
 */
function parseRecoveryDuration(recoveries: string, distanceM: number): number {
  if (!recoveries || recoveries === "N/A") return 0;

  // Try distance-specific: "90 seconds for 600s" or "90s for 600"
  const parts = recoveries.split(",").map((p) => p.trim());
  for (const part of parts) {
    const m = part.match(/(\d+)\s*(?:seconds?|s|min)\s+for\s+(\d+)/i);
    if (m) {
      const secs = parseInt(m[1]!) * (part.toLowerCase().includes("min") && !part.toLowerCase().includes("seconds") ? 60 : 1);
      const dist = parseInt(m[2]!);
      if (dist === distanceM) return secs;
    }
  }

  // Fallback: first numeric value with a time unit
  const minMatch = recoveries.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]!) * 60;

  const secMatch = recoveries.match(/(\d+)\s*(?:seconds?|s)\b/i);
  if (secMatch) return parseInt(secMatch[1]!);

  return 90; // sensible default
}

/** Estimate jog/walk recovery distance from duration and type */
function recoveryDistanceFromDuration(durationSec: number, type: "jog" | "walk" | "float" | "rest"): number {
  if (type === "rest") return 0;
  const mPerSec = type === "walk" ? 1.3 : 2.2; // jog/float ~8 km/h, walk ~5 km/h
  return ri(durationSec * mPerSec);
}

// ---------------------------------------------------------------------------
// Session structure helpers
// ---------------------------------------------------------------------------

function buildSetStructure(reps: number[]): string {
  if (reps.length === 0) return "";
  const allSame = reps.every((r) => r === reps[0]);
  if (allSame) return `${reps.length}×${reps[0]}m`;

  // Group consecutive same distances
  const groups: Array<{ dist: number; count: number }> = [];
  let curr = { dist: reps[0]!, count: 1 };
  for (let i = 1; i < reps.length; i++) {
    if (reps[i] === curr.dist) {
      curr.count++;
    } else {
      groups.push(curr);
      curr = { dist: reps[i]!, count: 1 };
    }
  }
  groups.push(curr);
  return groups.map((g) => (g.count === 1 ? `${g.dist}m` : `${g.count}×${g.dist}m`)).join(" + ");
}

function inferMainSetFormat(focusArea: string, reps: number[]): MainSetFormat {
  if (focusArea === "Tempo" && reps.length === 0) return "tempo_continuous";
  if (focusArea === "Long Run") return "progression";
  if (reps.length === 0) return "fartlek";
  const maxRep = Math.max(...reps);
  return maxRep >= 800 ? "cruise_intervals" : "intervals";
}

function buildRepPace(paces: string, distanceM: number): string {
  // Look for a line matching this distance in the paces guidance
  const lines = paces.split("\n");
  const distKw: Record<number, string> = {
    100: "100", 200: "200", 300: "300", 400: "400", 500: "500", 600: "600",
    800: "800", 1000: "1000", 1200: "1200", 1600: "1600",
    2000: "2000", 3000: "3000", 4000: "4000", 5000: "5000",
  };
  const kw = distKw[distanceM];
  if (kw) {
    const line = lines.find((l) => l.includes(kw));
    if (line) {
      const m = line.match(/@ ([\d:]+)(?: to ([\d:]+))?/);
      if (m) {
        const upper = m[1]!;
        const lower = m[2];
        return lower ? `${upper}-${lower}` : upper;
      }
    }
  }
  // Fallback: use the first pace line
  return extractTargetPace(paces, "Speed");
}

function repDurationSec(distanceM: number, paceStr: string): number {
  // paceStr: "03:30" or "03:30-03:45" (min:sec per km)
  const primary = paceStr.split("-")[0] ?? "05:00";
  const parts = primary.split(":");
  if (parts.length !== 2) return ri((distanceM / 1000) * 300); // fallback 5min/km
  const minPerKm = parseInt(parts[0]!) + parseInt(parts[1]!) / 60;
  return ri((distanceM / 1000) * minPerKm * 60);
}

// ---------------------------------------------------------------------------
// Block position helpers
// ---------------------------------------------------------------------------

/** Returns { positionInBlock, blockLength } for a given week number. */
function blockPosition(
  weekNumber: number,
  planBlocks: Array<{ blockWeeks: number }>,
): { positionInBlock: number; blockLength: number } {
  let cumulative = 0;
  for (const b of planBlocks) {
    if (weekNumber <= cumulative + b.blockWeeks) {
      return {
        positionInBlock: weekNumber - cumulative,
        blockLength: b.blockWeeks,
      };
    }
    cumulative += b.blockWeeks;
  }
  // Slack weeks beyond all blocks
  return { positionInBlock: weekNumber - cumulative, blockLength: 0 };
}

// ---------------------------------------------------------------------------
// Main extraction entry point
// ---------------------------------------------------------------------------

export function createAccumulators(): ExtractionAccumulators {
  return {
    memberCurves: {},
    sessions: {},
    structures: {},
    planTraces: {},
    violations: {},
  };
}

export function extractFromPlan(
  plan: GeneratedPlan,
  scenario: ScenarioInput,
  acc: ExtractionAccumulators,
): void {
  const { planMeta, weeks, days } = plan;
  const sid = scenario.id;

  // ------------------------------------------------------------------
  // 1. Violations
  // ------------------------------------------------------------------
  const weekViolations: ViolationEntry[] = [];
  for (let i = 0; i < weeks.length; i++) {
    const curr = weeks[i]!;
    const prev = weeks[i - 1];

    if (prev && prev.totalMileage > 0) {
      const wowPct = ((curr.totalMileage - prev.totalMileage) / prev.totalMileage) * 100;
      if (wowPct > GROWTH_CAP_PCT) {
        const v: GrowthCapViolation = {
          type: "growthCap",
          week: curr.weekNumber,
          thisKm: r1(curr.totalMileage),
          prevKm: r1(prev.totalMileage),
          wowChangePct: r1(wowPct),
          capPct: GROWTH_CAP_PCT,
          exceededByPct: r1(wowPct - GROWTH_CAP_PCT),
        };
        weekViolations.push(v);
      }
    }

    const longRunKm = curr.days.reduce(
      (s, d) => s + (d.focusArea === "Long Run" ? (d.totalDistance ?? 0) : 0),
      0,
    );
    if (longRunKm > LONG_RUN_ABS_CAP_KM) {
      const v: LongRunCapViolation = {
        type: "longRunCap",
        week: curr.weekNumber,
        longRunKm: r1(longRunKm),
        weeklyKm: r1(curr.totalMileage),
        longRunPct: r1(curr.totalMileage > 0 ? (longRunKm / curr.totalMileage) * 100 : 0),
        capPct: LONG_RUN_ABS_CAP_KM,
        exceededByPct: r1(longRunKm - LONG_RUN_ABS_CAP_KM),
      };
      weekViolations.push(v);
    }
  }
  if (weekViolations.length > 0) acc.violations[sid] = weekViolations;

  // Build per-week violation lookup for curve entries
  const growthCapWeeks = new Set(
    weekViolations.filter((v) => v.type === "growthCap").map((v) => v.week),
  );
  const longRunCapWeeks = new Set(
    weekViolations.filter((v) => v.type === "longRunCap").map((v) => v.week),
  );

  // ------------------------------------------------------------------
  // 2. Sessions + structures (iterate days once)
  // ------------------------------------------------------------------
  const weekSessionRefs: Map<number, string[]> = new Map();

  for (const day of days) {
    const fa = day.focusArea;
    if (day.isRest || fa === "Rest" || fa === "Race Day" || fa === "Pre-Race Shakeout") continue;

    const iso = isoWeekday(day.weekDay);
    const sessId = `sess_${sid}_w${day.weekNumber}_d${iso}`;

    if (!weekSessionRefs.has(day.weekNumber)) weekSessionRefs.set(day.weekNumber, []);
    weekSessionRefs.get(day.weekNumber)!.push(sessId);

    const hard = isHardSession(fa);
    const hasReps = day.reps && day.reps.length > 0;
    const structId = hard && hasReps ? `struct_${sid}_w${day.weekNumber}_d${iso}` : null;

    // Session entry
    const totalKm = r1(day.totalDistance ?? 0);
    const workKm = hard
      ? r1(Math.max(0, (day.totalDistance ?? 0) - day.warmUp - day.warmDown))
      : totalKm;
    const sessEntry: SessionEntry = {
      scenarioId: sid,
      week: day.weekNumber,
      dayOfWeek: iso,
      type: focusToType(fa),
      purpose: purposeForFocus(fa, day.sessionSummary),
      plannedKm: totalKm,
      workKm,
      plannedDurationMin: estimateDurationMin(totalKm, fa),
      targetPace: extractTargetPace(day.paces, fa),
      targetIntensityPct: intensityPctForFocus(fa),
      isHard: hard,
      structureRefs: structId ? [structId] : null,
    };
    acc.sessions[sessId] = sessEntry;

    // Structure entry for hard sessions with rep data
    if (structId && hasReps) {
      const reps = day.reps;
      const recType = inferRecoveryType(day.recoveries);

      const repEntries: RepEntry[] = reps.map((distM, idx) => {
        const pace = buildRepPace(day.paces, distM);
        const durSec = repDurationSec(distM, pace);
        const recSec = parseRecoveryDuration(day.recoveries, distM);
        const recDist = recoveryDistanceFromDuration(recSec, recType);
        return {
          repNum: idx + 1,
          distanceM: distM,
          targetPace: pace,
          targetDurationSec: durSec,
          recoveryType: recType,
          recoveryDistanceM: recDist,
          recoveryDurationSec: recSec,
        };
      });

      const totalWorkKm = r1(reps.reduce((s, d) => s + d / 1000, 0));
      const totalRecoveryKm = r1(repEntries.reduce((s, r) => s + r.recoveryDistanceM / 1000, 0));
      const format = inferMainSetFormat(fa, reps);

      const structEntry: SessionStructureEntry = {
        sessionId: sessId,
        warmupKm: r1(day.warmUp ?? 0),
        warmupMin: ri((day.warmUp ?? 0) * 6),
        mainSet: {
          format,
          totalReps: reps.length,
          setStructure: buildSetStructure(reps),
          reps: repEntries,
          totalWorkKm,
          totalRecoveryKm,
        },
        cooldownKm: r1(day.warmDown ?? 0),
        cooldownMin: ri((day.warmDown ?? 0) * 6),
      };
      acc.structures[structId] = structEntry;
    }
  }

  // ------------------------------------------------------------------
  // 3. Member curves
  // ------------------------------------------------------------------
  const curveEntries: CurveEntry[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i]!;
    const wn = week.weekNumber;
    const prevKm = i > 0 ? (weeks[i - 1]?.totalMileage ?? 0) : 0;
    const wowPct =
      i === 0 || prevKm === 0
        ? null
        : r1(((week.totalMileage - prevKm) / prevKm) * 100);

    const { positionInBlock, blockLength } = blockPosition(wn, planMeta.blocks);

    // Session type counts from week summary (re-derive from days for accuracy)
    let speed = 0, se = 0, tempo = 0, base = 0, lr = 0, sessions = 0;
    for (const d of week.days) {
      if (d.isRest || d.focusArea === "Rest" || d.focusArea === "Race Day" || d.focusArea === "Pre-Race Shakeout") continue;
      sessions++;
      if (d.focusArea === "Speed") speed++;
      else if (d.focusArea === "Speed Endurance") se++;
      else if (d.focusArea === "Tempo") tempo++;
      else if (d.focusArea === "Long Run") lr++;
      else base++;
    }

    curveEntries.push({
      week: wn,
      block: week.blockNumber,
      taper: week.isTaper,
      deload: week.isDeload,
      km: r1(week.totalMileage),
      sessions,
      speed,
      se,
      tempo,
      base,
      lr,
      blockPositionInBlock: positionInBlock,
      blockLengthAtThisWeek: blockLength,
      wowChangePct: wowPct,
      violatesGrowthCap: growthCapWeeks.has(wn),
      violatesLongRunCap: longRunCapWeeks.has(wn),
      sessionRefs: weekSessionRefs.get(wn) ?? [],
    });
  }

  acc.memberCurves[sid] = curveEntries;

  // ------------------------------------------------------------------
  // 4. Plan trace
  // ------------------------------------------------------------------
  const trace = getBlockLayoutTrace(planMeta.totalDays);
  const chosen = trace.chosenSignature;
  const others = trace.allCandidates.filter((c) => c.signature !== chosen).slice(0, 5);

  const planTrace: PlanTrace = {
    blockSignature: chosen,
    blockBoundaryWeeks: trace.blockBoundaryWeeks,
    decisionFactors: {
      totalWeeksAvailable: trace.totalWeeksAvailable,
      taperWeeksReserved: trace.taperWeeksReserved,
      remainingForBlocks: trace.remainingForBlocks,
      rule: trace.rule,
      alternativesConsidered: others.map((c) => c.signature),
      alternativesRejectedReason: others.map((c) =>
        c.score < trace.chosenScore
          ? `score ${c.score} < chosen ${trace.chosenScore} (slack=${c.slack}d)`
          : "tied",
      ),
    },
  };
  acc.planTraces[sid] = planTrace;
}

// ---------------------------------------------------------------------------
// Serialisation helpers for run_all.ts
// ---------------------------------------------------------------------------

/** Build curves.json (rep curves only — one entry per cluster representative). */
export function buildRepCurves(
  memberCurves: Record<string, CurveEntry[]>,
  representativeIds: string[],
): Record<string, CurveEntry[]> {
  const out: Record<string, CurveEntry[]> = {};
  for (const rid of representativeIds) {
    if (memberCurves[rid]) out[rid] = memberCurves[rid]!;
  }
  return out;
}

/**
 * Stable JSON serialiser: sorts object keys alphabetically at every level.
 * Keeps diffs reviewable when simulation parameters change.
 */
export function stableJson(value: unknown, indent?: number): string {
  return JSON.stringify(
    value,
    (_key, val) => {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return Object.fromEntries(
          Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        );
      }
      return val;
    },
    indent,
  );
}

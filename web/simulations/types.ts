export type PaceStyle = "Endurance" | "Speedster";
export type TrainingObjective = "performance" | "finish";

export interface ScenarioInput {
  id: string;
  seed: number;
  daysUntilRace: number;
  raceDate: string;
  sessionsPerWeek: number;
  currentMileage: number;
  targetMileage: number;
  currentPace: string;
  targetPace: string;
  style: PaceStyle;
  objective: TrainingObjective;
  raceDistance: string;
}

export type ScenarioStatus = "ok" | "invalid" | "error";

export interface ScenarioResult {
  id: string;
  input: ScenarioInput;
  status: ScenarioStatus;
  summary?: PlanSummary;
  error?: string;
  validationError?: string;
}

export interface WeekSummary {
  weekNumber: number;
  blockNumber: number;
  isTaper: boolean;
  isDeload: boolean;
  totalKm: number;
  sessionsCount: number;
  restDays: number;
  speedCount: number;
  seCount: number;
  tempoCount: number;
  baseCount: number;
  longRunCount: number;
  recoveryCount: number;
  /** Work km only (excludes warmup/cooldown) for hard session types */
  speedKm: number;
  seKm: number;
  tempoKm: number;
  baseKm: number;
  longRunKm: number;
  recoveryKm: number;
  /** Warmup + cooldown km from hard sessions (Speed/SE/Tempo) — counted as easy */
  hardWarmupCooldownKm: number;
}

// ---------------------------------------------------------------------------
// member_curves.json
// ---------------------------------------------------------------------------

export interface CurveEntry {
  week: number;
  block: number;
  taper: boolean;
  deload: boolean;
  km: number;
  sessions: number;
  speed: number;
  se: number;
  tempo: number;
  base: number;
  lr: number;
  blockPositionInBlock: number;
  blockLengthAtThisWeek: number;
  wowChangePct: number | null;
  violatesGrowthCap: boolean;
  violatesLongRunCap: boolean;
  sessionRefs: string[];
}

// ---------------------------------------------------------------------------
// sessions.json
// ---------------------------------------------------------------------------

export type SessionFocusType = "speed" | "se" | "tempo" | "base" | "lr" | "recovery";

export interface SessionEntry {
  scenarioId: string;
  week: number;
  dayOfWeek: number;   // 1=Mon … 7=Sun (ISO)
  type: SessionFocusType;
  purpose: string;
  plannedKm: number;
  /** Hard work portion only (excl. warmup/cooldown). Equals plannedKm for easy sessions. */
  workKm: number;
  plannedDurationMin: number;
  targetPace: string;
  targetIntensityPct: number;
  isHard: boolean;
  structureRefs: string[] | null;
}

// ---------------------------------------------------------------------------
// session_structures.json
// ---------------------------------------------------------------------------

export interface RepEntry {
  repNum: number;
  distanceM: number;
  targetPace: string;
  targetDurationSec: number;
  recoveryType: "jog" | "walk" | "float" | "rest";
  recoveryDistanceM: number;
  recoveryDurationSec: number;
}

export type MainSetFormat =
  | "intervals"
  | "cruise_intervals"
  | "tempo_continuous"
  | "progression"
  | "fartlek";

export interface MainSetEntry {
  format: MainSetFormat;
  totalReps?: number;
  setStructure: string;
  reps?: RepEntry[];
  totalWorkKm: number;
  totalRecoveryKm: number;
}

export interface SessionStructureEntry {
  sessionId: string;
  warmupKm: number;
  warmupMin: number;
  mainSet: MainSetEntry;
  cooldownKm: number;
  cooldownMin: number;
}

// ---------------------------------------------------------------------------
// plan_traces.json
// ---------------------------------------------------------------------------

export interface BlockCandidateInfo {
  signature: string;
  score: number;
  slack: number;
}

export interface PlanTrace {
  blockSignature: string;
  blockBoundaryWeeks: number[];
  decisionFactors: {
    totalWeeksAvailable: number;
    taperWeeksReserved: number;
    remainingForBlocks: number;
    rule: string;
    alternativesConsidered: string[];
    alternativesRejectedReason: string[];
  };
}

// ---------------------------------------------------------------------------
// violations.json
// ---------------------------------------------------------------------------

export interface GrowthCapViolation {
  type: "growthCap";
  week: number;
  thisKm: number;
  prevKm: number;
  wowChangePct: number;
  capPct: number;
  exceededByPct: number;
}

export interface LongRunCapViolation {
  type: "longRunCap";
  week: number;
  longRunKm: number;
  weeklyKm: number;
  longRunPct: number;
  capPct: number;
  exceededByPct: number;
}

export type ViolationEntry = GrowthCapViolation | LongRunCapViolation;

// ---------------------------------------------------------------------------
// Accumulator (used to collect outputs during simulation run)
// ---------------------------------------------------------------------------

export interface ExtractionAccumulators {
  memberCurves: Record<string, CurveEntry[]>;
  sessions: Record<string, SessionEntry>;
  structures: Record<string, SessionStructureEntry>;
  planTraces: Record<string, PlanTrace>;
  violations: Record<string, ViolationEntry[]>;
}

export interface PlanSummary {
  totalWeeks: number;
  blockCount: number;
  blockLengths: number[];
  blockSignature: string;
  planBlockLength: number;
  slackDays: number;
  taperStartDayIndex: number;
  weeks: WeekSummary[];
}

export interface MetricsResult {
  id: string;
  // Volume
  weeklyKm: number[];
  maxWeeklyKm: number;
  avgWeeklyKm: number;
  stdWeeklyKm: number;
  peakToAvgRatio: number;
  startWeeklyKm: number;
  endWeeklyKm: number;
  absoluteGainKm: number;
  // WoW
  wowChangePcts: (number | null)[];
  maxWowChangePct: number;
  meanWowChangePct: number;
  violationsGrowthCap: number;
  // Sessions
  avgSessionsPerWeek: number;
  // Composition (counts per week avg)
  avgSpeedPerWeek: number;
  avgSePerWeek: number;
  avgTempoPerWeek: number;
  avgBasePerWeek: number;
  avgLongRunPerWeek: number;
  totalHardSessions: number;
  avgHardSessionsPerWeek: number;
  // Easy/Hard split (km)
  totalEasyKm: number;
  totalHardKm: number;
  easyPct: number;
  hardPct: number;
  avgIntensityPct: number;
  avgLongRunPct: number;
  maxLongRunKm: number;
  violationsLongRunCap: number;
  violationsLongRunPct: number;
  // Structure
  blockCount: number;
  blockLengths: number[];
  blockSignature: string;
  totalWeeks: number;
  taperWeeks: number;
}

export interface FeatureVector {
  id: string;
  mileageSeries: number[];  // resampled to 10 points, normalised 0-1
  maxWeeklyKm: number;
  meanWowChangePct: number;
  avgSessionsPerWeek: number;
  avgIntensityPct: number;
  avgLongRunPct: number;
  easyPct: number;
  blockCount: number;
  blockSigCode: number;
}

export interface Cluster {
  id: number;
  representativeId: string;
  memberIds: string[];
  paramSummary: Record<string, string | number>;
  metricStats: Record<string, { min: number; median: number; max: number }>;
  causeAnalysis: string;
  nearestOtherClusterId?: number;
}

/**
 * ---
 * purpose: All engine-facing types. Property names (Session Distance, Total Distance, Upper/Lower/UppeDif/LowerDif, Rep N) mirror legacy JSON verbatim — do-not-break contract (see root CLAUDE.md). Distances in metres, paces in seconds.
 * outputs:
 *   - GeneratedPlan / PlanDay / PlanWeek / PlanMeta - engine output shapes
 *   - GeneratePlanInput / DataStore - engine input shapes
 *   - SessionTemplates / PaceTables / Config - JSON data shapes
 *   - Block / BlockInfo / WeeklyMileage / DistanceAllocation / DayAssignment / TaperSession - intermediate
 *   - FocusArea / SessionType / PaceStyle / DayOfWeek - enums
 * related:
 *   - ./planGenerator.ts - produces GeneratedPlan
 *   - ../storage/schemas.ts - Zod schemas that mirror these shapes for Blob reads
 * ---
 */

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface ScaffoldDay {
  dayCount: number;
  date: Date;
  dayOfWeek: DayOfWeek;
  dateStr: string;
  weekDay: number;
}

export interface Block {
  blockIndex: number;
  blockWeeks: number;
  sessionWeeks: number;
  deloadWeeks: number;
  startDayIndex: number;
  endDayIndex: number;
}

export interface BlockInfo {
  blocks: Block[];
  planBlockCount: number;
  totalBlockDays: number;
  slackDays: number;
  taperStartDayIndex: number;
  planBlockLength: number;
  planType: "Candidate";
  startCount: number;
}

export interface WeeklyMileage {
  weekMileage: number;
  isDeload: boolean;
  isPeak: boolean;
  blockIndex: number;
  weekInBlock: number;
  blockMaxMileage: number;
}

export interface DistanceAllocation {
  longRunKm: number;
  intensityWeeklyKm: number;
  baseWeeklyKm: number;
  intensityPerSessionMeters: number;
  basePerRunKm: number;
  longRunMileage: number;
  intensityMileage: number;
  baseMileage: number;
  wednesdayBaseMileage: number;
}

export type SessionType = "Speed" | "SE" | "Tempo";
export type FocusArea =
  | "Rest"
  | "Recovery"
  | "Base"
  | "Long Run"
  | "Speed"
  | "Speed Endurance"
  | "Tempo"
  | "Pre-Race Shakeout"
  | "Race Day";

export interface DayAssignment {
  focusArea: FocusArea;
  sessionType?: SessionType;
  sessionSummary?: string;
  sessionDescription?: string;
  totalDistance?: number;
  warmUp?: number;
  warmDown?: number;
  recoveries?: string;
  isRest?: boolean;
  needsSessionSelection?: boolean;
}

/** A row in a session template table — legacy property names preserved. */
export interface SessionTemplateRow {
  Summary?: string;
  Details?: string;
  Recoveries?: string;
  Stimulus?: string;
  Block?: string;
  "Summary #"?: number | string | null;
  "Session #"?: number | string | null;
  "Session Distance": number;
  "Total Distance": number;
  [repKey: `Rep ${number}`]: number | undefined;
  [key: string]: unknown;
}

export type SessionTemplates = Record<string, SessionTemplateRow[]>;

export interface SelectedSession {
  totalDistance: number;
  sessionDistance: number;
  summary: string;
  description: string;
  recoveries: string;
  stimulus: string;
  block: string;
  summaryNum: number | string | null;
  sessionNum: number | string | null;
  reps: number[];
  warmUp: number;
  warmDown: number;
}

/** A row in a pace table — legacy property names preserved. */
export interface PaceTableRow {
  label: string;
  Upper: number;
  Lower: number;
  UppeDif: number;
  LowerDif: number;
}

export type PaceTables = Record<string, PaceTableRow[]>;

export interface PaceRow {
  label: string;
  upper: number;
  lower: number;
  upperDif: number;
  lowerDif: number;
}

export interface PaceSummaryRow {
  "Pace Number": number;
  Tempo: string | null;
  Speed_Endurance: string | null;
  Speed_Speedster: string | null;
  SE_Endurance: string | null;
  SE_Speedster: string | null;
  [key: string]: string | number | null;
}

export interface ConvertedTableRow {
  distance: string;
  [headerKey: string]: number | string;
}

export interface Config {
  convertedTable: {
    headers: string[];
    rows: ConvertedTableRow[];
  };
  paceColumns: string[];
  paceSummary: {
    rows: PaceSummaryRow[];
  };
  [key: string]: unknown;
}

export type PaceStyle = "Endurance" | "Speedster";

export interface PaceData {
  speedPaces: PaceRow[] | null;
  sePaces: PaceRow[] | null;
  tempoPaces: PaceRow[] | null;
}

export interface TaperSession {
  focusArea: FocusArea;
  sessionSummary: string;
  sessionDescription: string;
  totalDistance: number;
  warmUp: number;
  warmDown: number;
  recoveries: string;
  isTaper: true;
  intensityMileage?: number;
  sessionType?: SessionType;
  useFinalSelection?: boolean;
  block?: string;
  stimulus?: string;
  reps?: number[];
}

export interface PlanDay extends ScaffoldDay {
  focusArea: FocusArea;
  sessionSummary: string;
  sessionDescription: string;
  totalDistance: number;
  warmUp: number;
  warmDown: number;
  recoveries: string;
  block: string;
  stimulus: string;
  reps: number[];
  paces: string;
  weekNumber: number;
  blockNumber: number;
  weeklyMileage: number;
  isTaper: boolean;
  isRest?: boolean;
  sessionsCount: number;
  sessionDistance?: number;
  _debug?: Record<string, number>;
}

export interface PlanWeek {
  weekNumber: number;
  days: PlanDay[];
  totalMileage: number;
  blockNumber: number;
  isTaper: boolean;
}

export interface PlanMeta {
  raceDate: string;
  totalDays: number;
  totalWeeks: number;
  planBlockCount: number;
  planBlockLength: number;
  blocks: { blockWeeks: number; sessionWeeks: number }[];
  taperStartDayIndex: number;
  slackDays: number;
  startingDistance: number;
  targetDistance: number;
  style: PaceStyle;
  raceDistance: string;
  startPaceIndex: number;
  generatedAt: string;
}

export interface GeneratedPlan {
  planMeta: PlanMeta;
  days: PlanDay[];
  weeks: PlanWeek[];
}

export interface GeneratePlanInput {
  raceDate: string;
  sessionsPerWeek: number;
  currentMileage: number;
  targetMileage: number;
  raceDistance?: string;
  currentPace: string;
  targetPace: string;
  style?: PaceStyle;
}

export interface DataStore {
  sessionTemplates: SessionTemplates;
  paceTables: PaceTables;
  config: Config;
}

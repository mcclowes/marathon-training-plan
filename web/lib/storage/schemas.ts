/**
 * ---
 * purpose: Zod schemas for everything that round-trips through Vercel Blob. Mirror engine output shapes with .passthrough() so extra legacy fields survive. Every getJson call goes through a schema here — this is the safety net against blob drift.
 * outputs:
 *   - StoredPlanSchema / PlanIndexSchema / CompletionsSchema / StravaTokensSchema (+ inferred types)
 * related:
 *   - ./blob.ts - consumer via getJson<T>
 *   - ./plans.ts ./completions.ts ./strava.ts - domain wrappers
 *   - ../engine/types.ts - typescript mirror of the runtime shapes validated here
 * ---
 */
import { z } from "zod";

export const PlanDaySchema = z
  .object({
    dayCount: z.number(),
    date: z.coerce.date(),
    dayOfWeek: z.string(),
    dateStr: z.string(),
    weekDay: z.number(),
    focusArea: z.string(),
    sessionSummary: z.string(),
    sessionDescription: z.string(),
    totalDistance: z.number(),
    warmUp: z.number(),
    warmDown: z.number(),
    recoveries: z.string(),
    block: z.string(),
    stimulus: z.string(),
    reps: z.array(z.number()),
    paces: z.string(),
    weekNumber: z.number(),
    blockNumber: z.number(),
    weeklyMileage: z.number(),
    isTaper: z.boolean(),
    isRest: z.boolean().optional(),
    sessionsCount: z.number(),
    sessionDistance: z.number().optional(),
  })
  .passthrough();

export const PlanWeekSchema = z
  .object({
    weekNumber: z.number(),
    days: z.array(PlanDaySchema),
    totalMileage: z.number(),
    blockNumber: z.number(),
    isTaper: z.boolean(),
  })
  .passthrough();

export const PlanMetaSchema = z
  .object({
    raceDate: z.string(),
    totalDays: z.number(),
    totalWeeks: z.number(),
    planBlockCount: z.number(),
    planBlockLength: z.number(),
    blocks: z.array(
      z.object({ blockWeeks: z.number(), sessionWeeks: z.number() }),
    ),
    taperStartDayIndex: z.number(),
    slackDays: z.number(),
    startingDistance: z.number(),
    targetDistance: z.number(),
    style: z.enum(["Endurance", "Speedster"]),
    raceDistance: z.string(),
    startPaceIndex: z.number(),
    generatedAt: z.string(),
  })
  .passthrough();

/** A saved plan is a generated plan plus a stable id. */
export const StoredPlanSchema = z.object({
  planId: z.string(),
  planMeta: PlanMetaSchema,
  days: z.array(PlanDaySchema),
  weeks: z.array(PlanWeekSchema),
});
export type StoredPlan = z.infer<typeof StoredPlanSchema>;

/** The plans-index is a lightweight list used by the dashboard. */
export const PlanIndexEntrySchema = z.object({
  planId: z.string(),
  raceDate: z.string(),
  raceDistance: z.string(),
  totalWeeks: z.number(),
  generatedAt: z.string(),
});
export type PlanIndexEntry = z.infer<typeof PlanIndexEntrySchema>;

export const PlanIndexSchema = z.object({
  plans: z.array(PlanIndexEntrySchema),
});
export type PlanIndex = z.infer<typeof PlanIndexSchema>;

/** Completions are keyed by dateStr (YYYY-MM-DD) → ISO timestamp of completion. */
export const CompletionsSchema = z.object({
  planId: z.string(),
  completed: z.record(z.string(), z.string()),
});
export type Completions = z.infer<typeof CompletionsSchema>;

/**
 * Strava OAuth tokens — stored server-side only (blob). Never serialised into
 * the JWT, never sent to the client. `expiresAt` is UNIX seconds per Strava's
 * API; we refresh 60s early.
 */
export const StravaTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number().int(),
  athleteId: z.string(),
  updatedAt: z.string(),
});
export type StravaTokens = z.infer<typeof StravaTokensSchema>;

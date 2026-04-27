"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import { dataStore } from "@/lib/data";
import { generateTrainingPlan } from "@/lib/engine/planGenerator";
import { deletePlan, savePlan } from "@/lib/storage/plans";
import { StoredPlanSchema } from "@/lib/storage/schemas";

const GeneratePlanInputSchema = z.object({
  raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "raceDate must be YYYY-MM-DD"),
  sessionsPerWeek: z.number().int().min(3).max(5),
  currentMileage: z.number().positive().max(300),
  targetMileage: z.number().positive().max(300),
  raceDistance: z.string().default("Marathon"),
  currentPace: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  targetPace: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  style: z.enum(["Endurance", "Speedster"]).default("Endurance"),
  objective: z.enum(["performance", "finish"]).default("performance"),
});

export type GeneratePlanResult =
  | { ok: true; planId: string }
  | { ok: false; error: string };

export async function generatePlanAction(
  rawInput: unknown,
): Promise<GeneratePlanResult> {
  const userId = await requireUserId();

  const parsed = GeneratePlanInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let plan;
  try {
    plan = generateTrainingPlan(parsed.data, dataStore);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to generate plan",
    };
  }

  const planId = crypto.randomUUID();
  const stored = StoredPlanSchema.parse({ planId, ...plan });
  await savePlan(userId, stored);

  revalidatePath("/dashboard");
  return { ok: true, planId };
}

export async function deletePlanAction(planId: string): Promise<void> {
  const userId = await requireUserId();
  await deletePlan(userId, planId);
  revalidatePath("/dashboard");
}

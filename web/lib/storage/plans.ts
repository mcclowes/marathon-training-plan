import { deleteByKey, getJson, putJson } from "./blob";
import { planIndexKey, planKey } from "./keys";
import {
  PlanIndexSchema,
  StoredPlanSchema,
  type PlanIndex,
  type PlanIndexEntry,
  type StoredPlan,
} from "./schemas";

const EMPTY_INDEX: PlanIndex = { plans: [] };

function toIndexEntry(plan: StoredPlan): PlanIndexEntry {
  return {
    planId: plan.planId,
    raceDate: plan.planMeta.raceDate,
    raceDistance: plan.planMeta.raceDistance,
    totalWeeks: plan.planMeta.totalWeeks,
    generatedAt: plan.planMeta.generatedAt,
  };
}

export async function listPlans(userId: string): Promise<PlanIndexEntry[]> {
  const index = await getJson(planIndexKey(userId), PlanIndexSchema);
  return index?.plans ?? [];
}

export async function getPlan(
  userId: string,
  planId: string,
): Promise<StoredPlan | null> {
  return getJson(planKey(userId, planId), StoredPlanSchema);
}

export async function savePlan(
  userId: string,
  plan: StoredPlan,
): Promise<void> {
  await putJson(planKey(userId, plan.planId), plan);

  const index =
    (await getJson(planIndexKey(userId), PlanIndexSchema)) ?? EMPTY_INDEX;
  const filtered = index.plans.filter((p) => p.planId !== plan.planId);
  const next: PlanIndex = { plans: [...filtered, toIndexEntry(plan)] };
  await putJson(planIndexKey(userId), next);
}

export async function deletePlan(
  userId: string,
  planId: string,
): Promise<void> {
  await deleteByKey(planKey(userId, planId));

  const index = await getJson(planIndexKey(userId), PlanIndexSchema);
  if (!index) return;
  const next: PlanIndex = {
    plans: index.plans.filter((p) => p.planId !== planId),
  };
  await putJson(planIndexKey(userId), next);
}

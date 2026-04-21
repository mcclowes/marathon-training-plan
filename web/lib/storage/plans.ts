/**
 * ---
 * purpose: Plan CRUD over Vercel Blob. Full plan lives at users/{userId}/plans/{planId}.json; lightweight index at users/{userId}/plans-index.json is kept in sync on save/delete for dashboard listing.
 * outputs:
 *   - listPlans - PlanIndexEntry[] (lightweight)
 *   - getPlan / savePlan / deletePlan - full plan CRUD
 * related:
 *   - ./blob.ts - underlying I/O
 *   - ./schemas.ts - StoredPlanSchema / PlanIndexSchema
 *   - app/actions/plans.ts - server action caller
 *   - app/(app)/dashboard - uses listPlans
 * ---
 */
import { deleteByKey, getJson, listUnderPrefix, putJson } from "./blob";
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
  if (!index) return [];

  // Guard against index ↔ blob drift (e.g. delete partial-failure, blob CDN
  // propagation, legacy/migrated state): only return entries whose plan blob
  // still exists, and rewrite the index if we found orphans so subsequent
  // reads skip the re-check.
  const existing = new Set(await listUnderPrefix(`users/${userId}/plans/`));
  const live = index.plans.filter((p) =>
    existing.has(planKey(userId, p.planId)),
  );
  if (live.length !== index.plans.length) {
    await putJson(planIndexKey(userId), { plans: live });
  }
  return live;
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

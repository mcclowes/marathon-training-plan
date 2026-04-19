import { getJson, putJson } from "./blob";
import { completionsKey } from "./keys";
import { CompletionsSchema, type Completions } from "./schemas";

function emptyCompletions(planId: string): Completions {
  return { planId, completed: {} };
}

export async function getCompletions(
  userId: string,
  planId: string,
): Promise<Completions> {
  const stored = await getJson(completionsKey(userId, planId), CompletionsSchema);
  return stored ?? emptyCompletions(planId);
}

export async function saveCompletions(
  userId: string,
  completions: Completions,
): Promise<void> {
  await putJson(completionsKey(userId, completions.planId), completions);
}

export async function toggleDayComplete(
  userId: string,
  planId: string,
  dateStr: string,
): Promise<Completions> {
  const current = await getCompletions(userId, planId);
  const next: Completions = {
    planId,
    completed: { ...current.completed },
  };
  if (next.completed[dateStr]) {
    delete next.completed[dateStr];
  } else {
    next.completed[dateStr] = new Date().toISOString();
  }
  await saveCompletions(userId, next);
  return next;
}

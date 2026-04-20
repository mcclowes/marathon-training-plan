"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { toggleDayComplete } from "@/lib/storage/completions";
import type { Completions } from "@/lib/storage/schemas";

export async function toggleDayCompleteAction(
  planId: string,
  dateStr: string,
): Promise<Completions> {
  const userId = await requireUserId();
  const next = await toggleDayComplete(userId, planId, dateStr);
  revalidatePath(`/plans/${planId}`);
  return next;
}

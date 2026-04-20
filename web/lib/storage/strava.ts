import { deleteByKey, getJson, putJson } from "./blob";
import { stravaKey } from "./keys";
import { StravaTokensSchema, type StravaTokens } from "./schemas";

export async function getStravaTokens(userId: string): Promise<StravaTokens | null> {
  return getJson(stravaKey(userId), StravaTokensSchema);
}

export async function saveStravaTokens(
  userId: string,
  tokens: StravaTokens,
): Promise<void> {
  await putJson(stravaKey(userId), tokens);
}

export async function clearStravaTokens(userId: string): Promise<void> {
  await deleteByKey(stravaKey(userId));
}

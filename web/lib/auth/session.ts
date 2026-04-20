import { auth } from "@/auth";

/**
 * Resolves the current user's stable id (Strava athleteId) or throws.
 *
 * Server-only — use inside Server Components, route handlers, or server
 * actions. Route protection happens in middleware.ts; this is the belt-and-
 * braces check used as the key into blob storage.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.athleteId;
  if (!userId) {
    throw new Error("Unauthorized — no signed-in user");
  }
  return userId;
}

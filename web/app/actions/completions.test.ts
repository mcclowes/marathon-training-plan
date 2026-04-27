import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const toggleCalls: unknown[][] = [];

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage/completions", () => ({
  toggleDayComplete: vi.fn(async (...args: unknown[]) => {
    toggleCalls.push(args);
    return { planId: String(args[1]), completed: { [String(args[2])]: "t" } };
  }),
}));

import { toggleDayCompleteAction } from "./completions";

describe("toggleDayCompleteAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    toggleCalls.length = 0;
  });

  it("passes userId/planId/dateStr to storage", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "u1" } });
    const result = await toggleDayCompleteAction("p1", "2026-05-01");
    expect(toggleCalls).toEqual([["u1", "p1", "2026-05-01"]]);
    expect(result.planId).toBe("p1");
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(
      toggleDayCompleteAction("p1", "2026-05-01"),
    ).rejects.toThrow(/Unauthorized/);
  });
});

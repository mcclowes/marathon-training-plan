import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const saveCalls: unknown[][] = [];
const deleteCalls: unknown[][] = [];

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage/plans", () => ({
  savePlan: vi.fn(async (...args: unknown[]) => {
    saveCalls.push(args);
  }),
  deletePlan: vi.fn(async (...args: unknown[]) => {
    deleteCalls.push(args);
  }),
}));

import { deletePlanAction, generatePlanAction } from "./plans";

function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

const validInput = {
  sessionsPerWeek: 4,
  currentMileage: 40,
  targetMileage: 80,
  currentPace: "04:00:00",
  targetPace: "03:30:00",
  style: "Endurance" as const,
};

describe("generatePlanAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    saveCalls.length = 0;
    deleteCalls.length = 0;
  });

  it("rejects invalid input with a readable error", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "u1" } });
    const result = await generatePlanAction({ ...validInput, raceDate: "soon" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/YYYY-MM-DD/);
  });

  it("rejects when engine throws (race too close)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "u1" } });
    const result = await generatePlanAction({
      ...validInput,
      raceDate: futureDateStr(10),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/at least 8 weeks/);
  });

  it("persists the plan and returns an id on success", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "u1" } });
    const result = await generatePlanAction({
      ...validInput,
      raceDate: futureDateStr(140),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.planId).toBe("string");
      expect(saveCalls).toHaveLength(1);
      const [userId, plan] = saveCalls[0] as [string, { planId: string }];
      expect(userId).toBe("u1");
      expect(plan.planId).toBe(result.planId);
    }
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(
      generatePlanAction({ ...validInput, raceDate: futureDateStr(140) }),
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("deletePlanAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    saveCalls.length = 0;
    deleteCalls.length = 0;
  });

  it("delegates to storage deletePlan with the signed-in userId", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "u1" } });
    await deletePlanAction("plan-abc");
    expect(deleteCalls).toEqual([["u1", "plan-abc"]]);
  });

  it("throws when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(deletePlanAction("p")).rejects.toThrow(/Unauthorized/);
  });
});

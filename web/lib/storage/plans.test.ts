import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();

vi.mock("./blob", () => ({
  getJson: vi.fn(async (pathname: string, schema: { parse: (v: unknown) => unknown }) => {
    const raw = store.get(pathname);
    if (raw === undefined) return null;
    return schema.parse(raw);
  }),
  putJson: vi.fn(async (pathname: string, value: unknown) => {
    store.set(pathname, value);
  }),
  deleteByKey: vi.fn(async (pathname: string) => {
    store.delete(pathname);
  }),
  listUnderPrefix: vi.fn(async (prefix: string) =>
    Array.from(store.keys()).filter((k) => k.startsWith(prefix)),
  ),
}));

import {
  deletePlan,
  getPlan,
  listPlans,
  savePlan,
} from "./plans";
import type { StoredPlan } from "./schemas";

function fakePlan(planId: string, raceDate = "2026-06-01"): StoredPlan {
  return {
    planId,
    planMeta: {
      raceDate,
      totalDays: 140,
      totalWeeks: 20,
      planBlockCount: 2,
      planBlockLength: 10,
      blocks: [{ blockWeeks: 10, sessionWeeks: 8 }],
      taperStartDayIndex: 123,
      slackDays: 7,
      startingDistance: 40,
      targetDistance: 80,
      style: "Endurance",
      raceDistance: "Marathon",
      startPaceIndex: 8,
      generatedAt: "2026-04-19T00:00:00.000Z",
      objective: "performance" as const,
    },
    days: [],
    weeks: [],
  };
}

describe("plans storage wrapper", () => {
  beforeEach(() => {
    store.clear();
  });

  it("savePlan writes the plan and adds an index entry", async () => {
    await savePlan("user-1", fakePlan("p1"));
    const saved = await getPlan("user-1", "p1");
    expect(saved?.planId).toBe("p1");

    const index = await listPlans("user-1");
    expect(index).toHaveLength(1);
    expect(index[0].planId).toBe("p1");
    expect(index[0].raceDate).toBe("2026-06-01");
  });

  it("savePlan is idempotent per planId — updates the existing index entry", async () => {
    await savePlan("user-1", fakePlan("p1", "2026-06-01"));
    await savePlan("user-1", fakePlan("p1", "2026-07-01"));
    const index = await listPlans("user-1");
    expect(index).toHaveLength(1);
    expect(index[0].raceDate).toBe("2026-07-01");
  });

  it("deletePlan removes both the plan blob and the index entry", async () => {
    await savePlan("user-1", fakePlan("p1"));
    await savePlan("user-1", fakePlan("p2"));
    await deletePlan("user-1", "p1");
    expect(await getPlan("user-1", "p1")).toBeNull();
    const remaining = await listPlans("user-1");
    expect(remaining.map((p) => p.planId)).toEqual(["p2"]);
  });

  it("plans are scoped per userId", async () => {
    await savePlan("user-1", fakePlan("p1"));
    expect(await listPlans("user-2")).toEqual([]);
    expect(await getPlan("user-2", "p1")).toBeNull();
  });

  it("listPlans hides index entries whose plan blob is missing and heals the index", async () => {
    await savePlan("user-1", fakePlan("p1"));
    await savePlan("user-1", fakePlan("p2"));
    // Simulate drift: plan blob gone (e.g. partial-failure on delete) but the
    // index still lists it. The dashboard must not render a ghost plan.
    store.delete("users/user-1/plans/p1.json");

    const live = await listPlans("user-1");
    expect(live.map((p) => p.planId)).toEqual(["p2"]);

    // Self-heal: the index blob has been rewritten without the orphan, so a
    // follow-up read doesn't need to re-check every time.
    const indexAfter = store.get("users/user-1/plans-index.json") as {
      plans: { planId: string }[];
    };
    expect(indexAfter.plans.map((p) => p.planId)).toEqual(["p2"]);
  });
});

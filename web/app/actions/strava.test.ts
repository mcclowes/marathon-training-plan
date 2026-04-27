import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const stored = {
  tokens: null as unknown,
  plan: null as unknown,
  completions: null as unknown,
};
const saveCompletionsCalls: unknown[][] = [];

vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage/strava", () => ({
  getStravaTokens: vi.fn(async () => stored.tokens),
}));

vi.mock("@/lib/storage/plans", () => ({
  getPlan: vi.fn(async () => stored.plan),
}));

vi.mock("@/lib/storage/completions", () => ({
  getCompletions: vi.fn(async () => stored.completions),
  saveCompletions: vi.fn(async (...args: unknown[]) => {
    saveCompletionsCalls.push(args);
  }),
}));

const fetchRunsMock = vi.fn();
vi.mock("@/lib/strava/client", () => ({
  fetchRunActivitiesSince: (...args: unknown[]) => fetchRunsMock(...args),
}));

import { syncActivitiesAction } from "./strava";

function planWith(dateStrs: string[]) {
  return {
    planId: "p1",
    days: dateStrs.map((d) => ({ dateStr: d, focusArea: "Base" })),
    weeks: [],
    planMeta: {},
  };
}

describe("syncActivitiesAction", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    stored.tokens = null;
    stored.plan = null;
    stored.completions = null;
    saveCompletionsCalls.length = 0;
    fetchRunsMock.mockReset();
  });

  it("returns an error when Strava is not connected", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    const r = await syncActivitiesAction("p1");
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Reconnect/) });
  });

  it("returns an error when the plan is missing", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    stored.tokens = { accessToken: "A" };
    stored.plan = null;
    const r = await syncActivitiesAction("p1");
    expect(r).toEqual({ ok: false, error: "Plan not found." });
  });

  it("reports 0 matches when no runs line up with plan days", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    stored.tokens = { accessToken: "A" };
    stored.plan = planWith(["2026-05-01", "2026-05-02"]);
    stored.completions = { planId: "p1", completed: {} };
    fetchRunsMock.mockResolvedValue([
      { id: 1, type: "Run", start_date_local: "2026-06-01T07:00:00Z", distance: 10000 },
    ]);

    const r = await syncActivitiesAction("p1");
    expect(r).toEqual({ ok: true, newMatches: 0 });
    expect(saveCompletionsCalls).toHaveLength(0);
  });

  it("matches runs to plan days and persists new completions", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    stored.tokens = { accessToken: "A" };
    stored.plan = planWith(["2026-05-01", "2026-05-02", "2026-05-03"]);
    stored.completions = { planId: "p1", completed: {} };
    fetchRunsMock.mockResolvedValue([
      { id: 1, type: "Run", start_date_local: "2026-05-01T07:00:00Z", distance: 10000 },
      { id: 2, type: "Run", start_date_local: "2026-05-03T07:00:00Z", distance: 10000 },
    ]);

    const r = await syncActivitiesAction("p1");
    expect(r).toEqual({ ok: true, newMatches: 2 });
    expect(saveCompletionsCalls).toHaveLength(1);
    const [, saved] = saveCompletionsCalls[0] as [
      string,
      { completed: Record<string, string> },
    ];
    expect(Object.keys(saved.completed).sort()).toEqual([
      "2026-05-01",
      "2026-05-03",
    ]);
  });

  it("skips already-completed days", async () => {
    mockAuth.mockResolvedValue({ user: { athleteId: "u1" } });
    stored.tokens = { accessToken: "A" };
    stored.plan = planWith(["2026-05-01", "2026-05-02"]);
    stored.completions = {
      planId: "p1",
      completed: { "2026-05-01": "t" },
    };
    fetchRunsMock.mockResolvedValue([
      { id: 1, type: "Run", start_date_local: "2026-05-01T07:00:00Z", distance: 10000 },
    ]);

    const r = await syncActivitiesAction("p1");
    expect(r).toEqual({ ok: true, newMatches: 0 });
  });
});

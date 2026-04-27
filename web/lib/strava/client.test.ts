import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored = new Map<string, unknown>();

vi.mock("@/lib/storage/strava", () => ({
  getStravaTokens: vi.fn(async (userId: string) => stored.get(userId) ?? null),
  saveStravaTokens: vi.fn(async (userId: string, tokens: unknown) => {
    stored.set(userId, tokens);
  }),
  clearStravaTokens: vi.fn(async (userId: string) => {
    stored.delete(userId);
  }),
}));

import {
  fetchRunActivitiesSince,
  getValidAccessToken,
} from "./client";

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  stored.clear();
  process.env.STRAVA_CLIENT_ID = "cid";
  process.env.STRAVA_CLIENT_SECRET = "csec";
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.restoreAllMocks();
});

describe("getValidAccessToken", () => {
  it("returns null when no tokens are stored", async () => {
    expect(await getValidAccessToken("u1")).toBeNull();
  });

  it("returns the stored access token when not near expiry", async () => {
    stored.set("u1", {
      accessToken: "AAA",
      refreshToken: "RRR",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      athleteId: "u1",
      updatedAt: "2026-01-01",
    });
    expect(await getValidAccessToken("u1")).toBe("AAA");
  });

  it("refreshes and persists when the token is within the refresh window", async () => {
    stored.set("u1", {
      accessToken: "OLD",
      refreshToken: "OLD_R",
      expiresAt: Math.floor(Date.now() / 1000) + 10, // <60s
      athleteId: "u1",
      updatedAt: "2026-01-01",
    });

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "NEW",
        refresh_token: "NEW_R",
        expires_at: Math.floor(Date.now() / 1000) + 21600,
      }),
    });

    const token = await getValidAccessToken("u1");
    expect(token).toBe("NEW");
    const after = stored.get("u1") as { accessToken: string; refreshToken: string };
    expect(after.accessToken).toBe("NEW");
    expect(after.refreshToken).toBe("NEW_R");
  });

  it("throws when the refresh endpoint errors", async () => {
    stored.set("u1", {
      accessToken: "OLD",
      refreshToken: "OLD_R",
      expiresAt: Math.floor(Date.now() / 1000) + 10,
      athleteId: "u1",
      updatedAt: "2026-01-01",
    });
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    await expect(getValidAccessToken("u1")).rejects.toThrow(/refresh failed/);
  });
});

describe("fetchRunActivitiesSince", () => {
  beforeEach(() => {
    stored.set("u1", {
      accessToken: "AAA",
      refreshToken: "RRR",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      athleteId: "u1",
      updatedAt: "2026-01-01",
    });
  });

  it("filters for Run activities only", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, type: "Run", start_date_local: "2026-05-01T07:00:00Z", distance: 10000 },
        { id: 2, type: "Ride", start_date_local: "2026-05-02T07:00:00Z", distance: 40000 },
        { id: 3, type: "Run", start_date_local: "2026-05-03T07:00:00Z", distance: 5000 },
      ],
    });
    const runs = await fetchRunActivitiesSince("u1", "2026-05-01");
    expect(runs.map((r) => r.id)).toEqual([1, 3]);
  });

  it("returns [] when no tokens are stored", async () => {
    stored.clear();
    expect(await fetchRunActivitiesSince("u1", "2026-05-01")).toEqual([]);
  });
});

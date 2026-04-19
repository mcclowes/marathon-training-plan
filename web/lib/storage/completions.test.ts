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
  listUnderPrefix: vi.fn(async () => [] as string[]),
}));

import {
  getCompletions,
  saveCompletions,
  toggleDayComplete,
} from "./completions";

describe("completions storage wrapper", () => {
  beforeEach(() => {
    store.clear();
  });

  it("getCompletions returns an empty record for a fresh plan", async () => {
    const c = await getCompletions("u1", "p1");
    expect(c).toEqual({ planId: "p1", completed: {} });
  });

  it("toggleDayComplete marks a day complete then un-marks on second call", async () => {
    const first = await toggleDayComplete("u1", "p1", "2026-05-01");
    expect(first.completed["2026-05-01"]).toBeTypeOf("string");

    const second = await toggleDayComplete("u1", "p1", "2026-05-01");
    expect(second.completed["2026-05-01"]).toBeUndefined();
  });

  it("toggleDayComplete preserves other dates", async () => {
    await toggleDayComplete("u1", "p1", "2026-05-01");
    await toggleDayComplete("u1", "p1", "2026-05-02");
    const read = await getCompletions("u1", "p1");
    expect(Object.keys(read.completed).sort()).toEqual([
      "2026-05-01",
      "2026-05-02",
    ]);
  });

  it("saveCompletions overwrites the stored record", async () => {
    await saveCompletions("u1", {
      planId: "p1",
      completed: { "2026-05-01": "2026-05-01T00:00:00.000Z" },
    });
    await saveCompletions("u1", { planId: "p1", completed: {} });
    const read = await getCompletions("u1", "p1");
    expect(read.completed).toEqual({});
  });
});

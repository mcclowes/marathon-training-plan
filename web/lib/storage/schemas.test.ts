import { describe, expect, it } from "vitest";
import {
  CompletionsSchema,
  PlanIndexSchema,
  StoredPlanSchema,
} from "./schemas";

describe("storage schemas", () => {
  it("PlanIndexSchema rejects missing planId", () => {
    const bad = { plans: [{ raceDate: "2026-06-01" }] };
    expect(PlanIndexSchema.safeParse(bad).success).toBe(false);
  });

  it("PlanIndexSchema accepts an empty list", () => {
    expect(PlanIndexSchema.safeParse({ plans: [] }).success).toBe(true);
  });

  it("CompletionsSchema accepts a dateStr → ISO map", () => {
    const parsed = CompletionsSchema.safeParse({
      planId: "p1",
      completed: { "2026-05-01": "2026-05-01T12:00:00.000Z" },
    });
    expect(parsed.success).toBe(true);
  });

  it("CompletionsSchema rejects non-string values", () => {
    const parsed = CompletionsSchema.safeParse({
      planId: "p1",
      completed: { "2026-05-01": 1 },
    });
    expect(parsed.success).toBe(false);
  });

  it("StoredPlanSchema rejects missing planMeta", () => {
    expect(
      StoredPlanSchema.safeParse({ planId: "p1", days: [], weeks: [] }).success,
    ).toBe(false);
  });
});

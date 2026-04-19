import { describe, expect, it } from "vitest";
import { dataStore } from "@/lib/data";
import { generateTrainingPlan } from "./planGenerator";

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

const baseInput = {
  sessionsPerWeek: 4,
  currentMileage: 40,
  targetMileage: 80,
  currentPace: "04:00:00",
  targetPace: "03:30:00",
  raceDistance: "Marathon" as string,
  style: "Endurance" as const,
};

describe("generateTrainingPlan", () => {
  it("produces a plan with days, weeks and meta for a 140-day horizon", () => {
    const raceDate = addDays(new Date(), 140).toISOString().split("T")[0];
    const plan = generateTrainingPlan({ ...baseInput, raceDate }, dataStore);

    expect(plan.days.length).toBeGreaterThan(0);
    expect(plan.weeks.length).toBeGreaterThan(0);
    expect(plan.planMeta.raceDate).toBe(raceDate);
    expect(plan.planMeta.totalDays).toBe(plan.days.length);
  });

  it("throws when the race date is closer than 8 weeks", () => {
    const raceDate = addDays(new Date(), 30).toISOString().split("T")[0];
    expect(() =>
      generateTrainingPlan({ ...baseInput, raceDate }, dataStore),
    ).toThrow();
  });

  it("race day appears as the last day", () => {
    const raceDate = addDays(new Date(), 160).toISOString().split("T")[0];
    const plan = generateTrainingPlan({ ...baseInput, raceDate }, dataStore);
    const last = plan.days[plan.days.length - 1];
    expect(last.focusArea).toBe("Race Day");
  });
});

import { describe, expect, it } from "vitest";
import { calculateDistances } from "./distanceAllocation";

describe("distanceAllocation", () => {
  it("long run never exceeds 38km", () => {
    for (const km of [50, 80, 120]) {
      expect(calculateDistances(km, 4).longRunKm).toBeLessThanOrEqual(38);
    }
  });

  it("long run never exceeds 40% of weekly total", () => {
    for (const km of [50, 80, 120]) {
      const d = calculateDistances(km, 4);
      expect(d.longRunKm / km).toBeLessThanOrEqual(0.401);
    }
  });

  it("intensity = 20% of weekly total (rounded)", () => {
    const d = calculateDistances(80, 4);
    expect(d.intensityWeeklyKm).toBe(Math.round(80 * 0.2));
  });

  it("base = total - longRun - intensity", () => {
    const km = 80;
    const d = calculateDistances(km, 4);
    expect(d.baseWeeklyKm).toBe(km - d.longRunKm - d.intensityWeeklyKm);
  });

  it("5-session week: wednesdayBaseMileage > 0", () => {
    expect(calculateDistances(80, 5).wednesdayBaseMileage).toBeGreaterThan(0);
  });

  it("3-session week: wednesdayBaseMileage = 0", () => {
    expect(calculateDistances(60, 3).wednesdayBaseMileage).toBe(0);
  });

  it("intensityMileage (meters) alias is per-session target", () => {
    const d = calculateDistances(80, 4);
    expect(d.intensityMileage).toBe(Math.round(d.intensityWeeklyKm * 500));
  });

  it("zero input is clamped safely", () => {
    const d = calculateDistances(0, 3);
    expect(d.longRunKm).toBe(0);
    expect(d.intensityWeeklyKm).toBe(0);
    expect(d.baseWeeklyKm).toBe(0);
  });
});

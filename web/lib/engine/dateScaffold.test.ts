import { describe, expect, it } from "vitest";
import { createDateScaffold, getDayName, getNextMonday } from "./dateScaffold";

describe("dateScaffold", () => {
  it("getNextMonday from a Wednesday returns the next Monday", () => {
    const wed = new Date(2025, 5, 4);
    const mon = getNextMonday(wed);
    expect(mon.getDay()).toBe(1);
    expect(mon >= wed).toBe(true);
  });

  it("getNextMonday from Monday returns same day", () => {
    const mon = new Date(2025, 5, 2);
    const result = getNextMonday(mon);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(2);
  });

  it("getNextMonday from Sunday returns the next day", () => {
    const sun = new Date(2025, 5, 1);
    const result = getNextMonday(sun);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(2);
  });

  it("createDateScaffold starts on Monday", () => {
    const start = new Date(2025, 0, 6);
    const end = new Date(2025, 3, 6);
    const sc = createDateScaffold(start, end);
    expect(sc.length).toBeGreaterThan(80);
    expect(sc[0].dayOfWeek).toBe("Monday");
  });

  it("getDayName returns correct day names", () => {
    expect(getDayName(new Date(2025, 5, 2))).toBe("Monday");
    expect(getDayName(new Date(2025, 5, 7))).toBe("Saturday");
    expect(getDayName(new Date(2025, 5, 8))).toBe("Sunday");
  });

  it("createDateScaffold dayCount is 1-indexed sequential", () => {
    const sc = createDateScaffold(new Date(2025, 0, 6), new Date(2025, 0, 20));
    expect(sc[0].dayCount).toBe(1);
    expect(sc[sc.length - 1].dayCount).toBe(sc.length);
  });
});

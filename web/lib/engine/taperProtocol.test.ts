import { describe, expect, it } from "vitest";
import { getTaperSession, isTaperDay } from "./taperProtocol";

describe("taperProtocol", () => {
  it("isTaperDay identifies the 18-day taper window", () => {
    expect(isTaperDay(184, 200)).toBe(true);
    expect(isTaperDay(183, 200)).toBe(true);
    expect(isTaperDay(182, 200)).toBe(false);
    expect(isTaperDay(100, 200)).toBe(false);
  });

  it("returns race day on the last day", () => {
    const sess = getTaperSession(200, 200, "Rest")!;
    expect(sess.focusArea).toBe("Race Day");
    expect(sess.totalDistance).toBe(42.2);
  });

  it("returns shakeout the day before race", () => {
    const sess = getTaperSession(199, 200, "Rest")!;
    expect(sess.focusArea).toBe("Pre-Race Shakeout");
  });

  it("offset 14 = 30km long run", () => {
    const sess = getTaperSession(200 - 14, 200, "Rest")!;
    expect(sess.totalDistance).toBe(30);
  });

  it("forces rest if previous day was Long Run", () => {
    const sess = getTaperSession(190, 200, "Long Run")!;
    expect(sess.focusArea).toBe("Rest");
  });

  it("returns null for offset 17 so normal scheduling handles it", () => {
    expect(getTaperSession(200 - 17, 200, "Rest")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  paceStrToSeconds,
  secondsToHMS,
  secondsToMinKm,
} from "./paceEngine";

describe("paceEngine formatters", () => {
  it("paceStrToSeconds converts HH:MM:SS", () => {
    expect(paceStrToSeconds("03:40:00")).toBe(13200);
    expect(paceStrToSeconds("00:04:30")).toBe(270);
  });

  it("paceStrToSeconds returns 0 for invalid input", () => {
    expect(paceStrToSeconds("")).toBe(0);
    expect(paceStrToSeconds("abc")).toBe(0);
  });

  it("secondsToMinKm formats a pace", () => {
    expect(secondsToMinKm(270)).toBe("4:30");
    expect(secondsToMinKm(300)).toBe("5:00");
  });

  it("secondsToMinKm returns placeholder for non-positive", () => {
    expect(secondsToMinKm(0)).toBe("--:--");
    expect(secondsToMinKm(-5)).toBe("--:--");
  });

  it("secondsToHMS formats hours:minutes:seconds", () => {
    expect(secondsToHMS(3661)).toBe("1:01:01");
    expect(secondsToHMS(0)).toBe("0:00:00");
  });
});

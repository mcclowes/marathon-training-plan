import { describe, expect, it } from "vitest";
import { isPyramidal, isUniform, optimizeBlocks } from "./blockOptimizer";

describe("blockOptimizer", () => {
  describe("optimizeBlocks", () => {
    it("returns ≤5 blocks", () => {
      const r = optimizeBlocks(200);
      expect(r.planBlockCount).toBeLessThanOrEqual(5);
      expect(r.planBlockCount).toBeGreaterThanOrEqual(1);
    });

    it("returns blocks array with correct shape", () => {
      const r = optimizeBlocks(200);
      expect(Array.isArray(r.blocks)).toBe(true);
      expect(r.blocks.length).toBe(r.planBlockCount);
      for (const b of r.blocks) {
        expect([8, 10, 12]).toContain(b.blockWeeks);
        expect(b.deloadWeeks).toBe(2);
        expect(b.sessionWeeks).toBe(b.blockWeeks - 2);
      }
    });

    it("taperStartDayIndex = maxDayCount - 17", () => {
      expect(optimizeBlocks(210).taperStartDayIndex).toBe(210 - 17);
      expect(optimizeBlocks(200).taperStartDayIndex).toBe(200 - 17);
    });

    it("block sequence is pyramidal or uniform at typical plan lengths", () => {
      for (const d of [140, 180, 210, 250]) {
        const r = optimizeBlocks(d);
        const lengths = r.blocks.map((b) => b.blockWeeks);
        expect(isPyramidal(lengths) || isUniform(lengths)).toBe(true);
      }
    });

    it("handles short plans (60 days)", () => {
      const r = optimizeBlocks(60);
      expect(r.planBlockCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("isPyramidal", () => {
    it("accepts [8,10,12,8]", () => expect(isPyramidal([8, 10, 12, 8])).toBe(true));
    it("accepts [8,10,10,8]", () => expect(isPyramidal([8, 10, 10, 8])).toBe(true));
    it("accepts [8,8,10,12,10]", () =>
      expect(isPyramidal([8, 8, 10, 12, 10])).toBe(true));
    it("rejects [8,12,12,10] (+4 jump)", () =>
      expect(isPyramidal([8, 12, 12, 10])).toBe(false));
    it("rejects [8,12,8,10,10] (valley then rise)", () =>
      expect(isPyramidal([8, 12, 8, 10, 10])).toBe(false));
    it("trivially accepts single-element sequences", () =>
      expect(isPyramidal([10])).toBe(true));
  });

  describe("isUniform", () => {
    it("accepts [10,10,10]", () => expect(isUniform([10, 10, 10])).toBe(true));
    it("rejects []", () => expect(isUniform([])).toBe(false));
    it("rejects mixed", () => expect(isUniform([8, 10])).toBe(false));
  });
});

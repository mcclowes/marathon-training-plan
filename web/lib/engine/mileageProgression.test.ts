import { describe, expect, it } from "vitest";
import type { Block } from "./types";
import {
  calculateGrowthRate,
  progressWeeklyMileageByBlocks,
} from "./mileageProgression";

function makeBlocks(sizes: number[]): Block[] {
  return sizes.map((bw, i) => ({
    blockIndex: i,
    blockWeeks: bw,
    sessionWeeks: bw - 2,
    deloadWeeks: 2,
    startDayIndex: 0,
    endDayIndex: 0,
  }));
}

describe("mileageProgression", () => {
  it("calculateGrowthRate returns positive value ≤ 0.1", () => {
    const G = calculateGrowthRate({
      planBlockCount: 3,
      planBlockLength: 10,
      maxDayCount: 200,
      startingDistance: 40,
      targetDistance: 100,
    });
    expect(G).toBeGreaterThan(0);
    expect(G).toBeLessThanOrEqual(0.1);
  });

  it("total weeks = sum of block weeks", () => {
    const data = progressWeeklyMileageByBlocks(40, 100, makeBlocks([8, 10, 12]));
    expect(data.length).toBe(30);
  });

  it("no weekly increase > 10% within a block's ramp", () => {
    const data = progressWeeklyMileageByBlocks(40, 100, makeBlocks([8, 10]));
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (prev.isDeload || curr.isDeload) continue;
      if (prev.blockIndex !== curr.blockIndex) continue;
      if (prev.weekMileage <= 0) continue;
      const inc = (curr.weekMileage - prev.weekMileage) / prev.weekMileage;
      expect(inc).toBeLessThanOrEqual(0.101);
    }
  });

  it("never exceeds target", () => {
    const data = progressWeeklyMileageByBlocks(40, 90, makeBlocks([8, 10, 12]));
    for (const w of data) {
      expect(w.weekMileage).toBeLessThanOrEqual(91);
    }
  });

  it("exactly 2 peak weeks per block", () => {
    const blocks = makeBlocks([8, 10]);
    const data = progressWeeklyMileageByBlocks(40, 80, blocks);
    [0, 1].forEach((bi) => {
      const peaks = data.filter((d) => d.blockIndex === bi && d.isPeak);
      expect(peaks.length).toBe(2);
    });
  });

  it("exactly 2 deload weeks per block", () => {
    const data = progressWeeklyMileageByBlocks(40, 80, makeBlocks([8]));
    const deloads = data.filter((d) => d.isDeload);
    expect(deloads.length).toBe(2);
  });

  it("returns empty array for no blocks", () => {
    expect(progressWeeklyMileageByBlocks(40, 80, [])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  getFinalSessionTableName,
  getSessionTableName,
  selectSession,
} from "./sessionSelector";
import type { SessionTemplates } from "./types";

describe("sessionSelector", () => {
  describe("getSessionTableName", () => {
    it("Speed week 1 block 12 → Speed_EvenBlocks", () => {
      expect(getSessionTableName("Speed", 1, 12)).toBe("Speed_EvenBlocks");
    });
    it("SE week 2 block 12 → SE_Pyramid", () => {
      expect(getSessionTableName("SE", 2, 12)).toBe("SE_Pyramid");
    });
    it("Tempo odd week → Tempo_EvenBlocks", () => {
      expect(getSessionTableName("Tempo", 3, 10)).toBe("Tempo_EvenBlocks");
    });
    it("Tempo even week → Tempo_CutDown", () => {
      expect(getSessionTableName("Tempo", 4, 10)).toBe("Tempo_CutDown");
    });
    it("SE 10-week block, week 8 → SE_ReversePyramid", () => {
      expect(getSessionTableName("SE", 8, 10)).toBe("SE_ReversePyramid");
    });
  });

  describe("getFinalSessionTableName", () => {
    it("Speed → Speed_CutDowns", () =>
      expect(getFinalSessionTableName("Speed")).toBe("Speed_CutDowns"));
    it("SE → SE_CutDowns", () =>
      expect(getFinalSessionTableName("SE")).toBe("SE_CutDowns"));
    it("Tempo → Tempo_EvenBlocks", () =>
      expect(getFinalSessionTableName("Tempo")).toBe("Tempo_EvenBlocks"));
  });

  describe("selectSession", () => {
    const templates: SessionTemplates = {
      Speed_EvenBlocks: [
        {
          Summary: "A",
          Details: "10 x 200",
          Recoveries: "60s",
          Stimulus: "Top End",
          "Session Distance": 2000,
          "Total Distance": 7000,
          "Rep 1": 200,
          "Rep 2": 200,
        },
        {
          Summary: "B",
          Details: "12 x 400",
          Recoveries: "90s",
          Stimulus: "Top End",
          "Session Distance": 4800,
          "Total Distance": 9800,
        },
      ],
    };

    it("returns null for unknown table", () => {
      expect(selectSession(templates, "Missing", 2000)).toBeNull();
    });

    it("returns a result when the table has rows", () => {
      const r = selectSession(templates, "Speed_EvenBlocks", 2000);
      expect(r).not.toBeNull();
      expect(["A", "B"]).toContain(r!.summary);
    });

    it("converts Total Distance (m) to km", () => {
      const r = selectSession(templates, "Speed_EvenBlocks", 2000)!;
      expect([7, 9.8]).toContain(r.totalDistance);
    });

    it("extracts reps from Rep 1..N fields", () => {
      const r = selectSession(templates, "Speed_EvenBlocks", 2000);
      expect(r).not.toBeNull();
      if (r?.summary === "A") expect(r.reps).toEqual([200, 200]);
    });
  });
});

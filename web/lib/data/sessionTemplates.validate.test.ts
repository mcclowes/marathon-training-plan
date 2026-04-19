import { describe, expect, it } from "vitest";
import { sessionTemplates } from "./index";

describe("sessionTemplates integrity", () => {
  it("every row's Rep 1..N sum equals its Session Distance", () => {
    const mismatches: string[] = [];

    for (const [tableName, rows] of Object.entries(sessionTemplates)) {
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const reps: number[] = [];
        for (let n = 1; ; n++) {
          const raw = (row as Record<string, unknown>)[`Rep ${n}`];
          if (raw === undefined || raw === null) break;
          const v = Number(raw);
          if (!Number.isNaN(v)) reps.push(v);
        }

        const sessionDist = (row as Record<string, unknown>)["Session Distance"];

        if (sessionDist === null || sessionDist === undefined) {
          mismatches.push(
            `${tableName} #${String(row["Summary #"])}/${String(row["Session #"])}: missing Session Distance`,
          );
          continue;
        }

        if (reps.length === 0) continue;

        const repSum = reps.reduce((s, v) => s + v, 0);
        const diff = repSum - Number(sessionDist);
        if (diff !== 0) {
          mismatches.push(
            `${tableName} #${String(row["Summary #"])}/${String(row["Session #"])}: rep sum ${repSum} ≠ Session Distance ${sessionDist} (diff ${diff})`,
          );
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("has the 14 required session table names", () => {
    const required = [
      "Speed_Pyramid",
      "Speed_ReversePyramid",
      "Speed_MSets",
      "Speed_WSets",
      "Speed_CutDowns",
      "Speed_EvenBlocks",
      "SE_Pyramid",
      "SE_ReversePyramid",
      "SE_MSets",
      "SE_WSets",
      "SE_CutDowns",
      "SE_EvenBlocks",
      "Tempo_EvenBlocks",
      "Tempo_CutDown",
    ];
    for (const name of required) {
      expect(sessionTemplates[name], `missing ${name}`).toBeDefined();
      expect(Array.isArray(sessionTemplates[name])).toBe(true);
    }
  });
});

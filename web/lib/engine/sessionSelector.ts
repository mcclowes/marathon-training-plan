/**
 * ---
 * purpose: Resolve which session-template table to sample for (sessionType, weekInBlock, blockLength) and randomly pick a row whose "Session Distance" is within tolerance of the target. Uses Math.random() (non-deterministic — pace with VBA diverges).
 * outputs:
 *   - string - table name (e.g. "Speed_EvenBlocks", "Tempo_CutDown")
 *   - SelectedSession | null - chosen row mapped to engine shape (summary, description, reps, distances)
 * related:
 *   - ./planGenerator.ts - caller for both normal + taper final-session paths
 *   - ./taperProtocol.ts - uses getFinalSessionTableName for taper intensity picks
 *   - ../data/sessionTemplates.json - the 14 tables named here (do-not-break contract)
 * ---
 */
import type {
  SelectedSession,
  SessionTemplateRow,
  SessionTemplates,
  SessionType,
} from "./types";

export function getSessionTableName(
  sessionType: SessionType,
  weekCount: number,
  planBlockLength: number,
): string {
  if (sessionType === "Speed" || sessionType === "SE") {
    if (planBlockLength === 8 || planBlockLength === 12) {
      switch (weekCount) {
        case 1:
        case 5:
        case 9:
        case 13:
        case 17:
          return sessionType + "_EvenBlocks";
        case 2:
        case 10:
        case 18:
          return sessionType + "_Pyramid";
        case 3:
        case 11:
        case 19:
          return sessionType + "_MSets";
        case 4:
        case 8:
        case 12:
        case 16:
        case 20:
          return sessionType + "_CutDowns";
        case 6:
        case 14:
          return sessionType + "_ReversePyramid";
        case 7:
        case 15:
          return sessionType + "_WSets";
        default:
          return sessionType + "_EvenBlocks";
      }
    } else if (planBlockLength === 10) {
      switch (weekCount) {
        case 1:
        case 4:
        case 7:
        case 11:
        case 14:
          return sessionType + "_EvenBlocks";
        case 2:
        case 12:
          return sessionType + "_Pyramid";
        case 5:
        case 15:
          return sessionType + "_MSets";
        case 3:
        case 6:
        case 10:
        case 13:
        case 16:
          return sessionType + "_CutDowns";
        case 8:
          return sessionType + "_ReversePyramid";
        case 9:
          return sessionType + "_WSets";
        default:
          return sessionType + "_EvenBlocks";
      }
    }
  } else if (sessionType === "Tempo") {
    return weekCount % 2 === 1 ? "Tempo_EvenBlocks" : "Tempo_CutDown";
  }
  return sessionType + "_EvenBlocks";
}

export function getFinalSessionTableName(sessionType: SessionType): string {
  if (sessionType === "Speed" || sessionType === "SE") {
    return sessionType + "_CutDowns";
  }
  return "Tempo_EvenBlocks";
}

function extractReps(row: SessionTemplateRow): number[] {
  const reps: number[] = [];
  for (let n = 1; ; n++) {
    const key = `Rep ${n}` as const;
    const raw = (row as Record<string, unknown>)[key];
    if (raw === undefined || raw === null) break;
    const v = Number(raw);
    if (!Number.isNaN(v) && v > 0) reps.push(v);
  }
  return reps;
}

function buildResult(row: SessionTemplateRow): SelectedSession {
  return {
    totalDistance: ((row["Total Distance"] as number) || 0) / 1000,
    sessionDistance: (row["Session Distance"] as number) || 0,
    summary: (row.Summary as string) || "",
    description: (row.Details as string) || "",
    recoveries: (row.Recoveries as string) || "",
    stimulus: (row.Stimulus as string) || "",
    block: (row.Block as string) || "",
    summaryNum: (row["Summary #"] as number | string | null) ?? null,
    sessionNum: (row["Session #"] as number | string | null) ?? null,
    reps: extractReps(row),
    warmUp: 2.5,
    warmDown: 2.5,
  };
}

export function selectSession(
  sessionTemplates: SessionTemplates,
  tableName: string,
  targetDistance: number,
): SelectedSession | null {
  const table = sessionTemplates[tableName];
  if (!table || table.length === 0) return null;

  let tolerance = 100;
  const maxTolerance = 2000;
  const maxAttempts = 20;

  while (tolerance <= maxTolerance) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const idx = Math.floor(Math.random() * table.length);
      const row = table[idx];
      const dist = (row["Session Distance"] as number) || 0;
      if (Math.abs(targetDistance - dist) <= tolerance) {
        return buildResult(row);
      }
    }
    tolerance += 100;
  }

  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < table.length; i++) {
    const d = Math.abs(
      targetDistance - ((table[i]["Session Distance"] as number) || 0),
    );
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  }
  return buildResult(table[bestIdx]);
}

/**
 * ---
 * purpose: Hard-coded taper override for the final ~17 days. Maps offset-from-race-day to rest / long run / speed / tempo / shakeout / race-day sessions. Overrides the normal block pipeline.
 * outputs:
 *   - boolean - isTaperDay check
 *   - TaperSession | null - preset session (some mark useFinalSelection so planGenerator re-picks a concrete row)
 * related:
 *   - ./planGenerator.ts - branches on isTaperDay before normal day assignment
 *   - ./sessionSelector.ts - called when useFinalSelection is true
 *   - ./tuning.ts - taperDays (default 17)
 * ---
 */
import type { TaperSession } from "./types";
import { DEFAULT_TUNING, type TuningParams } from "./tuning";

export function isTaperDay(
  dayIndex: number,
  maxDayCount: number,
  tuning: TuningParams = DEFAULT_TUNING,
): boolean {
  return dayIndex >= maxDayCount - tuning.taperDays;
}

function scaleKm(km: number, factor: number): number {
  return Math.round(km * factor * 10) / 10;
}

function scaleMetres(m: number, factor: number): number {
  return Math.round((m * factor) / 100) * 100;
}

export function getTaperSession(
  dayIndex: number,
  maxDayCount: number,
  prevFocusArea: string,
  preTaperWeeklyMileage = 85,
): TaperSession | null {
  if (prevFocusArea === "Long Run") {
    return {
      focusArea: "Rest",
      sessionSummary: "Rest",
      sessionDescription: "Rest",
      totalDistance: 0,
      warmUp: 0,
      warmDown: 0,
      recoveries: "",
      isTaper: true,
    };
  }

  const offset = maxDayCount - dayIndex;

  const restOffsets = [16, 13, 11, 9, 6, 4, 2];
  if (restOffsets.includes(offset)) {
    return {
      focusArea: "Rest",
      sessionSummary: "Rest",
      sessionDescription: "Rest",
      totalDistance: 0,
      warmUp: 0,
      warmDown: 0,
      recoveries: "",
      isTaper: true,
    };
  }

  // Days 7–17: scale volumes down 1% per km under 85 km/week pre-taper
  const scaleFactor =
    offset >= 7 && preTaperWeeklyMileage < 85
      ? Math.max(0, 1 - (85 - preTaperWeeklyMileage) / 100)
      : 1;

  switch (offset) {
    case 17:
      return null;

    case 15:
      return {
        focusArea: "Base",
        sessionSummary: "Easy Running",
        sessionDescription:
          "Warm Up with drills then 5km easy running, easy warm down",
        totalDistance: scaleKm(10, scaleFactor),
        warmUp: scaleKm(2.5, scaleFactor),
        warmDown: scaleKm(2.5, scaleFactor),
        recoveries: "N/A",
        isTaper: true,
      };

    case 14:
      return {
        focusArea: "Long Run",
        sessionSummary: "Steady running, practice finishing strong",
        sessionDescription:
          "Warm Up with drills then 24km easy running, easy warm down",
        totalDistance: scaleKm(30, scaleFactor),
        warmUp: scaleKm(3, scaleFactor),
        warmDown: scaleKm(3, scaleFactor),
        recoveries: "N/A",
        isTaper: true,
      };

    case 12:
      return {
        focusArea: "Speed",
        sessionSummary: "Taper Speed Session",
        sessionDescription: "SE session - sharp intensity, reduced volume",
        totalDistance: scaleKm(10, scaleFactor),
        warmUp: scaleKm(2.5, scaleFactor),
        warmDown: scaleKm(2.5, scaleFactor),
        recoveries: "",
        intensityMileage: scaleMetres(10000, scaleFactor),
        sessionType: "SE",
        useFinalSelection: true,
        isTaper: true,
      };

    case 10:
      return {
        focusArea: "Speed",
        sessionSummary: "Taper Tempo Session",
        sessionDescription: "Tempo session - maintain sharpness",
        totalDistance: scaleKm(10, scaleFactor),
        warmUp: scaleKm(2.5, scaleFactor),
        warmDown: scaleKm(2.5, scaleFactor),
        recoveries: "",
        intensityMileage: scaleMetres(10000, scaleFactor),
        sessionType: "Tempo",
        useFinalSelection: true,
        isTaper: true,
      };

    case 8:
      return {
        focusArea: "Base",
        sessionSummary: "Easy Running",
        sessionDescription:
          "Warm Up with drills then 5km easy running, easy warm down",
        totalDistance: scaleKm(10, scaleFactor),
        warmUp: scaleKm(2.5, scaleFactor),
        warmDown: scaleKm(2.5, scaleFactor),
        recoveries: "N/A",
        isTaper: true,
      };

    case 7:
      return {
        focusArea: "Long Run",
        sessionSummary: "Steady running, practice finishing strong",
        sessionDescription:
          "Warm Up with drills then 15km steady running, easy warm down",
        totalDistance: scaleKm(21, scaleFactor),
        warmUp: scaleKm(3, scaleFactor),
        warmDown: scaleKm(3, scaleFactor),
        recoveries: "N/A",
        isTaper: true,
      };

    case 5:
      return {
        focusArea: "Speed",
        sessionSummary: "Taper Tempo",
        sessionDescription: "Short sharp tempo to keep legs ticking",
        totalDistance: 6,
        warmUp: 2.5,
        warmDown: 2.5,
        recoveries: "",
        intensityMileage: 6000,
        sessionType: "Tempo",
        useFinalSelection: true,
        isTaper: true,
      };

    case 3:
      return {
        focusArea: "Speed",
        sessionSummary: "Taper Speed",
        sessionDescription: "Short speed work - stay sharp",
        totalDistance: 4,
        warmUp: 2.5,
        warmDown: 2.5,
        recoveries: "",
        intensityMileage: 4000,
        sessionType: "Speed",
        useFinalSelection: true,
        isTaper: true,
      };

    case 1:
      return {
        focusArea: "Pre-Race Shakeout",
        sessionSummary: "5km super easy jogging plus strides",
        sessionDescription:
          "Shake the legs out, some small relaxed strides and get excited for the race",
        totalDistance: 5,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isTaper: true,
      };

    case 0:
      return {
        focusArea: "Race Day",
        sessionSummary: "Fly or Die Trying",
        sessionDescription:
          "Start relaxed, stay strong, come through the half slightly back from your target and then start cranking up the pace before sending it all out for the final 10k, empty the tank and enjoy",
        totalDistance: 42.2,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isTaper: true,
      };

    default:
      return null;
  }
}

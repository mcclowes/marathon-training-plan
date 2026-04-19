import type {
  DayAssignment,
  DayOfWeek,
  DistanceAllocation,
  SessionType,
} from "./types";

export interface FocusChoice {
  focus: "Speed" | "Speed Endurance" | "Tempo";
  sessionType: SessionType;
}

export function getTuesdayFocus(
  blockCount: number,
  planBlockCount: number,
): FocusChoice {
  switch (blockCount) {
    case 1:
      return { focus: "Speed", sessionType: "Speed" };
    case 2:
      if (planBlockCount === 3 || planBlockCount === 5)
        return { focus: "Speed", sessionType: "Speed" };
      return { focus: "Speed Endurance", sessionType: "SE" };
    case 3:
      if (planBlockCount === 4)
        return { focus: "Speed", sessionType: "Speed" };
      return { focus: "Speed Endurance", sessionType: "SE" };
    case 4:
      if (planBlockCount === 5)
        return { focus: "Speed", sessionType: "Speed" };
      return { focus: "Speed Endurance", sessionType: "SE" };
    case 5:
      return { focus: "Speed Endurance", sessionType: "SE" };
    default:
      return { focus: "Speed Endurance", sessionType: "SE" };
  }
}

export function getThursdayFocus(
  blockCount: number,
  planBlockCount: number,
): FocusChoice {
  switch (blockCount) {
    case 1:
      return { focus: "Speed Endurance", sessionType: "SE" };
    case 2:
      if (planBlockCount === 3 || planBlockCount === 5)
        return { focus: "Speed Endurance", sessionType: "SE" };
      return { focus: "Tempo", sessionType: "Tempo" };
    case 3:
      if (planBlockCount === 4)
        return { focus: "Speed Endurance", sessionType: "SE" };
      return { focus: "Tempo", sessionType: "Tempo" };
    case 4:
      if (planBlockCount === 5)
        return { focus: "Speed Endurance", sessionType: "SE" };
      return { focus: "Tempo", sessionType: "Tempo" };
    case 5:
      return { focus: "Tempo", sessionType: "Tempo" };
    default:
      return { focus: "Tempo", sessionType: "Tempo" };
  }
}

export interface DayAssignmentParams {
  sessionsCount: number;
  blockCount: number;
  planBlockCount: number;
  distances: DistanceAllocation;
}

export function getDayAssignment(
  dayOfWeek: DayOfWeek,
  params: DayAssignmentParams,
): DayAssignment {
  const { sessionsCount, blockCount, planBlockCount, distances } = params;
  const { longRunMileage, baseMileage, wednesdayBaseMileage } = distances;

  switch (dayOfWeek) {
    case "Monday":
      return {
        focusArea: "Rest",
        sessionSummary: "Rest/S&C",
        sessionDescription:
          "Rest or Strength & Conditioning Work (focus on single leg weight exercises)",
        totalDistance: 0,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isRest: true,
      };

    case "Tuesday": {
      const tue = getTuesdayFocus(blockCount, planBlockCount);
      return {
        focusArea: tue.focus,
        sessionType: tue.sessionType,
        needsSessionSelection: true,
      };
    }

    case "Wednesday":
      if (sessionsCount > 4) {
        return {
          focusArea: "Recovery",
          sessionSummary: "Easy Running",
          sessionDescription: `Warm Up with drills, ${baseMileage}km total easy running, warm down with 10 sets of strides`,
          totalDistance: wednesdayBaseMileage,
          warmUp: 2.5,
          warmDown: 2.5,
          recoveries: "N/A",
        };
      }
      return {
        focusArea: "Rest",
        sessionSummary: "Rest",
        sessionDescription: "Rest",
        totalDistance: 0,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isRest: true,
      };

    case "Thursday":
      if (sessionsCount > 3) {
        const thu = getThursdayFocus(blockCount, planBlockCount);
        return {
          focusArea: thu.focus,
          sessionType: thu.sessionType,
          needsSessionSelection: true,
        };
      }
      return {
        focusArea: "Base",
        sessionSummary: "Easy Running",
        sessionDescription: `Warm Up with drills, ${baseMileage}km total easy running, warm down with 10 sets of strides`,
        totalDistance: baseMileage,
        warmUp: 2.5,
        warmDown: 2.5,
        recoveries: "N/A",
      };

    case "Friday":
      return {
        focusArea: "Rest",
        sessionSummary: "Rest/S&C",
        sessionDescription:
          "Rest or Strength & Conditioning Work (focus on single leg weight exercises)",
        totalDistance: 0,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isRest: true,
      };

    case "Saturday":
      if (sessionsCount >= 4) {
        return {
          focusArea: "Base",
          sessionSummary: "Easy Running",
          sessionDescription: `Warm Up with drills, ${baseMileage}km total easy running, warm down with 10 sets of strides`,
          totalDistance: baseMileage,
          warmUp: 2.5,
          warmDown: 2.5,
          recoveries: "N/A",
        };
      }
      return {
        focusArea: "Rest",
        sessionSummary: "Rest",
        sessionDescription: "Rest",
        totalDistance: 0,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isRest: true,
      };

    case "Sunday":
      return {
        focusArea: "Long Run",
        sessionSummary: "Endurance",
        sessionDescription: `Warm Up with drills then ${longRunMileage}km easy running, easy warm down`,
        totalDistance: longRunMileage,
        warmUp: 3,
        warmDown: 3,
        recoveries: "N/A",
      };

    default:
      return {
        focusArea: "Rest",
        sessionSummary: "Rest",
        sessionDescription: "Rest",
        totalDistance: 0,
        warmUp: 0,
        warmDown: 0,
        recoveries: "",
        isRest: true,
      };
  }
}

export function getWarmUpDown(totalDistance: number): {
  warmUp: number;
  warmDown: number;
} {
  if (totalDistance < 8) return { warmUp: 1, warmDown: 1 };
  if (totalDistance <= 10) return { warmUp: 2.5, warmDown: 2.5 };
  return { warmUp: 3, warmDown: 3 };
}

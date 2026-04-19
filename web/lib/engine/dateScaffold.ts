import type { DayOfWeek, ScaffoldDay } from "./types";

const DAY_NAMES: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getNextMonday(fromDate: Date): Date {
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  let daysUntilMon: number;
  if (dow === 1) daysUntilMon = 0;
  else if (dow === 0) daysUntilMon = 1;
  else daysUntilMon = 8 - dow;
  d.setDate(d.getDate() + daysUntilMon);
  return d;
}

export function getDayName(date: Date): DayOfWeek {
  const jsDay = date.getDay();
  return DAY_NAMES[jsDay === 0 ? 6 : jsDay - 1];
}

export function createDateScaffold(
  startDate: Date,
  raceDate: Date,
): ScaffoldDay[] {
  const nextMon = getNextMonday(startDate);
  const target = new Date(raceDate);
  target.setHours(0, 0, 0, 0);

  const days: ScaffoldDay[] = [];
  let dayCount = 1;
  const current = new Date(nextMon);

  while (current <= target) {
    days.push({
      dayCount,
      date: new Date(current),
      dayOfWeek: getDayName(current),
      dateStr: current.toISOString().split("T")[0],
      weekDay: current.getDay(),
    });
    dayCount++;
    current.setDate(current.getDate() + 1);
  }

  return days;
}

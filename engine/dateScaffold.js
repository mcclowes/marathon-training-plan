/**
 * dateScaffold.js — Generates day count and date table
 * Mirrors VBA: CreateDayCountAndDateTable
 * Starts from next Monday, generates day rows up to race date
 */

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export function getNextMonday(fromDate) {
  const d = new Date(fromDate);
  d.setHours(0,0,0,0);
  const dow = d.getDay(); // 0=Sun,1=Mon,...6=Sat
  let daysUntilMon;
  if (dow === 1) {
    daysUntilMon = 0; // already Monday
  } else if (dow === 0) {
    daysUntilMon = 1;
  } else {
    daysUntilMon = 8 - dow;
  }
  d.setDate(d.getDate() + daysUntilMon);
  return d;
}

export function getDayName(date) {
  // 0=Sun -> 'Sunday', 1=Mon -> 'Monday' etc
  const jsDay = date.getDay();
  return DAY_NAMES[jsDay === 0 ? 6 : jsDay - 1];
}

export function createDateScaffold(startDate, raceDate) {
  const nextMon = getNextMonday(startDate);
  const target = new Date(raceDate);
  target.setHours(0,0,0,0);
  
  const days = [];
  let dayCount = 1;
  let current = new Date(nextMon);
  
  while (current <= target) {
    days.push({
      dayCount,
      date: new Date(current),
      dayOfWeek: getDayName(current),
      dateStr: current.toISOString().split('T')[0],
      weekDay: current.getDay() // 0-6
    });
    dayCount++;
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

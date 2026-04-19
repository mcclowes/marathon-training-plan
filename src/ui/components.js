/**
 * components.js — Reusable UI components + helpers
 */

export function focusBadgeClass(focusArea) {
  const fa = (focusArea || '').toLowerCase().replace(/\s+/g, '-');
  const map = {
    'rest': 'badge-rest', 'speed': 'badge-speed', 'speed-endurance': 'badge-se',
    'tempo': 'badge-tempo', 'base': 'badge-base', 'long-run': 'badge-long-run',
    'recovery': 'badge-recovery', 'race-day': 'badge-race',
    'pre-race-shakeout': 'badge-taper',
  };
  return map[fa] || 'badge-rest';
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((target - now) / 86400000);
}

export function getTodayStr() { return new Date().toISOString().split('T')[0]; }

export function findTodayIndex(days) {
  const today = getTodayStr();
  return days.findIndex(d => d.dateStr === today);
}

export function findCurrentWeek(weeks) {
  const today = getTodayStr();
  for (let i = 0; i < weeks.length; i++) {
    for (const d of weeks[i].days) {
      if (d.dateStr === today) return i;
    }
  }
  if (weeks.length > 0 && today < weeks[0].days[0].dateStr) return 0;
  return weeks.length - 1;
}

/** Determine dominant focus for a week */
export function getWeekFocus(week) {
  let speed = 0, se = 0, tempo = 0, other = 0;
  for (const d of week.days) {
    const fa = (d.focusArea || '').toLowerCase();
    if (fa === 'speed') speed++;
    else if (fa === 'speed endurance') se++;
    else if (fa === 'tempo') tempo++;
    else other++;
  }
  if (speed > se && speed > tempo) return 'speed';
  if (se > speed && se > tempo) return 'se';
  if (tempo > 0) return 'se';
  return 'endurance';
}

/** Full label for week focus */
export function getWeekFocusLabel(focus) {
  const map = { 'speed': 'Speed', 'se': 'Speed Endurance', 'endurance': 'Endurance' };
  return map[focus] || 'Endurance';
}

/** Calculate hard/easy km split for a week */
export function getWeekHardEasy(week) {
  let hard = 0, easy = 0;
  for (const d of week.days) {
    const fa = (d.focusArea || '').toLowerCase();
    const dist = d.totalDistance || 0;
    if (['speed','speed endurance','tempo','long run'].includes(fa)) hard += dist;
    else easy += dist;
  }
  return { hard: Math.round(hard * 10) / 10, easy: Math.round(easy * 10) / 10 };
}

/** Count active sessions in a week */
export function getWeekSessionCount(week) {
  return week.days.filter(d => {
    const fa = (d.focusArea || '').toLowerCase();
    return fa !== 'rest' && d.totalDistance > 0;
  }).length;
}

/** Focus marker CSS class */
export function focusMarkerClass(focus) {
  if (focus === 'speed') return 'fm-speed';
  if (focus === 'se') return 'fm-se';
  return 'fm-endurance';
}

/** Calculate total days until race */
export function getDaysToRace(planMeta) {
  if (!planMeta || !planMeta.raceDate) return 0;
  return Math.max(0, daysUntil(planMeta.raceDate));
}

/** Count total remaining sessions from today */
export function getRemainingSessions(weeks) {
  const today = getTodayStr();
  let count = 0;
  for (const w of weeks) {
    for (const d of w.days) {
      if (d.dateStr >= today) {
        const fa = (d.focusArea || '').toLowerCase();
        if (fa !== 'rest' && d.totalDistance > 0) count++;
      }
    }
  }
  return count;
}

/** Count total sessions in entire plan */
export function getTotalSessions(weeks) {
  let count = 0;
  for (const w of weeks) {
    for (const d of w.days) {
      const fa = (d.focusArea || '').toLowerCase();
      if (fa !== 'rest' && d.totalDistance > 0) count++;
    }
  }
  return count;
}

export function icon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15,18 9,12 15,6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" width="14" height="14"><polyline points="20,6 9,17 4,12"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="15,18 9,12 15,6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="9,18 15,12 9,6"/></svg>',
  };
  return icons[name] || '';
}

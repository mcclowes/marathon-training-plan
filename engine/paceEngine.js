/**
 * paceEngine.js — Pace calculation and guidance string generation
 * Mirrors VBA: Check_Paces, CalculateSpeedIncrease, FindDistances, CallPaceTables
 * Uses extracted pace tables, builds pace guidance by parsing session descriptions
 */

// Convert "HH:MM:SS" to seconds
export function paceStrToSeconds(str) {
  if (!str) return 0;
  const parts = str.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
}

// Convert seconds to "M:SS" min/km display
export function secondsToMinKm(secs) {
  if (!secs || secs <= 0) return '--:--';
  const mins = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${mins}:${s.toString().padStart(2, '0')}`;
}

// Convert seconds to "H:MM:SS" display  
export function secondsToHMS(secs) {
  if (!secs || secs <= 0) return '0:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Find the current pace index by looking up in ConvertedTable
 * Mirrors VBA: Check_Paces
 */
export function findPaceIndex(config, raceDistance, currentPace) {
  const { convertedTable, paceColumns } = config;
  const currentPaceSecs = paceStrToSeconds(currentPace);
  
  // Find row matching raceDistance
  const row = convertedTable.rows.find(r => r.distance === raceDistance);
  if (!row) return { paceIndex: 8, headerValue: '03:40:00' }; // fallback
  
  // Find column where current pace < column value
  for (let i = 0; i < paceColumns.length; i++) {
    const colKey = paceColumns[i];
    const colVal = row[colKey] || 0;
    if (currentPaceSecs < colVal) {
      return {
        paceIndex: i + 1,
        headerValue: colKey
      };
    }
  }
  
  return { paceIndex: 13, headerValue: '04:30:00' };
}

/**
 * Calculate days between pace uplifts
 * Mirrors VBA: CalculateSpeedIncrease
 */
export function calculatePaceUplift(headerValue, targetPace, maxDayCount) {
  const headerSecs = paceStrToSeconds(headerValue);
  const targetSecs = paceStrToSeconds(targetPace);
  const diffSecs = headerSecs - targetSecs;
  
  // Convert diff to 10-minute increments (600 seconds each)
  const increments = Math.round(diffSecs / 600);
  
  if (increments <= 0) return maxDayCount; // no change needed
  if (increments >= 13) return Math.floor(maxDayCount / 12);
  
  return Math.floor(maxDayCount / increments);
}

/**
 * Get pace table name from PaceSummary
 * Mirrors VBA: SpeedPaceTable, SpeedEndurancePaceTable, TempoPaceTable
 */
export function getPaceTableNames(config, paceIndex, style) {
  const summary = config.paceSummary.rows;
  if (paceIndex < 1 || paceIndex > summary.length) {
    paceIndex = Math.max(1, Math.min(13, paceIndex));
  }
  const row = summary[paceIndex - 1];
  if (!row) return { speed: null, se: null, tempo: null };
  
  const speedCol = style === 'Endurance' ? 'Speed_Endurance' : 'Speed_Speedster';
  const seCol = style === 'Endurance' ? 'SE_Endurance' : 'SE_Speedster';
  
  return {
    speed: row[speedCol] || null,
    se: row[seCol] || null,
    tempo: row['Tempo'] || null
  };
}

/**
 * Load pace values from a specific pace table
 * Returns { upper, lower, upperDif, lowerDif } arrays
 */
export function loadPaceTable(paceTables, tableName) {
  const table = paceTables[tableName];
  if (!table) return null;
  
  return table.map(row => ({
    label: row.label,
    upper: row.Upper || 0,
    lower: row.Lower || 0,
    upperDif: row.UppeDif || 0,
    lowerDif: row.LowerDif || 0
  }));
}

/**
 * Build pace guidance string for a session
 * Mirrors VBA: FindDistances — uses regex to find interval distances in description
 */
export function buildPaceGuidance(focusArea, description, paceData, dayIndex, daysUntilPaceUplift) {
  if (!paceData || !description) return '';
  
  const { speedPaces, sePaces, tempoPaces } = paceData;
  const ii = daysUntilPaceUplift > 0 ? (dayIndex % daysUntilPaceUplift) : 0;
  
  const fmt = (secs) => secondsToMinKm(secs);
  
  function paceAtDay(upper, upperDif, lower, lowerDif) {
    const u = upper - (upperDif * ii / (daysUntilPaceUplift || 1));
    const l = lower ? lower - (lowerDif * ii / (daysUntilPaceUplift || 1)) : 0;
    if (l > 0) return `${fmt(u)} to ${fmt(l)}`;
    return fmt(u);
  }
  
  const lines = [];
  const desc = description || '';
  
  if (focusArea === 'Speed' && speedPaces) {
    const distMap = [
      { pattern: /\b100\b/, label: "100's", idx: 0 },
      { pattern: /\b200\b/, label: "200's", idx: 1 },
      { pattern: /\b300\b/, label: "300's", idx: 2 },
      { pattern: /\b400\b/, label: "400's", idx: 3 },
      { pattern: /\b500\b/, label: "500's", idx: 4 },
      { pattern: /\b600\b/, label: "600's", idx: 5 },
    ];
    for (const d of distMap) {
      if (d.pattern.test(desc) && speedPaces[d.idx]) {
        const p = speedPaces[d.idx];
        lines.push(`${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`);
      }
    }
  } else if ((focusArea === 'Speed Endurance' || focusArea === 'SE') && sePaces) {
    const distMap = [
      { pattern: /\b600\b/, label: "600's", idx: 0 },
      { pattern: /\b800\b/, label: "800's", idx: 1 },
      { pattern: /\b1000\b/, label: "1000's", idx: 2 },
      { pattern: /\b1200\b/, label: "1200's", idx: 3 },
      { pattern: /\b1600\b/, label: "1600's", idx: 4 },
    ];
    for (const d of distMap) {
      if (d.pattern.test(desc) && sePaces[d.idx]) {
        const p = sePaces[d.idx];
        lines.push(`${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`);
      }
    }
  } else if (focusArea === 'Tempo' && tempoPaces) {
    const distMap = [
      { pattern: /\b1000\b/, label: "1000's", seIdx: 0 },
      { pattern: /\b2000\b/, label: "2000's", seIdx: 1 },
      { pattern: /\b3000\b/, label: "3000's", seIdx: 2 },
      { pattern: /\b4000\b/, label: "4000's", seIdx: 3 },
      { pattern: /\b5000\b/, label: "5000's", seIdx: 4 },
    ];
    // Tempo uses SE pace references for intervals (per VBA)
    if (sePaces) {
      for (const d of distMap) {
        if (d.pattern.test(desc) && sePaces[d.seIdx]) {
          const p = sePaces[d.seIdx];
          lines.push(`${d.label} @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`);
        }
      }
    }
  } else if (focusArea === 'Base' && tempoPaces && tempoPaces.length > 5) {
    const p = tempoPaces[5]; // Easy Runs (index 5 in tempo table, row 6)
    if (p) lines.push(`Easy Running @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`);
  } else if (focusArea === 'Recovery' && tempoPaces && tempoPaces.length > 3) {
    const p = tempoPaces[3]; // Recovery Jog (index 3, row 4)
    if (p) lines.push(`Recovery Jog @ ${paceAtDay(p.upper, p.upperDif, p.lower, p.lowerDif)} min/km`);
  } else if (focusArea === 'Long Run' && tempoPaces) {
    if (tempoPaces[4]) {
      const lr = tempoPaces[4]; // Long Runs
      lines.push(`Start steady @ ${paceAtDay(lr.upper, lr.upperDif, lr.lower, lr.lowerDif)} min/km`);
    }
    if (tempoPaces[6]) {
      const ss = tempoPaces[6]; // Steady State
      lines.push(`Build to @ ${paceAtDay(ss.upper, ss.upperDif, ss.lower, ss.lowerDif)} min/km`);
    }
    if (tempoPaces[7]) {
      const tr = tempoPaces[7]; // Tempo Runs
      lines.push(`Finish strong @ ${paceAtDay(tr.upper, tr.upperDif, tr.lower, tr.lowerDif)} min/km`);
    }
  }
  
  return lines.join('\n');
}

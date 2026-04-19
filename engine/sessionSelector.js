/**
 * sessionSelector.js — Select sessions from SessionMatrix templates
 * Mirrors VBA: UnifiedSessionSelection, CallLoop, SessionLoop
 *
 * Session selection strategy:
 *   - Target = intensityPerSessionMeters (from distanceAllocation)
 *   - Match against template's "Session Distance" field (not Total Distance)
 *   - Warm-ups/warm-downs are excluded from Session Distance (they are base mileage)
 *   - Tolerance widens in +100m steps until a match is found
 *   - Falls back to closest match if no tolerance match found
 */

/**
 * getSessionTableName
 * Maps session type + week-in-block + block length → template table name.
 *
 * @param {string} sessionType    'Speed' | 'SE' | 'Tempo'
 * @param {number} weekCount      week number within the current block (1-based)
 * @param {number} planBlockLength block length in weeks (8, 10, or 12)
 */
export function getSessionTableName(sessionType, weekCount, planBlockLength) {
  if (sessionType === 'Speed' || sessionType === 'SE') {
    if (planBlockLength === 8 || planBlockLength === 12) {
      switch (weekCount) {
        case 1: case 5: case 9: case 13: case 17:
          return sessionType + '_EvenBlocks';
        case 2: case 10: case 18:
          return sessionType + '_Pyramid';
        case 3: case 11: case 19:
          return sessionType + '_MSets';
        case 4: case 8: case 12: case 16: case 20:
          return sessionType + '_CutDowns';
        case 6: case 14:
          return sessionType + '_ReversePyramid';
        case 7: case 15:
          return sessionType + '_WSets';
        default:
          return sessionType + '_EvenBlocks';
      }
    } else if (planBlockLength === 10) {
      switch (weekCount) {
        case 1: case 4: case 7: case 11: case 14:
          return sessionType + '_EvenBlocks';
        case 2: case 12:
          return sessionType + '_Pyramid';
        case 5: case 15:
          return sessionType + '_MSets';
        case 3: case 6: case 10: case 13: case 16:
          return sessionType + '_CutDowns';
        case 8:
          return sessionType + '_ReversePyramid';
        case 9:
          return sessionType + '_WSets';
        default:
          return sessionType + '_EvenBlocks';
      }
    }
  } else if (sessionType === 'Tempo') {
    return weekCount % 2 === 1 ? 'Tempo_EvenBlocks' : 'Tempo_CutDown';
  }
  return sessionType + '_EvenBlocks';
}

export function getFinalSessionTableName(sessionType) {
  if (sessionType === 'Speed' || sessionType === 'SE') {
    return sessionType + '_CutDowns';
  }
  return 'Tempo_EvenBlocks';
}

/**
 * extractReps — collect Rep 1, Rep 2, … from a template row
 * @param {Object} row
 * @returns {number[]}  rep distances in meters
 */
function extractReps(row) {
  const reps = [];
  for (let n = 1; row[`Rep ${n}`] !== undefined && row[`Rep ${n}`] !== null; n++) {
    const v = Number(row[`Rep ${n}`]);
    if (!isNaN(v) && v > 0) reps.push(v);
  }
  return reps;
}

/**
 * buildResult — construct a standardised session result object from a template row
 */
function buildResult(row) {
  return {
    totalDistance:   (row['Total Distance'] || 0) / 1000,
    sessionDistance: row['Session Distance'] || 0,
    summary:         row['Summary'] || '',
    description:     row['Details'] || '',
    recoveries:      row['Recoveries'] || '',
    stimulus:        row['Stimulus'] || '',
    block:           row['Block'] || '',
    summaryNum:      row['Summary #'] ?? null,
    sessionNum:      row['Session #'] ?? null,
    reps:            extractReps(row),
    warmUp:          2.5,
    warmDown:        2.5
  };
}

/**
 * selectSession
 * Selects the closest-matching session from a template table.
 *
 * @param {Object} sessionTemplates  full templates JSON
 * @param {string} tableName         which table to search
 * @param {number} targetDistance    target session distance in METERS
 * @returns {Object|null}
 */
export function selectSession(sessionTemplates, tableName, targetDistance) {
  const table = sessionTemplates[tableName];
  if (!table || table.length === 0) return null;

  let tolerance = 100;
  const maxTolerance = 2000;
  const maxAttempts  = 20;

  // Widen tolerance until we find a match via random sampling
  while (tolerance <= maxTolerance) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const idx  = Math.floor(Math.random() * table.length);
      const row  = table[idx];
      const dist = row['Session Distance'] || 0;
      if (Math.abs(targetDistance - dist) <= tolerance) {
        return buildResult(row);
      }
    }
    tolerance += 100;
  }

  // Deterministic fallback: pick row with Session Distance closest to target
  let bestIdx  = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < table.length; i++) {
    const d = Math.abs(targetDistance - (table[i]['Session Distance'] || 0));
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  }
  return buildResult(table[bestIdx]);
}

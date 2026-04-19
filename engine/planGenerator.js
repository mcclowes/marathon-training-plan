/**
 * planGenerator.js — Main orchestrator
 *
 * Flow:
 *   A) Date scaffold
 *   B) Block optimisation (variable-length pyramidal blocks)
 *   C) Per-block mileage progression
 *   D) Pace setup
 *   E) Day-by-day plan assembly, block by block
 *   F) Build weeks array
 */

import { createDateScaffold } from './dateScaffold.js';
import { optimizeBlocks } from './blockOptimizer.js';
import { progressWeeklyMileageByBlocks } from './mileageProgression.js';
import { calculateDistances } from './distanceAllocation.js';
import { getSessionTableName, getFinalSessionTableName, selectSession } from './sessionSelector.js';
import { getDayAssignment, getWarmUpDown } from './weeklySchedule.js';
import { isTaperDay, getTaperSession } from './taperProtocol.js';
import { findPaceIndex, calculatePaceUplift, getPaceTableNames, loadPaceTable, buildPaceGuidance } from './paceEngine.js';

// ---------------------------------------------------------------------------
// Session count helpers
// ---------------------------------------------------------------------------

function adjustSessionsCount(sessionsPerWeek, startingDistance) {
  let sc = Math.max(3, sessionsPerWeek);
  if (startingDistance < 40) sc = 3;
  if (startingDistance > 90) sc = 5;
  if ((sc === 3 || sc === 4) && startingDistance > 50) sc = 4;
  if (sc === 5 && startingDistance < 50) sc = 4;
  return sc;
}

function clampSessionCount(sc, totalWeeklyMileage) {
  if (totalWeeklyMileage > 90) return 5;
  if (sc >= 5 && totalWeeklyMileage < 60) return 4;
  if ((sc === 3 || sc === 4) && totalWeeklyMileage > 60) return 4;
  return Math.min(5, Math.max(3, sc));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateTrainingPlan(input, dataStore) {
  const {
    raceDate,
    sessionsPerWeek,
    currentMileage,
    targetMileage,
    raceDistance = 'Marathon',
    currentPace,
    targetPace,
    style = 'Endurance'
  } = input;

  const { sessionTemplates, paceTables, config } = dataStore;

  // ── Phase A: Date scaffold ────────────────────────────────────────────────
  const today    = new Date();
  const scaffold = createDateScaffold(today, new Date(raceDate));
  const maxDayCount = scaffold.length;

  if (maxDayCount < 56) {
    throw new Error('Race date too close. Need at least 8 weeks.');
  }

  // ── Phase B: Block optimisation ───────────────────────────────────────────
  const lastDate = scaffold[scaffold.length - 1].date;
  const blockInfo = optimizeBlocks(maxDayCount, lastDate);
  const { blocks, planBlockCount, taperStartDayIndex } = blockInfo;
  // Legacy compat fields still present on blockInfo:
  const planBlockLength = blockInfo.planBlockLength;

  // ── Phase C: Per-block mileage progression ────────────────────────────────
  const startingDistance   = currentMileage;
  const targetTotalDistance = targetMileage;

  const weeklyMileageData = progressWeeklyMileageByBlocks(
    startingDistance, targetTotalDistance, blocks
  );

  // ── Phase D: Pace setup ───────────────────────────────────────────────────
  const { paceIndex: startPaceIndex, headerValue } = findPaceIndex(config, raceDistance, currentPace);
  const daysUntilPaceUplift = calculatePaceUplift(headerValue, targetPace, maxDayCount);

  let currentPaceIndex = startPaceIndex;

  function refreshPaces() {
    const names = getPaceTableNames(config, currentPaceIndex, style);
    speedPaces = names.speed ? loadPaceTable(paceTables, names.speed) : null;
    sePaces    = names.se    ? loadPaceTable(paceTables, names.se)    : null;
    tempoPaces = names.tempo ? loadPaceTable(paceTables, names.tempo) : null;
  }

  let { speedPaces, sePaces, tempoPaces } = (() => {
    const names = getPaceTableNames(config, currentPaceIndex, style);
    return {
      speedPaces: names.speed ? loadPaceTable(paceTables, names.speed) : null,
      sePaces:    names.se    ? loadPaceTable(paceTables, names.se)    : null,
      tempoPaces: names.tempo ? loadPaceTable(paceTables, names.tempo) : null
    };
  })();

  // ── Phase E: Day-by-day plan assembly ────────────────────────────────────
  const days = [];

  let globalDayIndex  = 0;   // 0-based index into scaffold[]
  let globalWeekIndex = 0;   // 0-based index into weeklyMileageData[]
  let paceDay         = 0;
  let sessionsCount   = adjustSessionsCount(sessionsPerWeek, startingDistance);

  // Current week mileage (set at start of each week from weeklyMileageData)
  let totalWeeklyMileage = startingDistance;

  // processDay: resolve one calendar day and push to days[]
  function processDay(blockCount1, weekInBlock, blockWeeks, weekMileage) {
    const dayData = scaffold[globalDayIndex];
    if (!dayData) return;

    // Pace uplift check
    paceDay++;
    if (daysUntilPaceUplift > 0 && paceDay >= daysUntilPaceUplift) {
      currentPaceIndex = Math.max(1, currentPaceIndex - 1);
      refreshPaces();
      paceDay = 0;
    }

    // ── Taper override ──
    if (isTaperDay(globalDayIndex + 1, maxDayCount)) {
      const prevFocus  = globalDayIndex > 0 && days[globalDayIndex - 1]
        ? days[globalDayIndex - 1].focusArea : '';
      const taperSess  = getTaperSession(globalDayIndex + 1, maxDayCount, prevFocus);

      if (taperSess) {
        if (taperSess.useFinalSelection && sessionTemplates) {
          const tbl      = getFinalSessionTableName(taperSess.sessionType);
          const selected = selectSession(sessionTemplates, tbl, taperSess.intensityMileage);
          if (selected) {
            taperSess.sessionSummary      = selected.summary;
            taperSess.sessionDescription  = selected.description;
            taperSess.totalDistance       = selected.totalDistance;
            taperSess.recoveries          = selected.recoveries;
            taperSess.block               = selected.block;
            taperSess.stimulus            = selected.stimulus;
            taperSess.reps                = selected.reps;
          }
        }

        const paces = buildPaceGuidance(
          taperSess.focusArea, taperSess.sessionDescription,
          { speedPaces, sePaces, tempoPaces }, paceDay, daysUntilPaceUplift
        );

        days.push({
          ...dayData,
          focusArea:          taperSess.focusArea,
          sessionSummary:     taperSess.sessionSummary,
          sessionDescription: taperSess.sessionDescription,
          totalDistance:      taperSess.totalDistance,
          warmUp:             taperSess.warmUp   || 0,
          warmDown:           taperSess.warmDown || 0,
          recoveries:         taperSess.recoveries || '',
          block:              taperSess.block     || '',
          stimulus:           taperSess.stimulus  || '',
          reps:               taperSess.reps      || [],
          paces,
          weekNumber:    Math.ceil((globalDayIndex + 1) / 7),
          blockNumber:   blockCount1,
          weeklyMileage: Math.round(weekMileage),
          isTaper:       true,
          isRest:        taperSess.focusArea === 'Rest',
          sessionsCount
        });
        return;
      }
    }

    // ── Normal day ──
    const distances  = calculateDistances(weekMileage, sessionsCount);
    const assignment = getDayAssignment(dayData.dayOfWeek, {
      sessionsCount, blockCount: blockCount1, planBlockCount, distances
    });

    let finalDay = { ...dayData };

    if (assignment.needsSessionSelection && sessionTemplates) {
      // Session distance matching: use per-session intensity target in meters
      const tableName = getSessionTableName(assignment.sessionType, weekInBlock, blockWeeks);
      const selected  = selectSession(sessionTemplates, tableName, distances.intensityMileage);

      if (selected) {
        finalDay.focusArea          = assignment.focusArea;
        finalDay.sessionSummary     = selected.summary;
        finalDay.sessionDescription = selected.description;
        finalDay.totalDistance      = selected.totalDistance;
        finalDay.warmUp             = selected.warmUp;
        finalDay.warmDown           = selected.warmDown;
        finalDay.recoveries         = selected.recoveries;
        finalDay.block              = selected.block;
        finalDay.stimulus           = selected.stimulus;
        finalDay.reps               = selected.reps || [];
        finalDay.sessionDistance    = selected.sessionDistance;
      } else {
        finalDay.focusArea          = assignment.focusArea;
        finalDay.sessionSummary     = 'Training Session';
        finalDay.sessionDescription = `${assignment.focusArea} training`;
        finalDay.totalDistance      = Math.round(distances.intensityMileage / 1000);
        finalDay.reps               = [];
      }
    } else {
      finalDay.focusArea          = assignment.focusArea;
      finalDay.sessionSummary     = assignment.sessionSummary;
      finalDay.sessionDescription = assignment.sessionDescription;
      finalDay.totalDistance      = assignment.totalDistance;
      finalDay.warmUp             = assignment.warmUp  || 0;
      finalDay.warmDown           = assignment.warmDown || 0;
      finalDay.recoveries         = assignment.recoveries || '';
      finalDay.isRest             = assignment.isRest || false;
      finalDay.block              = '';
      finalDay.stimulus           = '';
      finalDay.reps               = [];

      if (!assignment.isRest && assignment.totalDistance > 0) {
        const wud     = getWarmUpDown(assignment.totalDistance);
        finalDay.warmUp   = wud.warmUp;
        finalDay.warmDown = wud.warmDown;
      }
    }

    finalDay.paces = buildPaceGuidance(
      finalDay.focusArea, finalDay.sessionDescription,
      { speedPaces, sePaces, tempoPaces }, paceDay, daysUntilPaceUplift
    );

    finalDay.weekNumber    = Math.ceil((globalDayIndex + 1) / 7);
    finalDay.blockNumber   = blockCount1;
    finalDay.weeklyMileage = Math.round(weekMileage);
    finalDay.isTaper       = false;
    finalDay.sessionsCount = sessionsCount;

    finalDay._debug = {
      blockCount: blockCount1,
      weekInBlock,
      blockWeeks,
      sessionsCount,
      totalWeeklyMileage: Math.round(weekMileage),
      intensityMileage:   distances.intensityMileage,
      baseMileage:        distances.baseMileage,
      longRunMileage:     distances.longRunMileage,
      paceIndex:          currentPaceIndex
    };

    days.push(finalDay);
  }

  // ── Main block loop ───────────────────────────────────────────────────────
  for (let bi = 0; bi < blocks.length && globalDayIndex < maxDayCount; bi++) {
    const block      = blocks[bi];
    const blockCount = bi + 1; // 1-indexed

    // ── Session weeks ──
    for (let sw = 0; sw < block.sessionWeeks && globalDayIndex < maxDayCount; sw++) {
      const weekInBlock = sw + 1;
      const wData       = weeklyMileageData[globalWeekIndex];
      totalWeeklyMileage = wData ? wData.weekMileage : startingDistance;

      sessionsCount = clampSessionCount(sessionsCount, totalWeeklyMileage);

      for (let d = 0; d < 7 && globalDayIndex < maxDayCount; d++) {
        processDay(blockCount, weekInBlock, block.blockWeeks, totalWeeklyMileage);
        globalDayIndex++;
      }
      globalWeekIndex++;
    }

    // ── Deload weeks ──
    for (let dw = 0; dw < block.deloadWeeks && globalDayIndex < maxDayCount; dw++) {
      const weekInBlock = block.sessionWeeks + dw + 1;
      const wData       = weeklyMileageData[globalWeekIndex];
      totalWeeklyMileage = wData ? wData.weekMileage : startingDistance;

      sessionsCount = clampSessionCount(sessionsCount, totalWeeklyMileage);

      for (let d = 0; d < 7 && globalDayIndex < maxDayCount; d++) {
        processDay(blockCount, weekInBlock, block.blockWeeks, totalWeeklyMileage);
        globalDayIndex++;
      }
      globalWeekIndex++;
    }
  }

  // ── Taper / slack days not covered by blocks ──
  while (globalDayIndex < maxDayCount) {
    const blockCount = blocks.length;
    processDay(blockCount, 0, planBlockLength, totalWeeklyMileage);
    globalDayIndex++;
  }

  // ── Phase F: Build weeks array ────────────────────────────────────────────
  const weeks = [];
  let currentWeek = null;

  for (const day of days) {
    const wn = day.weekNumber;
    if (!currentWeek || currentWeek.weekNumber !== wn) {
      if (currentWeek) weeks.push(currentWeek);
      currentWeek = {
        weekNumber:   wn,
        days:         [],
        totalMileage: 0,
        blockNumber:  day.blockNumber,
        isTaper:      false
      };
    }
    currentWeek.days.push(day);
    currentWeek.totalMileage += day.totalDistance || 0;
    if (day.isTaper) currentWeek.isTaper = true;
  }
  if (currentWeek) weeks.push(currentWeek);

  weeks.forEach(w => { w.totalMileage = Math.round(w.totalMileage * 10) / 10; });

  // ── Plan metadata ─────────────────────────────────────────────────────────
  const planMeta = {
    raceDate:       input.raceDate,
    totalDays:      maxDayCount,
    totalWeeks:     weeks.length,
    planBlockCount,
    planBlockLength,
    blocks:         blocks.map(b => ({ blockWeeks: b.blockWeeks, sessionWeeks: b.sessionWeeks })),
    taperStartDayIndex,
    slackDays:      blockInfo.slackDays,
    startingDistance,
    targetDistance: targetTotalDistance,
    style,
    raceDistance,
    startPaceIndex,
    generatedAt:    new Date().toISOString()
  };

  return { planMeta, days, weeks };
}

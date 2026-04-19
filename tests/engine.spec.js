/**
 * engine.spec.js — Unit tests for engine modules
 * Renders results into #results DOM element (browser-run via testRunner.html)
 */

import { getNextMonday, createDateScaffold, getDayName } from '../engine/dateScaffold.js';
import { optimizeBlocks, isPyramidal, isUniform } from '../engine/blockOptimizer.js';
import { calculateGrowthRate, progressWeeklyMileageByBlocks } from '../engine/mileageProgression.js';
import { calculateDistances } from '../engine/distanceAllocation.js';
import { getSessionTableName, getFinalSessionTableName } from '../engine/sessionSelector.js';
import { isTaperDay, getTaperSession } from '../engine/taperProtocol.js';
import { paceStrToSeconds, secondsToMinKm } from '../engine/paceEngine.js';

const $results = document.getElementById('results');
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    $results.innerHTML += `<div class="pass">✓ ${name}</div>`;
    passed++;
  } catch (e) {
    $results.innerHTML += `<div class="fail">✗ ${name}: ${e.message}</div>`;
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || ''} Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertApprox(a, b, tolerance, msg) {
  if (Math.abs(a - b) > tolerance) throw new Error(`${msg || ''} Expected ~${b}, got ${a}`);
}
function assertLte(a, b, msg) {
  if (a > b) throw new Error(`${msg || ''} Expected ${a} <= ${b}`);
}

function makeMockBlocks(sizes) {
  return sizes.map((bw, i) => ({
    blockIndex: i, blockWeeks: bw,
    sessionWeeks: bw - 2, deloadWeeks: 2
  }));
}

// ===== DATE SCAFFOLD =====
$results.innerHTML += '<h2>dateScaffold</h2>';

test('getNextMonday from a Wednesday', () => {
  const wed = new Date(2025, 5, 4);
  const mon = getNextMonday(wed);
  assert(mon.getDay() === 1, 'Should be Monday');
  assert(mon >= wed, 'Should be >= input');
});

test('getNextMonday from Monday returns same day', () => {
  const mon = new Date(2025, 5, 2);
  const result = getNextMonday(mon);
  assert(result.getDay() === 1, 'Should be Monday');
  assert(result.getDate() === 2, 'Should be same day');
});

test('createDateScaffold starts on Monday', () => {
  const start = new Date(2025, 0, 6);
  const end   = new Date(2025, 3, 6);
  const sc    = createDateScaffold(start, end);
  assert(sc.length > 80, `Should have ~91 days, got ${sc.length}`);
  assertEq(sc[0].dayOfWeek, 'Monday', 'First day should be Monday');
});

test('getDayName returns correct day names', () => {
  assertEq(getDayName(new Date(2025, 5, 2)), 'Monday');
  assertEq(getDayName(new Date(2025, 5, 7)), 'Saturday');
});

// ===== BLOCK OPTIMIZER =====
$results.innerHTML += '<h2>blockOptimizer</h2>';

test('optimizeBlocks returns valid block structure', () => {
  const result = optimizeBlocks(200, new Date(2025, 9, 25));
  assert(result.planBlockCount >= 1, 'Should have at least 1 block');
  assert(Array.isArray(result.blocks), 'blocks should be array');
  result.blocks.forEach(b => {
    assert([8, 10, 12].includes(b.blockWeeks), `Invalid blockWeeks ${b.blockWeeks}`);
    assertEq(b.deloadWeeks, 2);
  });
});

test('optimizeBlocks returns ≤5 blocks', () => {
  assertLte(optimizeBlocks(200, new Date()).planBlockCount, 5);
});

test('optimizeBlocks taperStartDayIndex = maxDayCount - 17', () => {
  const r = optimizeBlocks(200, new Date());
  assertEq(r.taperStartDayIndex, 200 - 17);
});

test('isPyramidal [8,10,12,8] = true', () => {
  assert(isPyramidal([8, 10, 12, 8]));
});

test('isPyramidal [8,12,12,10] = false (jump +4)', () => {
  assert(!isPyramidal([8, 12, 12, 10]));
});

test('isPyramidal [8,12,8,10,10] = false (valley then rise)', () => {
  assert(!isPyramidal([8, 12, 8, 10, 10]));
});

test('isUniform [10,10,10] = true', () => {
  assert(isUniform([10, 10, 10]));
});

test('optimizeBlocks: block sequence is pyramidal or uniform', () => {
  for (const d of [140, 180, 210, 250]) {
    const r = optimizeBlocks(d, new Date());
    const lengths = r.blocks.map(b => b.blockWeeks);
    assert(
      isPyramidal(lengths) || isUniform(lengths),
      `${d}-day plan [${lengths}] is neither pyramidal nor uniform`
    );
  }
});

test('optimizeBlocks handles short plans (60 days)', () => {
  const result = optimizeBlocks(60, new Date());
  assert(result.planBlockCount >= 1);
});

// ===== MILEAGE PROGRESSION =====
$results.innerHTML += '<h2>mileageProgression</h2>';

test('calculateGrowthRate returns positive value <= 0.1 (legacy)', () => {
  const G = calculateGrowthRate({
    planBlockCount: 3, planBlockLength: 10, maxDayCount: 200,
    startingDistance: 40, targetDistance: 100
  });
  assert(G > 0, 'Growth rate should be positive');
  assertLte(G, 0.1, 'Growth rate should be capped at 0.1');
});

test('progressWeeklyMileageByBlocks: total weeks = sum of block weeks', () => {
  const blocks = makeMockBlocks([8, 10, 12]);
  const data   = progressWeeklyMileageByBlocks(40, 100, blocks);
  assertEq(data.length, 30, `Expected 30 weeks (8+10+12), got ${data.length}`);
});

test('progressWeeklyMileageByBlocks: no weekly increase > 10%', () => {
  const data = progressWeeklyMileageByBlocks(40, 100, makeMockBlocks([8, 10]));
  for (let i = 1; i < data.length; i++) {
    if (!data[i-1].isDeload && !data[i].isDeload && data[i-1].weekMileage > 0) {
      const inc = (data[i].weekMileage - data[i-1].weekMileage) / data[i-1].weekMileage;
      assertLte(inc, 0.101, `Week ${i}: increase ${(inc*100).toFixed(1)}% > 10%`);
    }
  }
});

test('progressWeeklyMileageByBlocks: never exceeds target', () => {
  const data = progressWeeklyMileageByBlocks(40, 90, makeMockBlocks([8, 10, 12]));
  data.forEach((w, i) => {
    assertLte(w.weekMileage, 91, `Week ${i} mileage ${w.weekMileage} > target 90`);
  });
});

test('progressWeeklyMileageByBlocks: exactly 2 peak weeks per block', () => {
  const blocks = makeMockBlocks([8, 10]);
  const data   = progressWeeklyMileageByBlocks(40, 80, blocks);
  [0, 1].forEach(bi => {
    const peaks = data.filter(d => d.blockIndex === bi && d.isPeak);
    assertEq(peaks.length, 2, `Block ${bi} should have 2 peak weeks`);
  });
});

test('progressWeeklyMileageByBlocks: exactly 2 deload weeks per block', () => {
  const blocks = makeMockBlocks([8]);
  const data   = progressWeeklyMileageByBlocks(40, 80, blocks);
  const deloads = data.filter(d => d.isDeload);
  assertEq(deloads.length, 2, 'Should have exactly 2 deload weeks');
});

// ===== DISTANCE ALLOCATION =====
$results.innerHTML += '<h2>distanceAllocation</h2>';

test('longRun <= 38km', () => {
  [50, 80, 120].forEach(km => {
    const d = calculateDistances(km, 4);
    assertLte(d.longRunKm, 38, `${km}km: longRun ${d.longRunKm} > 38`);
  });
});

test('longRun <= 40% of weekly total', () => {
  [50, 80, 120].forEach(km => {
    const d = calculateDistances(km, 4);
    assertLte(d.longRunKm / km, 0.401, `${km}km: ratio ${(d.longRunKm/km).toFixed(2)} > 0.40`);
  });
});

test('intensity = 20% of weekly total', () => {
  const d = calculateDistances(80, 4);
  assertEq(d.intensityWeeklyKm, Math.round(80 * 0.20));
});

test('base = total - longRun - intensity', () => {
  const km = 80;
  const d  = calculateDistances(km, 4);
  assertEq(d.baseWeeklyKm, km - d.longRunKm - d.intensityWeeklyKm);
});

test('5-session week: wednesdayBaseMileage > 0', () => {
  const d = calculateDistances(80, 5);
  assert(d.wednesdayBaseMileage > 0);
});

test('3-session week: wednesdayBaseMileage = 0', () => {
  const d = calculateDistances(60, 3);
  assertEq(d.wednesdayBaseMileage, 0);
});

test('intensityMileage (meters) alias is per-session target', () => {
  const d   = calculateDistances(80, 4);
  const exp = Math.round(d.intensityWeeklyKm * 500); // half, in meters
  assertEq(d.intensityMileage, exp);
});

// ===== SESSION SELECTOR =====
$results.innerHTML += '<h2>sessionSelector</h2>';

test('getSessionTableName for Speed week 1 block 12', () => {
  assertEq(getSessionTableName('Speed', 1, 12), 'Speed_EvenBlocks');
});

test('getSessionTableName for SE week 2 block 12', () => {
  assertEq(getSessionTableName('SE', 2, 12), 'SE_Pyramid');
});

test('getSessionTableName for Tempo odd week', () => {
  assertEq(getSessionTableName('Tempo', 3, 10), 'Tempo_EvenBlocks');
});

test('getSessionTableName for Tempo even week', () => {
  assertEq(getSessionTableName('Tempo', 4, 10), 'Tempo_CutDown');
});

test('getFinalSessionTableName Speed → Speed_CutDowns', () => {
  assertEq(getFinalSessionTableName('Speed'), 'Speed_CutDowns');
});

test('getFinalSessionTableName Tempo → Tempo_EvenBlocks', () => {
  assertEq(getFinalSessionTableName('Tempo'), 'Tempo_EvenBlocks');
});

// ===== TAPER =====
$results.innerHTML += '<h2>taperProtocol</h2>';

test('isTaperDay identifies taper window', () => {
  assert(isTaperDay(184, 200) === true);
  assert(isTaperDay(183, 200) === true, 'Day maxDayCount-17 should be taper start');
  assert(isTaperDay(182, 200) === false, 'Day before taper start should not be taper');
  assert(isTaperDay(100, 200) === false);
});

test('getTaperSession returns race day on last day', () => {
  const sess = getTaperSession(200, 200, 'Rest');
  assertEq(sess.focusArea, 'Race Day');
  assertEq(sess.totalDistance, 42.2);
});

test('getTaperSession returns shakeout day before race', () => {
  const sess = getTaperSession(199, 200, 'Rest');
  assertEq(sess.focusArea, 'Pre-Race Shakeout');
});

test('taper offset 14 = 30km long run', () => {
  const sess = getTaperSession(200 - 14, 200, 'Rest');
  assertEq(sess.totalDistance, 30);
});

// ===== PACE ENGINE =====
$results.innerHTML += '<h2>paceEngine</h2>';

test('paceStrToSeconds converts correctly', () => {
  assert(paceStrToSeconds('03:40:00') === 13200);
  assert(paceStrToSeconds('00:04:30') === 270);
});

test('secondsToMinKm formats correctly', () => {
  assertEq(secondsToMinKm(270), '4:30');
  assertEq(secondsToMinKm(300), '5:00');
});

// ===== SUMMARY =====
$results.innerHTML += `<h2>Results</h2><pre>${passed} passed, ${failed} failed, ${passed + failed} total</pre>`;

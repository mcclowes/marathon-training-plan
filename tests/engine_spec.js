/**
 * engine.spec.js — Unit tests for engine modules
 */

import { getNextMonday, createDateScaffold, getDayName } from '../engine/dateScaffold.js';
import { optimizeBlocks } from '../engine/blockOptimizer.js';
import { calculateGrowthRate } from '../engine/mileageProgression.js';
import { calculateDistances } from '../engine/distanceAllocation.js';
import { getSessionTableName } from '../engine/sessionSelector.js';
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

function assertApprox(a, b, tolerance, msg) {
  if (Math.abs(a - b) > tolerance) throw new Error(`${msg || ''} Expected ~${b}, got ${a}`);
}

// ===== DATE SCAFFOLD =====
$results.innerHTML += '<h2>dateScaffold</h2>';

test('getNextMonday from a Wednesday', () => {
  const wed = new Date(2025, 5, 4); // June 4, 2025 = Wednesday
  const mon = getNextMonday(wed);
  assert(mon.getDay() === 1, 'Should be Monday');
  assert(mon >= wed, 'Should be >= input');
});

test('getNextMonday from a Monday returns same day', () => {
  const mon = new Date(2025, 5, 2); // June 2, 2025 = Monday
  const result = getNextMonday(mon);
  assert(result.getDay() === 1, 'Should be Monday');
  assert(result.getDate() === 2, 'Should be same day');
});

test('createDateScaffold generates correct day count', () => {
  const start = new Date(2025, 0, 6); // Mon Jan 6
  const end = new Date(2025, 3, 6); // Apr 6 = 91 days
  const scaffold = createDateScaffold(start, end);
  assert(scaffold.length > 80, `Should have ~91 days, got ${scaffold.length}`);
  assert(scaffold[0].dayOfWeek === 'Monday', 'First day should be Monday');
});

test('getDayName returns correct day names', () => {
  const mon = new Date(2025, 5, 2);
  assert(getDayName(mon) === 'Monday');
});

// ===== BLOCK OPTIMIZER =====
$results.innerHTML += '<h2>blockOptimizer</h2>';

test('optimizeBlocks returns valid block structure', () => {
  const result = optimizeBlocks(200, new Date(2025, 9, 25));
  assert(result.planBlockCount >= 1, 'Should have at least 1 block');
  assert([8, 10, 12].includes(result.planBlockLength), 'Block length should be 8, 10, or 12');
  assert(['Over', 'Under'].includes(result.planType), 'Type should be Over or Under');
});

test('optimizeBlocks handles short plans', () => {
  const result = optimizeBlocks(60, new Date(2025, 3, 1));
  assert(result.planBlockCount >= 1);
});

// ===== MILEAGE PROGRESSION =====
$results.innerHTML += '<h2>mileageProgression</h2>';

test('calculateGrowthRate returns positive value <= 0.1', () => {
  const G = calculateGrowthRate({
    planBlockCount: 3, planBlockLength: 10, maxDayCount: 200,
    startingDistance: 40, targetDistance: 100
  });
  assert(G > 0, 'Growth rate should be positive');
  assert(G <= 0.1, 'Growth rate should be capped at 0.1');
});

test('calculateGrowthRate caps at 0.1', () => {
  const G = calculateGrowthRate({
    planBlockCount: 1, planBlockLength: 8, maxDayCount: 60,
    startingDistance: 20, targetDistance: 200
  });
  assert(G <= 0.1, 'Should be capped at 0.1');
});

// ===== DISTANCE ALLOCATION =====
$results.innerHTML += '<h2>distanceAllocation</h2>';

test('calculateDistances with 3 sessions', () => {
  const d = calculateDistances(60, 3, 0);
  assert(d.longRunMileage > 0, 'Long run should be > 0');
  assert(d.longRunMileage <= 38, 'Long run capped at 38');
  assert(d.baseMileage > 0, 'Base should be > 0');
});

test('calculateDistances with 5 sessions includes Wednesday', () => {
  const d = calculateDistances(80, 5, 0);
  assert(d.wednesdayBaseMileage > 0, 'Wednesday base should exist for 5 sessions');
});

test('Long run capped at 38km', () => {
  const d = calculateDistances(120, 4, 0);
  assert(d.longRunMileage <= 38, `Long run should be <= 38, got ${d.longRunMileage}`);
});

// ===== SESSION SELECTOR =====
$results.innerHTML += '<h2>sessionSelector</h2>';

test('getSessionTableName for Speed week 1 block 12', () => {
  const name = getSessionTableName('Speed', 1, 12);
  assert(name === 'Speed_EvenBlocks', `Expected Speed_EvenBlocks, got ${name}`);
});

test('getSessionTableName for SE week 2 block 12', () => {
  const name = getSessionTableName('SE', 2, 12);
  assert(name === 'SE_Pyramid', `Expected SE_Pyramid, got ${name}`);
});

test('getSessionTableName for Tempo odd week', () => {
  const name = getSessionTableName('Tempo', 3, 10);
  assert(name === 'Tempo_EvenBlocks');
});

test('getSessionTableName for Tempo even week', () => {
  const name = getSessionTableName('Tempo', 4, 10);
  assert(name === 'Tempo_CutDown');
});

// ===== TAPER =====
$results.innerHTML += '<h2>taperProtocol</h2>';

test('isTaperDay identifies taper window', () => {
  assert(isTaperDay(183, 200) === true, 'Day 183 of 200 should be taper');
  assert(isTaperDay(100, 200) === false, 'Day 100 of 200 should not be taper');
});

test('getTaperSession returns race day on last day', () => {
  const sess = getTaperSession(200, 200, 'Rest');
  assert(sess.focusArea === 'Race Day');
  assert(sess.totalDistance === 42.2);
});

test('getTaperSession returns shakeout day before race', () => {
  const sess = getTaperSession(199, 200, 'Rest');
  assert(sess.focusArea === 'Pre-Race Shakeout');
});

// ===== PACE ENGINE =====
$results.innerHTML += '<h2>paceEngine</h2>';

test('paceStrToSeconds converts correctly', () => {
  assert(paceStrToSeconds('03:40:00') === 13200, 'Should be 13200');
  assert(paceStrToSeconds('00:04:30') === 270, 'Should be 270');
});

test('secondsToMinKm formats correctly', () => {
  assert(secondsToMinKm(270) === '4:30', `Expected 4:30, got ${secondsToMinKm(270)}`);
  assert(secondsToMinKm(300) === '5:00');
});

// ===== SUMMARY =====
$results.innerHTML += `<h2>Results</h2><pre>${passed} passed, ${failed} failed, ${passed + failed} total</pre>`;

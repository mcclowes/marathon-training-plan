#!/usr/bin/env node
/**
 * extract-from-excel.js — Extracts session templates, pace tables, and config
 * from the Training Block Template V9 workbook into JSON data files.
 * 
 * Prerequisites: npm install xlsx
 * Usage: node tools/extract-from-excel.js [path-to-xlsm]
 * 
 * Expected workbook sheets and tables:
 * 
 * Sheet "SessionMatrix":
 *   Tables: Speed_Pyramid, Speed_ReversePyramid, Speed_MSets, Speed_WSets,
 *           Speed_CutDowns, Speed_EvenBlocks, SE_Pyramid, SE_ReversePyramid,
 *           SE_MSets, SE_WSets, SE_CutDowns, SE_EvenBlocks,
 *           Tempo_EvenBlocks, Tempo_CutDown
 *   Columns: Summary #, Session #, Linked Workouts, Block, Summary, Details,
 *            Recoveries, Stimulus, Session Distance, Total Distance, Rep 1..20
 * 
 * Sheet "Training Paces Table":
 *   65 tables named like: Tempo_Paces_X_XX, SE_Paces_[Endurance|Speedster]_X_XX,
 *                          Speed_Paces_[Endurance|Speedster]_X_XX
 *   Columns: [TableName], Upper, Lower, UppeDif, LowerDif
 * 
 * Sheet "Paces":
 *   Table: ConvertedTable (row 84+)
 *   Columns: Distances, 02:30:00, 02:40:00, ... 04:30:00
 * 
 * Sheet "Lists":
 *   Table: PaceSummary (row 11+)
 *   Columns: Pace Number, Tempo, SE_Endurance, SE_Speedster,
 *            Speed_Endurance, Speed_Speedster
 * 
 * Sheet "Weekly Breakdown":
 *   Input cells: E3=Target Date, E4=Sessions, E5=Current Mileage,
 *                E6=Target Mileage, E7=Race Distance, E8=Current Pace,
 *                E9=Target Pace, E10=Style
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '..', 'source', 'Training Block Template V9.xlsm');

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  console.log('Usage: node tools/extract-from-excel.js [path-to-xlsm]');
  process.exit(1);
}

console.log(`Reading ${inputPath}...`);
const wb = XLSX.readFile(inputPath, { type: 'file', cellDates: true });

function sheetToRows(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.warn(`Sheet "${sheetName}" not found`); return []; }
  return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// Note: XLSX library doesn't natively support table definitions from .xlsm.
// This script provides the framework — actual table boundary parsing would need
// the openpyxl Python approach used during initial extraction.
// The pre-extracted JSON files in /data/ are the canonical data source.

console.log('Workbook sheets:', wb.SheetNames.join(', '));
console.log('');
console.log('This script is a reference for re-extracting data from the workbook.');
console.log('The canonical data files have already been extracted:');
console.log('  data/sessionTemplates.json — 14 session matrix tables');
console.log('  data/paceTables.json — 65 pace tables');
console.log('  data/config.json — ConvertedTable + PaceSummary + config');
console.log('');
console.log('To re-extract, use the Python approach:');
console.log('  python3 tools/extract_python.py');

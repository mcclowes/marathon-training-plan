# Validation Against Excel

## How to Compare Web App Output vs Excel Macro Output

### Step 1: Generate a Plan in Excel
1. Open `Training Block Template V9.xlsm`
2. Go to the "Weekly Breakdown" sheet
3. Set your inputs in cells E3–E10:
   - E3: Target Date (dd/mm/yyyy)
   - E4: Sessions per week (3, 4, or 5)
   - E5: Current weekly mileage (km)
   - E6: Target weekly mileage (km)
   - E7: Race distance (e.g., "Marathon")
   - E8: Current PB pace (hh:mm:ss)
   - E9: Target pace (hh:mm:ss)
   - E10: Style ("Endurance" or "Speed")
4. Run the `Combined()` macro
5. The plan populates the "MVP" sheet PlanTable

### Step 2: Export Excel Plan to CSV
1. Go to the "MVP" sheet
2. Select the PlanTable range (B3:L end-of-data)
3. Copy and paste into a new workbook
4. Save as CSV: `excel_plan_output.csv`

### Step 3: Generate the Same Plan in the Web App
Use identical inputs (same date, mileage, pace, style).

### Step 4: Compare

#### Block Count / Length
- [ ] Excel `G3` (block count) matches web app `planMeta.planBlockCount`
- [ ] Excel `G5` (block length) matches web app `planMeta.planBlockLength`

#### Weekly Mileage Curve
- [ ] Week 1 mileage matches (within ±2km rounding)
- [ ] Peak mileage week matches
- [ ] Growth rate direction matches (up in build, down in deload)
- [ ] Deload weeks appear at correct intervals

#### Taper Placement
- [ ] Taper begins on same day (maxDayCount - 17)
- [ ] Race day is last row
- [ ] Pre-race shakeout is day before race
- [ ] 30km long run appears 14 days before race
- [ ] 21km long run appears 7 days before race

#### Session Type Distribution
- [ ] Monday = Rest on all weeks
- [ ] Friday = Rest on all weeks
- [ ] Tuesday = Speed or SE (per block/phase logic)
- [ ] Thursday = SE, Tempo, or Base (per sessions count)
- [ ] Sunday = Long Run
- [ ] Saturday = Base or Rest (per sessions count)

#### Known Differences
- **Session selection is randomised**: The VBA uses `Rnd` and the web app uses `Math.random()`, so specific session choices will differ. The *type* and *distance range* should match.
- **Pace values**: May have minor floating-point differences in min/km calculations.
- **Rounding**: VBA `Round()` vs JavaScript `Math.round()` can differ by 1 on boundary values.

### Debug Mode
The web app includes a Debug Panel (Settings > Debug Panel) showing:
- Day count, week count, block count
- Weekly mileage, intensity mileage, base mileage
- Session count, growth rate (G), pace index
- Compare these intermediate values row-by-row with the Excel "Testing Sheet" TestTable

# Flow — Marathon Training App: Developer Guide for Claude Agents

> **Read this first.** This guide describes the **legacy vanilla-JS app at the repo root**. That app is now the *reference implementation*, not the production code path. The production app is the Next.js app in [`/web`](./web) — see `/web/CLAUDE.md` for its stack and layout.
>
> This guide is still useful because the training-engine semantics (block optimiser, mileage progression, distance allocation, session selector, pace engine, taper protocol) were ported verbatim into `web/lib/engine/*.ts`. Use the "How to make common changes" matrix below to understand the engine; when making actual production changes, apply them to the TypeScript files under `web/lib/engine/` (and mirror test changes into `web/**/*.spec.ts` under Vitest, not the browser runner).

## Purpose of this document
You are a Claude agent being asked to modify the Flow marathon training web app. This guide tells you exactly which files to touch for any given change, what each file does, and what NOT to break. Read this before making any edits.

---

## Architecture overview

```
index.html                    ← Entry point. Loads CSS + boots app.js
│
├── styles/                   ← APPEARANCE ONLY. No logic.
│   ├── tokens.css            ← Design tokens (colors, fonts, spacing, radii, shadows)
│   ├── components.css        ← Reusable component styles (cards, buttons, badges, nav)
│   └── app.css               ← App-specific overrides (chart bars, today card, stats)
│
├── src/                      ← UI LAYER. Renders screens, handles events.
│   ├── app.js                ← Bootstrap, routing, event handlers (window.* functions)
│   ├── store.js              ← State management + multi-plan localStorage persistence
│   ├── strava.js             ← Strava OAuth + activity sync (own localStorage key: marathon-strava)
│   └── ui/
│       ├── components.js     ← Helper functions: badges, icons, date formatting
│       └── renderers.js      ← Screen HTML generators (one function per screen)
│
├── engine/                   ← PURE LOGIC. Zero DOM access. Testable standalone.
│   ├── planGenerator.js      ← Orchestrator — calls all other engine modules
│   ├── dateScaffold.js       ← Generates day rows (next Monday → race date)
│   ├── blockOptimizer.js     ← Fits 8/10/12-week blocks with taper anchoring
│   ├── mileageProgression.js ← Exponential weekly mileage growth (capped at 10%)
│   ├── distanceAllocation.js ← Splits weekly km into long run, intensity, base
│   ├── weeklySchedule.js     ← Assigns focus area per day of week
│   ├── sessionSelector.js    ← Picks sessions from templates with tolerance widening
│   ├── paceEngine.js         ← Pace table lookups + guidance string generation
│   └── taperProtocol.js      ← Fixed 17-day taper schedule
│
├── data/                     ← TRAINING DATA. JSON files. No code.
│   ├── sessionTemplates.json ← 14 session tables, 151 workouts
│   ├── paceTables.json       ← 65 pace tables, 429 pace rows
│   └── config.json           ← ConvertedTable + PaceSummary + pace index map
│
├── tools/                    ← Developer utilities (not used at runtime)
│   ├── extract-from-excel.js
│   └── validate-against-excel.md
│
└── tests/
    ├── index.html           ← Full grouped test suite (inline module script)
    ├── testRunner.html      ← Legacy runner; loads engine.spec.js
    ├── engine.spec.js       ← Spec loaded by testRunner.html
    └── engine_spec.js       ← Orphaned older copy (not referenced)
```

---

## The three decoupled layers

The app has three layers that are deliberately independent. You can change one without touching the others:

| Layer | Files | What it controls | Safe to edit alone? |
|-------|-------|-----------------|-------------------|
| **Data** | `data/*.json` | Which sessions exist, pace values, pace-to-table mappings | Yes — engine reads at runtime |
| **Engine** | `engine/*.js` | How plans are calculated (blocks, mileage, session selection) | Yes — pure functions, no DOM |
| **UI** | `styles/*.css`, `src/**`, `index.html` | What the user sees and interacts with | Yes — consumes engine output |

---

## How to make common changes

### 1. Change colours, fonts, or spacing
**Edit:** `styles/tokens.css` only.

All visual values are CSS custom properties. Every component reads from these. Examples:
- `--c-accent` → primary button colour, active nav, toggle, links
- `--c-bg` → page background
- `--c-bg-card` → card/surface background
- `--c-border` → all border colours
- `--c-text` → primary text colour
- `--c-speed`, `--c-se`, `--c-tempo`, etc. → focus area badge colours
- `--font-body` → main typeface
- `--r-lg` → card border radius
- `--sp-4` → standard spacing unit

**Gotcha:** Some gradients in `components.css` and `app.css` use hardcoded hex values (for the countdown number, mileage bar fill, today-card background). Search for `linear-gradient` in those files if the accent colour changes.

### 2. Change the UI layout or screen content
**Edit:** `src/ui/renderers.js` (screen HTML) and/or `src/ui/components.js` (helpers).

Each screen is one exported function returning an HTML string:
- `renderCreateScreen()` → the "Create Your Plan" form
- `renderDashboard()` → home screen with countdown, today's session, week overview, mileage chart
- `renderWeeklyView()` → navigate weeks, see all 7 days
- `renderDayDetail()` → single day view with pace guidance, mark complete
- `renderSettings()` → export/import/reset + debug panel

To add a new field to the create form, add an input inside `renderCreateScreen()` and read it in `window.generatePlan()` in `app.js`.

To change badge colours/labels, edit `focusBadgeClass()` in `components.js`.

To change icons, edit the `icon()` function in `components.js` — it returns inline SVG strings keyed by name.

### 3. Change the header or app name
**Edit:** `index.html` for the header markup. The logo currently reads `<span>Flow</span>`.

The `.app-header` and `.app-logo` classes are styled in `components.css` lines 15–21.

### 4. Add, remove, or modify training sessions
**Edit:** `data/sessionTemplates.json` only. No code changes needed.

Structure:
```json
{
  "Speed_EvenBlocks": [
    {
      "Summary": "Even Blocks",
      "Details": "10 x 200",
      "Recoveries": "60 seconds",
      "Stimulus": "Build the Top End",
      "Session Distance": 2000,    ← metres (used for matching)
      "Total Distance": 7000,      ← metres (includes warm up/down)
      "Rep 1": 200,                ← individual rep distances
      "Rep 2": 200
    },
    ...
  ],
  "SE_Pyramid": [...],
  "Tempo_CutDown": [...]
}
```

**The 14 table names are:** `Speed_Pyramid`, `Speed_ReversePyramid`, `Speed_MSets`, `Speed_WSets`, `Speed_CutDowns`, `Speed_EvenBlocks`, `SE_Pyramid`, `SE_ReversePyramid`, `SE_MSets`, `SE_WSets`, `SE_CutDowns`, `SE_EvenBlocks`, `Tempo_EvenBlocks`, `Tempo_CutDown`.

**How sessions are selected:** The engine picks a table based on session type + week count (see `sessionSelector.js` → `getSessionTableName()`), then randomly picks a row whose `Session Distance` is within tolerance of the target intensity mileage. To add a new session, just append an object to the relevant table array.

**Important:** `Session Distance` and `Total Distance` must be in metres. The engine divides by 1000 to convert to km for display.

### 5. Change pace values
**Edit:** `data/paceTables.json` only.

Structure — each table is an array of rows:
```json
{
  "Speed_Paces_Endurance_3_40": [
    {"label": "100m", "Upper": 199, "Lower": 218, "UppeDif": 10, "LowerDif": 9},
    {"label": "200m", "Upper": 204, "Lower": 227, "UppeDif": 6, "LowerDif": 8}
  ]
}
```

All values are in **seconds** (e.g., `199` = 3:19 min/km). `Upper` = fast end of pace range, `Lower` = slow end. `UppeDif` and `LowerDif` = how much the pace improves per pace uplift cycle.

**Table naming convention:** `{Type}_Paces_{Style}_{MarathonTime}` where Type = Speed/SE/Tempo, Style = Endurance/Speedster, MarathonTime = e.g. 3_40 for 3h40m marathon.

### 6. Change which pace table maps to which pace index
**Edit:** `data/config.json` → the `paceSummary` section.

```json
"paceSummary": {
  "rows": [
    {"Pace Number": 1, "Tempo": "Tempo_Paces_2_30", "SE_Endurance": "SE_Paces_Endurance_2_30", ...},
    {"Pace Number": 2, "Tempo": "Tempo_Paces_2_40", ...}
  ]
}
```

Each row maps a pace index (1–13) to the table names used for Speed, SE, and Tempo sessions in both Endurance and Speed styles.

### 7. Change training logic (block structure, mileage growth, day assignments)
**Edit:** individual files in `engine/`. Each is a standalone module.

| Want to change... | Edit this file | Key function |
|---|---|---|
| How blocks are sized (8/10/12 weeks) | `blockOptimizer.js` | `optimizeBlocks()` |
| Weekly mileage growth rate | `mileageProgression.js` | `calculateGrowthRate()` |
| Growth rate cap (currently 10%) | `mileageProgression.js` | Line: `if (G > 0.1) G = 0.1` |
| Long run cap (currently 38km) | `distanceAllocation.js` | Line: `Math.min(38, ...)` |
| Weekly distance splits (% to long run, intensity, base) | `distanceAllocation.js` | `calculateDistances()` |
| Which day gets which focus (Mon=Rest, Tue=Speed, etc.) | `weeklySchedule.js` | `getDayAssignment()` |
| Tuesday session type by block/phase | `weeklySchedule.js` | `getTuesdayFocus()` |
| Thursday session type by block/phase | `weeklySchedule.js` | `getThursdayFocus()` |
| Which session table to use per week count | `sessionSelector.js` | `getSessionTableName()` |
| Session matching tolerance (starts at 100m, widens) | `sessionSelector.js` | `selectSession()` |
| Pace lookup from ConvertedTable | `paceEngine.js` | `findPaceIndex()` |
| Pace guidance string format | `paceEngine.js` | `buildPaceGuidance()` |
| The final 17-day taper schedule | `taperProtocol.js` | `getTaperSession()` |
| Warm up/down distances by total distance | `weeklySchedule.js` | `getWarmUpDown()` |

**Critical rule:** Engine files must NEVER import from `src/` or access the DOM. They are pure functions: data in → data out.

### 8. Change navigation or event handling
**Edit:** `src/app.js`.

All user-triggered functions are attached to `window.*`:
- `window.navigate(view)` — switch screens
- `window.generatePlan()` — reads form inputs, calls engine, saves result
- `window.openDay(idx)` — open day detail
- `window.toggleComplete(idx)` — mark session done
- `window.prevWeek()` / `window.nextWeek()` — week navigation
- `window.exportPlan()` / `window.importPlan()` / `window.resetPlan()` — settings actions

### 9. Change state persistence
**Edit:** `src/store.js`.

The store uses a **multi-plan** localStorage scheme:
- `marathon-plans-index` → array of `{planId, ...}` entries indexing all saved plans
- `marathon-plan::{planId}` → the full generated plan (planMeta + days + weeks) for that id
- `marathon-comp::{planId}` → completions for that plan (day index → timestamp)

Legacy keys `marathon-training-plan` and `marathon-completions` are only read by `_migrate()` on first boot to move old single-plan data into the new scheme, then deleted. Do not write to them.

Strava-related state (`clientId`, `clientSecret`, `accessToken`, `refreshToken`, `athlete`) lives under `marathon-strava` and is managed by `src/strava.js`, not `store.js`.

---

## Data flow (runtime)

```
1. index.html loads → app.js runs init()
2. app.js fetches data/*.json files via fetch()
3. User fills form → generatePlan() reads inputs
4. planGenerator.js orchestrates engine modules:
   dateScaffold → blockOptimizer → mileageProgression → 
   (loop: distanceAllocation → weeklySchedule → sessionSelector → paceEngine)
   → taperProtocol (final 17 days)
5. Returns { planMeta, days[], weeks[] }
6. store.js saves to localStorage
7. renderers.js reads from store, generates HTML strings
8. app.js sets innerHTML on #app element
```

---

## Things NOT to do

- **Don't add `import` statements to engine files that reference `src/` or DOM APIs.** The engine must stay pure.
- **Don't rename the JSON data file keys** (e.g., `Session Distance`, `Total Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`) — the engine reads these exact property names.
- **Don't rename the 14 session table names** without also updating `getSessionTableName()` in `sessionSelector.js` and `getFinalSessionTableName()`.
- **Don't change the pace table naming convention** without updating `paceSummary` in `config.json` and the lookup functions in `paceEngine.js`.
- **Don't use `localStorage` or `sessionStorage` in engine files** — state is managed only by `store.js`.
- **Don't add frameworks to this legacy tree** — the root-level app is vanilla JS by design and is now frozen as the reference implementation. Framework code (React/Next.js) belongs in `/web`.

---

## File size reference

Approximate — run `wc -l` for current numbers.

| File | Purpose |
|------|---------|
| `sessionTemplates.json` | 151 workouts across 14 tables |
| `paceTables.json` | 429 pace rows across 65 tables |
| `config.json` | Pace lookups + summary mappings |
| `planGenerator.js` | Main orchestrator |
| `renderers.js` | All 5 screen renderers (create, dashboard, weekly, day, settings) |
| `paceEngine.js` | Pace calculations + guidance |
| `weeklySchedule.js` | Day-of-week logic |

---

## Testing after changes

1. **Visual changes (CSS):** Just save and check Live Server — instant reload.
2. **UI changes (renderers):** Save, reload, click through all 5 screens.
3. **Data changes (JSON):** Reset the plan (Settings → Reset), regenerate, check the new sessions appear.
4. **Engine changes:** Open `tests/index.html` in the browser to run the full grouped suite, or `tests/testRunner.html` for the legacy `engine.spec.js` runner. Also regenerate a plan and verify the debug panel (Settings → Debug Panel) shows sensible intermediate values.
5. **Quick smoke test:** Generate a plan with defaults, check dashboard loads, tap a day, mark it complete, navigate weeks, export JSON.

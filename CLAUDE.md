# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Where the production app lives

**The production app is the Next.js app in [`/web`](./web).** It is a multi-user app with Auth.js (Strava OAuth), Vercel Blob storage, and server-side Strava sync. Start there:

- `/web/CLAUDE.md` — stack, layout, and do-not-break contracts for the Next.js app
- `/web/README.md` — stock Next.js template; prefer `/web/CLAUDE.md` for any real guidance
- `PRODUCTIONISATION_PLAN.md` — the migration plan that produced it (historical; the plan referenced Clerk but the implementation shipped with Auth.js instead)

The vanilla-JS app in the repo root (`index.html`, `src/`, `engine/`, `styles/`, `tests/`) **remains checked in as the reference implementation** for the training engine and UI behaviour. It still runs via `open index.html` but saves only to `localStorage` and has no Strava sync. `AGENT_GUIDE.md` documents the reference app's file layout and engine behaviour — the engine semantics carried over verbatim into `web/lib/engine/`, so that guide is still useful when reasoning about engine logic even if the production code path is now TypeScript under `/web`.

Legacy users with `localStorage` plans can import them at `/migrate` in the new app.

## Running things

| Task | Command | Directory |
| --- | --- | --- |
| Dev server (production app) | `pnpm dev` | `web/` |
| Tests (production app) | `pnpm test` (Vitest) | `web/` |
| Type check | `pnpm typecheck` | `web/` |
| E2E smoke | `pnpm test:e2e` (Playwright) | `web/` |
| Build | `pnpm build` | `web/` |
| Run legacy reference app | `open index.html` or `npx serve .` / `python3 -m http.server 8080` | repo root |
| Legacy engine tests (browser) | open `tests/index.html` in a browser | repo root |
| Validate session templates | `node tools/validate-sessionTemplates.js` | repo root |

There is intentionally no `package.json` at the repo root — the Next.js app manages its own dependencies under `web/`. Do not `npm install` at the root; if you see a stray `package-lock.json` at the root, it is accidental and safe to delete.

## Architecture — the three-layer rule (still valid)

The engine split that made the Next.js port tractable still holds in both trees:

| Layer      | Legacy location                      | Production location                           | Constraint                                                     |
| ---------- | ------------------------------------ | --------------------------------------------- | -------------------------------------------------------------- |
| **Data**   | `data/*.json`                        | `web/lib/data/*.json`                         | Schema-stable. Engine reads fixed property names.              |
| **Engine** | `engine/*.js`                        | `web/lib/engine/*.ts`                         | **Pure functions. No DOM. No storage. No UI imports.**         |
| **UI**     | `index.html`, `styles/*`, `src/**`   | `web/app/**`, `web/components/**`, SCSS modules | Consumes engine output. Persistence via server actions + Blob. |

`planGenerator` is the orchestrator in both trees: `dateScaffold → blockOptimizer → mileageProgression → (loop: distanceAllocation → weeklySchedule → sessionSelector → paceEngine) → taperProtocol`.

## Do-not-break contracts

These are load-bearing in **both** trees and silently break the engine if renamed:

- **JSON property names** — `Session Distance`, `Total Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`, `Rep 1`…`Rep N`. The engine reads these exact strings. The TS port types them but must not rename them.
- **The 14 session table names** in `sessionTemplates.json` — renaming any requires updating `getSessionTableName()` and `getFinalSessionTableName()` in the session selector module.
- **Pace table naming convention** `{Type}_Paces_{Style}_{MarathonTime}` — used by the pace engine and `config.json`'s `paceSummary`.
- **Units** — `Session Distance` / `Total Distance` are **metres**; pace `Upper`/`Lower` are **seconds**. The UI divides by 1000 for km display.

## Legacy app conventions (reference only)

These describe the root-level vanilla-JS app. They do not apply to `/web`:

- Event handlers are attached to `window.*` and invoked from inline `onclick` in HTML strings returned by `src/ui/renderers.js`. No framework.
- Design tokens in `styles/tokens.css`. A few gradients in `components.css` / `app.css` use hardcoded hex.
- Multi-plan `localStorage` scheme via `src/store.js`: `marathon-plans-index`, `marathon-plan::{id}`, `marathon-comp::{id}`. Legacy single-plan keys `marathon-training-plan` / `marathon-completions` are migrated on boot then removed. Strava state in `src/strava.js` is now a disabled stub — real Strava sync lives server-side in `/web`.

## Project context

The generator is a browser port of an Excel/VBA "Training Block Template V9" workbook. `data/*.json` was extracted from that workbook; `data/extracted_data.json` is the raw reference extraction and is **not read at runtime**. Expect minor numeric divergence from the VBA because random session picks use `Math.random()` instead of `Rnd`, and pace arithmetic uses seconds instead of Excel date serials.

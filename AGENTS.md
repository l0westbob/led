# AGENTS.md

Concise repo guide for Codex/agent sessions. Optimize for small context: open the fewest files needed, starting near the change.

## Repository Map

| Path | Topic / Responsibility | Inspect When | Ignore Unless |
| --- | --- | --- | --- |
| `src/catalog/` | Static catalog and resolvers (LEDs, presets, spectral ids) | LED selection, dataset mapping, display naming | Pure UI styling tasks |
| `src/application/` | App use-cases (electrical resolve, photon estimate, planner/LED-lab snapshots) | Planner behavior, LED Lab behavior, cross-layer bugs | Pure CSS/layout-only work |
| `src/components/` | Vue UI components (forms, snapshot, heatmap, benchmark) | Any UI/layout/UX change | Domain/math-only tasks |
| `src/stores/` | App state + computed summaries (Vue reactive store) | Values look wrong in UI, new inputs/derived stats | Pure rendering/CSS-only tasks |
| `src/domain/` | Core models + PPFD estimator + LED library + presets | PPFD math/perf, LED data, presets, board model | Pure CSS/layout tasks |
| `src/utils/` | Small helpers (colors, storage, strings) | Heatmap color tweaks, persistence bugs | Domain/model refactors unless needed |
| `src/styles/` | Global CSS + theme variables | Visual styling, layout, spacing | PPFD math/perf work |
| `src/App.vue` | Top-level page composition | Add/remove panels, reorder sections | Isolated component edits |
| `src/main.js` | Vue bootstrap | App mounting issues | Normal feature work |
| `README.md` | Project overview | Updating docs | Implementation work |
| `dist/` | Build output (generated) | Only if debugging a deployed artifact | Default |
| `node_modules/` | Vendor deps (generated) | Never for normal tasks | Default |

## Common Task Routing

| Task type | Inspect first |
| --- | --- |
| UI change (layout, labels, new panel) | `src/App.vue`, then `src/components/*` |
| Form/input behavior | `src/components/BoardSetupSection.vue`, `src/components/DriveConditionsSection.vue`, then `src/stores/plannerStore.js`, then `src/application/electrical/*` |
| Snapshot/stat display | `src/components/StatsSnapshot.vue`, `src/stores/plannerStore.js` |
| PPFD map rendering (canvas, grid/labels, aspect ratio) | `src/components/PpfdHeatmap.vue`, `src/utils/colors.js` |
| PPFD calculation correctness/performance | `src/application/planner/buildPlannerSnapshot.js`, `src/domain/PpfdEstimator.js`, `src/domain/BoardProfile.js` |
| LED data / electrical model changes | `src/catalog/ledCatalog.js`, `src/application/electrical/resolveElectricalOperatingPoint.js`, `src/domain/LedLibraryV2.js`, `src/domain/ledV2Model.js` |
| Spectral calibration / photon conversion | `src/catalog/spectralCatalog.js`, `src/application/photons/estimatePhotonOutput.js`, `src/domain/spectral/*` |
| Preset updates | `src/domain/BoardPresets.js`, `src/domain/BoardProfile.js` |
| Persistence (saved boards) | `src/utils/storage.js`, `src/stores/plannerStore.js` |
| Build/config/lint | `package.json`, `vite.config.js`, `eslint.config.js` |
| Documentation | `README.md` |

## Context Budget Rules

- Start at the narrowest scope: one component or one domain file, not the whole repo.
- Do not open `node_modules/`, `dist/`, or lockfiles unless the task explicitly requires it.
- For UI bugs: open the component first, then the store, then the relevant application service before diving into low-level domain math.
- For math/perf bugs: open `src/application/planner/buildPlannerSnapshot.js` first, then `src/domain/PpfdEstimator.js`.
- Read tests near changed code first: (Note) this repo currently has no dedicated test folder; prefer adding small, local sanity checks where appropriate rather than broad scaffolding.
- After each file inspection, summarize what you learned before opening more files.

## Important Entry Points

- `package.json` (scripts, deps)
- `vite.config.js` (Vite config)
- `eslint.config.js` (lint rules)
- `index.html` (Vite entry)
- `src/main.js` (Vue bootstrap)
- `src/App.vue` (top-level layout)
- `src/stores/plannerStore.js` (single source of truth for state + derived stats)
- `src/application/planner/buildPlannerSnapshot.js` (planner orchestration)
- `src/application/electrical/resolveElectricalOperatingPoint.js` (electrical syncing)
- `src/application/photons/estimatePhotonOutput.js` (photon output orchestration)
- `src/application/ledLab/buildLedLabSnapshot.js` (LED Lab orchestration)
- `src/catalog/ledCatalog.js` + `src/catalog/spectralCatalog.js` (canonical LED/spectrum resolution)
- `src/domain/PpfdEstimator.js` (core PPFD compute engine)
- `src/domain/LedLibraryV2.js` + `src/domain/ledV2Model.js` (low-level LED curves + fallback model)
- `src/domain/spectral/radiantCalibration.js` + `src/domain/spectral/ppfEstimation.js` (spectral calibration primitives)

## Do Not Touch / Ignore By Default

- `node_modules/` (vendor, huge)
- `dist/` (generated build output)
- `package-lock.json` (only when dependency resolution is the task)
- `.idea/` (editor config)

## Agent Workflow

1. Classify the task (UI vs store vs domain/perf vs config).
2. Inspect only the most relevant folder/file from the routing table.
3. Inspect the nearest dependent file (component ↔ store ↔ domain) if needed.
4. Make minimal changes and keep units consistent (mm/cm, umol/m²/s).
5. Run the most targeted check available (usually `npm run dev` / lint in the user environment).
6. Only broaden context (open more files) if the fix cannot be verified otherwise.

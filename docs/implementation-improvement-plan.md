# Implementation Improvement Plan

Date: 2026-05-29

This plan is based on a broad repository discovery pass against source code,
tests, configuration, ADRs, and runtime checks. Discovery intentionally did not
depend on `AGENTS.md` routing guidance, per the repo rewrite planning workflow.

## 1. Problem Understanding

The repository is a Vue 3 + Vite application for planning LED boards and lamp
layouts, estimating electrical and photon output, previewing PPFD maps, and
comparing LED spectra.

The requested outcome is not an immediate implementation. The requested outcome
is an excessive, evidence-backed, implementation-ready improvement plan. The
plan should preserve current behavior while making the codebase easier to
extend, test, type-check, bundle, and reason about.

The current repo is not a Python CLI project. The Python CLI skill is therefore
used as an applicability and safety check: do not introduce Python automation,
CLI packaging, `uv`, Typer, Ruff, or pytest unless a separate, explicit CLI need
appears. If future datasheet ingestion or spectral fixture generation becomes a
real repeated workflow, the optional Python section below defines how to add it
without turning it into an accidental side project.

## 2. Executive Recommendation

Do not perform a big-bang rewrite.

The codebase already has valuable architecture:

- UI is mostly isolated in Vue components and stores.
- Application services own planner, board library, LED Lab, electrical,
  photon, and spectral orchestration.
- Domain modules own PPFD, spectral math, catalog data, and board models.
- Versioned contracts and operation envelopes exist.
- Tests cover numerical baselines, workflows, contracts, architecture fitness,
  board migration, and PPFD engines.

The best strategy is an incremental modular-monolith hardening pass:

1. Stabilize quality gates and CI.
2. Make boundaries stricter with type checking and contract assertions.
3. Split the highest-coupled services and components.
4. Extract duplicated simulation helpers.
5. Reduce initial bundle size by splitting spectral data and routes.
6. Add component/browser verification only after the service boundary is safer.

The target is not "new framework". The target is the same product with clearer
domain boundaries and lower regression risk.

## 3. Evidence From Repository Discovery

### Product Purpose

The product serves LED board builders or lighting designers who need to:

- Define or edit LED board geometry.
- Choose LED variants, bins, drive mode, voltage, current, and temperature.
- Save custom boards and import/export board libraries.
- Place one or more board instances in a room/grow space.
- Preview PPFD distribution.
- Compare LED spectra and spectral weighting metrics.
- Inspect board-level photon flux, electrical estimates, CCT, PAR, PBAR,
  McCree, and DIN ratios.

### Current Core Workflows

1. Board Planner
   - `src/pages/BoardPlannerPage.vue`
   - `src/stores/plannerStore.js`
   - `src/application/boardLibrary/*`
   - `src/contracts/versioned/boardDocuments.js`

2. Lamp Planner
   - `src/App.vue`
   - `src/components/BoardSetupSection.vue`
   - `src/components/PpfdHeatmap.vue`
   - `src/application/planner/buildPlannerSnapshot.js`
   - `src/application/planner/pipeline/*`
   - `src/domain/ppfd/*`

3. Board Preview
   - `src/components/BoardPreviewSection.vue`
   - `src/components/useEmitterDrag.js`
   - `src/application/planner/buildBoardPlannerPreviewSnapshot.js`
   - `src/application/planner/useCases/emitterActions.js`

4. LED Lab
   - `src/pages/LedComparisonPage.vue`
   - `src/stores/ledLabStore.js`
   - `src/application/ledLab/*`
   - `src/application/spectral/spectralCore.js`

5. Catalog and calibration
   - `src/domain/LedLibraryV2.js`
   - `src/domain/spectral/all_series.json`
   - `src/catalog/*`
   - `src/domain/spectral/*`

### Repository Shape

Measured from local source files:

- 138 files excluding `node_modules`, `dist`, `.git`, and `.idea`.
- 116 source/test JSON, JS, Vue, and MJS files.
- 56,276 source/test lines including the large spectral JSON fixture.
- 16,077 JS/Vue/MJS source and test lines excluding JSON.
- `src/domain/spectral/all_series.json` is about 40,158 lines.
- The largest JS/Vue hotspots are:
  - `src/components/BoardPreviewSection.vue`: about 771 lines.
  - `src/domain/PpfdEstimator.js`: about 697 lines.
  - `src/application/planner/useCases/emitterActions.js`: about 620 lines.
  - `src/pages/LedComparisonPage.vue`: about 437 lines.
  - `src/components/PpfdHeatmap.vue`: about 422 lines.
  - `src/application/planner/plannerUseCases.js`: about 419 lines.
  - `src/application/planner/buildBoardPlannerPreviewSnapshot.js`: about 298 lines.
  - `src/stores/plannerStore.js`: about 296 lines.

### Current Quality Gate Results

Local checks run with the local Herd/NVM Node runtime:

- `npm test`: pass, 60 tests.
- `npm run lint`: pass.
- `npm run format:check`: pass after formatting `AGENTS.md`.
- `npm run build`: pass.
- Build warning: main minified JS chunk is about 510.96 kB, above Vite's 500 kB
  warning threshold.

### Missing Or Weak Quality Gates

- No CI configuration was found.
- No type-check script exists.
- The project is JavaScript with JSDoc contracts, not TypeScript.
- No component test stack is configured.
- No browser smoke/e2e test stack is configured.
- No bundle budget check exists beyond the Vite warning.
- No automated import-boundary checker exists beyond three architecture fitness
  tests.
- No coverage or mutation testing gate exists.

### Current Architecture Map

| Layer                      | Current files                                                                             | Responsibility                                             | Health                                            |
| -------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Bootstrap                  | `src/main.js`, `index.html`                                                               | Mount Vue app                                              | Small and healthy                                 |
| Root composition           | `src/App.vue`                                                                             | Page switch, lamp planner controls, heatmap, stats, modals | Useful but overloaded                             |
| Pages                      | `src/pages/*`                                                                             | Board Planner and LED Lab page sections                    | Clear but page files are growing                  |
| Components                 | `src/components/*`                                                                        | Panels, charts, heatmap, modal UI, drag hooks              | Functional, some large mixed-control components   |
| Stores                     | `src/stores/*`                                                                            | Vue reactive adapters for planner and LED Lab              | Good boundary intent, planner store still broad   |
| Application planner        | `src/application/planner/*`                                                               | Planner use cases, snapshots, placement, preview           | Strong direction, some service/action hotspots    |
| Board library              | `src/application/boardLibrary/*`                                                          | Persistence migration, validation, import/export           | Good versioned shape                              |
| LED Lab                    | `src/application/ledLab/*`                                                                | LED comparison snapshots and chart view models             | Good service boundary                             |
| Electrical/photon/spectral | `src/application/electrical/*`, `src/application/photons/*`, `src/application/spectral/*` | Cross-domain orchestration                                 | Strong separation, needs stricter contracts       |
| Catalog                    | `src/catalog/*`                                                                           | Canonical board/LED/bin/spectral resolution                | Small, useful boundary                            |
| Domain                     | `src/domain/*`                                                                            | Board model, PPFD, spectral math, LED curves               | Strong but some classes and constants do too much |
| Contracts                  | `src/contracts/versioned/*`                                                               | Envelopes, issues, persisted docs, assertions              | Important foundation                              |
| Platform utils             | `src/utils/*`                                                                             | Browser storage/downloads, runtime hooks                   | Small but storage errors are swallowed            |

## 4. Key Data And Control Flow Paths

### 4.1 App Bootstrap

Flow:

1. `src/main.js` imports `App.vue`.
2. `App.vue` creates and provides `usePlannerStore()`.
3. `App.vue` chooses between "Lamp Planner" and "Board Planner" page modes.

Current limitation:

- `App.vue` does more than root composition. It owns page switching, lamp
  planner form controls, PPFD map section, snapshot section, benchmark toggle,
  and modal mounting.

Improvement direction:

- Move Lamp Planner page composition into a dedicated page component.
- Keep `App.vue` as shell and navigation state only, or introduce a small
  route/page registry later.

### 4.2 Planner Snapshot Flow

Flow:

1. UI edits `store.form`.
2. `src/stores/plannerStore.js` recomputes `buildPlannerSnapshotEnvelope()`.
3. `buildPlannerSnapshot.js` delegates to `buildPlannerSnapshotPipeline()`.
4. Pipeline normalizes board, validates input, resolves each board instance,
   aggregates PPFD maps, and returns a versioned snapshot envelope.
5. `PpfdHeatmap.vue` renders `summary.values` to canvas.

Current limitation:

- `performance.now()` is used inside application services. This makes timing
  useful for UI but not fully deterministic as a service boundary.
- Fixture layout logic exists in both fast and reference PPFD paths.
- The pipeline has good staging, but timing, validation, simulation, and
  aggregation are still coupled in one service path.

Improvement direction:

- Add a timer dependency to planner snapshot builders.
- Extract shared fixture layout.
- Separate "build simulation inputs" from "execute engines" and "summarize
  results".

### 4.3 Board Library Persistence Flow

Flow:

1. `storage.js` reads/writes JSON from `window.localStorage`.
2. `boardDocumentMigration.js` deserializes legacy or v1.1 board documents.
3. `boardLibraryService.js` handles CRUD.
4. `boardLibraryImportExport.js` validates imports and serializes exports.
5. Store actions wire results into UI issue state.

Current limitation:

- Storage parse errors return an empty list without surfacing a warning.
- Save failures, quota errors, and JSON corruption have no user-visible
  operation envelope.
- Document assertion coverage exists, but version transition policy should be
  made more explicit before v1.2.

Improvement direction:

- Convert storage adapters to operation results or report objects.
- Add corruption/quota tests.
- Add a migration matrix for legacy, v1.1, malformed v1.1, and future v1.2.

### 4.4 Board Preview Flow

Flow:

1. Board Preview component reads `store.boardPlannerPreviewSnapshot`.
2. Preview builder normalizes board and emitters.
3. It resolves electrical output per emitter.
4. It estimates per-emitter photon flux.
5. It aggregates photon spectrum.
6. It computes spectral stats, CCT, board wiring estimate, selected emitters,
   warnings, and errors.
7. The component renders geometry, controls, spectrum, metrics, and selection.

Current limitation:

- `buildBoardPlannerPreviewSnapshot.js` is doing several distinct jobs.
- `BoardPreviewSection.vue` is a large component that mixes layout, controls,
  SVG rendering, keyboard events, drag handling, spectrum VM construction, and
  store calls.
- `emitterActions.js` is a 600+ line action bundle covering selection, default
  drive, config modal, bulk config, movement, and draft saving.

Improvement direction:

- Split preview snapshot into sub-services:
  - emitter normalization
  - emitter electrical resolution
  - photon spectrum aggregation
  - board wiring estimate
  - CCT summary
  - selection projection
- Split Vue component into:
  - `BoardPreviewPanel.vue`
  - `BoardPreviewToolbar.vue`
  - `BoardPreviewDriveControls.vue`
  - `BoardPreviewGeometryControls.vue`
  - `BoardEmitterCanvas.vue` or `BoardEmitterSvg.vue`
  - `BoardSpectrumSummary.vue`
- Split emitter actions into cohesive modules.

### 4.5 LED Lab Flow

Flow:

1. `LedComparisonPage.vue` reads `useLedLabStore()`.
2. Store computes `buildLedComparisonSnapshotEnvelope()`.
3. LED comparison builder calls `buildLedLabSnapshot()`.
4. Spectral core resolves relative or photon spectra.
5. Chart VM builds SVG path helpers and axis ticks.

Current limitation:

- `LedComparisonPage.vue` is page, controls, tables, and chart composition in
  one file.
- LED Lab and Board Preview share chart view model services, but UI-level
  repeated table patterns are not factored.
- The large spectral JSON is bundled eagerly.

Improvement direction:

- Split LED Lab into comparison controls, metric table, photon flux table, and
  chart section.
- Keep the shared chart VM.
- Lazy-load or split spectral data.

## 5. Main Hypothesis

The repo's biggest improvement opportunity is not more domain abstraction. It is
boundary enforcement and progressive decomposition.

The architecture already points in the right direction. The remaining risk
comes from:

- Large modules accumulating multiple responsibilities.
- Runtime contracts documented in JSDoc but not checked by a type system.
- Browser and timing primitives leaking into application boundaries.
- Duplicate geometry/fixture concepts across PPFD engines and heatmap
  placement.
- Large static spectral data in the initial bundle.
- UI behavior not covered by component or browser tests.
- Lack of CI, so local quality gates are not guaranteed before changes merge.

## 6. Target Architecture

### 6.1 Target Shape

Keep the app as a modular frontend monolith.

Recommended long-term source shape:

```text
src/
  app/
    AppShell.vue
    pageRegistry.js
  features/
    lampPlanner/
      pages/
      components/
      store/
      useCases/
    boardLibrary/
      components/
      useCases/
      persistence/
    boardPreview/
      components/
      useCases/
      viewModels/
    ledLab/
      components/
      store/
      useCases/
      viewModels/
  simulation/
    electrical/
    photons/
    ppfd/
    spectral/
  catalog/
  contracts/
    versioned/
  platform/
    browser/
    runtime/
  shared/
    components/
    formatting/
```

This does not need to happen as a folder-moving ceremony. The migration should
create target modules only when a specific improvement touches the relevant
area. Existing `src/application`, `src/domain`, and `src/components` files can
coexist with new feature folders until a phase is complete.

### 6.2 Boundary Rules

1. UI components may import stores, components, view models, and browser
   platform adapters.
2. UI components should not import domain modules directly.
3. Stores may import application or feature use cases.
4. Stores should not contain simulation, validation, or persistence policy.
5. Application/feature services may import contracts, catalog, simulation, and
   domain modules.
6. Application/feature services should not import Vue stores or components.
7. Domain and simulation modules should not import browser APIs, Vue, stores, or
   platform adapters.
8. Timing, clocks, randomness, localStorage, downloads, DOM, and feature flags
   should enter through explicit adapters.
9. Versioned persistence documents should always cross a contract boundary.
10. Snapshot builders should return envelopes at public boundaries and plain
    data inside pure helper functions.

### 6.3 Naming Rules

Prefer product language:

- `BoardDefinition`, not generic `data`.
- `BoardInstance`, not generic `item`.
- `PhotonSpectrum`, not generic `series`.
- `FixtureLayout`, not generic `positions`.
- `EmitterSelection`, not generic `state`.
- `OperatingPoint`, not generic `syncResult`.

Accept established abbreviations:

- LED
- PPFD
- PPF
- CCT
- SPD
- PAR
- PBAR
- DIN

Avoid expanding the codebase with generic buckets such as `helpers`,
`common`, or broad `utils`.

## 7. Rewrite Options Compared

### Option A: Harden Current JavaScript Architecture

Approach:

- Keep JavaScript.
- Add more JSDoc and architecture tests.
- Split large modules.
- Add CI and browser checks.

Pros:

- Lowest churn.
- Keeps all current tests and build behavior.
- No dependency or type migration risk.

Cons:

- Contract drift remains possible.
- Refactors remain less safe.
- Vue SFC state and props remain weakly typed.

Best for:

- Small team, fast iteration, minimal tooling appetite.

### Option B: Incremental TypeScript Modular Monolith

Approach:

- Keep Vue 3 + Vite.
- Add type checking only after agreeing on toolchain.
- Convert pure contracts, catalog, application services, and domain modules
  before SFCs.
- Decompose large files during or before conversion.

Pros:

- Better long-term safety.
- Best fit for rich data contracts and numerical services.
- Enables stronger Vue component prop/event contracts later.

Cons:

- Requires dependency and config changes.
- May expose many latent JSDoc mismatches.
- Needs careful sequencing to avoid type churn blocking product work.

Best for:

- This repo, if the goal is sustained maintainability.

### Option C: Feature Folder Rewrite With New State/Test Stack

Approach:

- Introduce feature folders, Pinia or another formal store, Vitest, Vue Test
  Utils, Playwright, and possibly router-driven pages.

Pros:

- Clean final structure.
- Strong testing ergonomics.
- Better component-level confidence.

Cons:

- Highest churn.
- Risk of replacing working architecture with tool migration work.
- Not justified until service boundaries are smaller.

Best for:

- Later phase after contracts and simulation boundaries are stable.

### Recommended Option

Use Option B as the destination and Option A as the delivery method.

Do not start with framework migration. Start with boundary hardening and module
decomposition, then add type checking and browser/component tests in controlled
steps.

## 8. MVP Retrospective By Subsystem

### 8.1 Root App And Page Composition

Current approach:

- `App.vue` is both root shell and Lamp Planner page.
- Page switching is local `ref` state.
- Modals are mounted at root.

Why this was reasonable for MVP growth:

- Fastest way to add multiple panels without introducing routing.
- Keeps reactive store available everywhere.
- Avoids premature navigation architecture.

Current limitations:

- Root file hides product structure.
- Adding a third page or deep link will become awkward.
- Root imports many components directly.

Better alternative now:

- Extract `LampPlannerPage.vue`.
- Keep `App.vue` as shell and page selector.
- Later, add lightweight routing only if URLs, deep links, or browser history
  are required.

Migration complexity:

- Low.

Primary risk:

- Accidentally changing provided store scope or modal behavior.

Verification:

- `npm test`
- `npm run lint`
- `npm run build`
- Browser smoke for page switching after a browser test stack exists.

### 8.2 Planner Store

Current approach:

- `src/stores/plannerStore.js` owns reactive state, computed snapshots, store
  actions, initialization, and watchers.
- Use cases are delegated through `createPlannerUseCases()`.

Why this was reasonable:

- A single reactive adapter is easy to understand while product concepts are
  evolving.
- The store delegates much of the policy already.

Current limitations:

- Store still knows too much about initialization, form overwrite, snapshots,
  migration warnings, issue buckets, board preview, and actions.
- Reactive mutation shape is implicit and weakly typed.
- Watcher behavior is important but not explicitly modeled.

Better alternative now:

- Split store adapters by feature:
  - board library adapter
  - lamp planner adapter
  - board preview adapter
  - planner issues adapter
- Keep a facade if components still need one context object.
- Convert state shape to explicit typed/JSDoc structures before TypeScript
  conversion.

Migration complexity:

- Medium.

Primary risk:

- Breaking component expectations by changing store property names.

Verification:

- Existing planner use-case tests.
- New store adapter tests for initialization and watcher effects.
- E2E workflow tests.

### 8.3 Planner Use Cases

Current approach:

- `plannerUseCases.js` composes library, instance, and emitter action bundles.
- `emitterActions.js` is a large action bundle.
- `instanceActions.js` and `libraryActions.js` are more focused.

Why this was reasonable:

- Framework-free use cases are already a strong architecture move.
- It avoided scattering mutations across components.

Current limitations:

- `emitterActions.js` contains several independent responsibilities.
- Use-case input uses broad `Record<string, any>` and `Function`.
- Return envelopes are inconsistent. Some actions return bare `{ ok: true }`;
  others return warnings/errors.

Better alternative now:

- Split emitter actions into:
  - `emitterSelectionActions`
  - `emitterDragActions`
  - `defaultEmitterDriveActions`
  - `emitterConfigModalActions`
  - `bulkEmitterConfigActions`
- Replace generic dependency signatures with named function typedefs.
- Normalize action result shapes for all user-facing failures.

Migration complexity:

- Medium.

Primary risk:

- Selection and modal edge cases regress.

Verification:

- Existing emitter interaction and bulk config tests.
- New tests around range selection, additive selection, selection sanitization,
  missing emitter IDs, and default drive updates.

### 8.4 Planner Snapshot Pipeline

Current approach:

- `buildPlannerSnapshotPipeline()` orchestrates validation, per-instance
  simulation, aggregation, timing, and envelope creation.
- `resolveBoardInstanceSimulation()` handles one board instance.

Why this was reasonable:

- A staged pipeline is much safer than embedding this in Vue.
- It gives one runtime path for the planner snapshot.

Current limitations:

- `performance.now()` is called inside application services.
- Timing is both a UI concern and part of the snapshot envelope.
- Validation issues and simulation execution are still closely coupled.
- Empty-map behavior uses `BoardProfile` and PPFD engine directly inside the
  pipeline.

Better alternative now:

- Add an injected timer with `nowMs()`.
- Split pipeline into:
  - normalize input
  - validate board
  - build simulation requests
  - execute simulations
  - aggregate maps
  - attach timings and envelope
- Use shared empty map helper.

Migration complexity:

- Medium.

Primary risk:

- Numerical drift or timing tests becoming flaky.

Verification:

- Baseline snapshot test.
- PPFD engine interface test.
- New deterministic timer test with fixed timings.
- Reference comparison thresholds.

### 8.5 PPFD Engines

Current approach:

- `PpfdEstimator` is the optimized fast preview engine.
- `referenceEngine.js` is the slower correctness lane.
- Both share concepts such as PPFD scale, value scale, fixture offsets, and grid
  geometry.

Why this was reasonable:

- Performance was product-critical, so an optimized class was appropriate.
- A reference engine provides a correctness anchor.

Current limitations:

- PPFD constants are duplicated.
- Fixture offset logic is duplicated.
- `PpfdEstimator` is large and owns caches, fixture layout, source binning,
  stamp generation, accumulation, and output summary.
- Public engine contract exists but engine internals are hard to change safely.

Better alternative now:

- Extract:
  - `ppfdConstants.js`
  - `fixtureLayout.js`
  - `gridGeometry.js`
  - `sourceBinning.js`
  - `quantizedStampCache.js`
  - `ppfdSummary.js`
- Keep `PpfdEstimator` as facade until internals are stable.
- Add correctness thresholds comparing fast and reference engines over multiple
  fixtures.

Migration complexity:

- High.

Primary risk:

- Subtle numerical drift.

Verification:

- Baseline fixture.
- Engine comparison metrics.
- Performance benchmark rows.
- New fixture-layout parity tests for fast and reference engines.

### 8.6 Board Preview Snapshot

Current approach:

- `buildBoardPlannerPreviewSnapshot()` resolves emitter electrical, photon
  output, spectrum aggregation, CCT, wiring estimate, selection projection, and
  warnings.

Why this was reasonable:

- Board Preview needed a complete view model quickly.
- Keeping it out of the component was already the right first extraction.

Current limitations:

- It is a multi-responsibility service.
- Electrical, spectral, wiring, and selection logic cannot be tested in small
  units.
- CCT policy is embedded in preview assembly.

Better alternative now:

- Split into smaller pure services:
  - `resolveEmitterElectricalRows()`
  - `estimateEmitterPhotonRows()`
  - `aggregateEmitterPhotonSpectrum()`
  - `estimateBoardWiringFromEmitterGrid()`
  - `buildBoardSpectrumSummary()`
  - `projectEmitterSelection()`
- Keep `buildBoardPlannerPreviewSnapshot()` as the compatibility facade.

Migration complexity:

- Medium.

Primary risk:

- Existing snapshot shape changes accidentally.

Verification:

- Existing board preview snapshot tests.
- New unit tests for each extracted service.
- Baseline snapshot test.

### 8.7 Board Library And Persistence

Current approach:

- Versioned document format is v1.1.
- Legacy flat board entries are accepted.
- Import validates v1.1 documents and supported legacy records.
- Storage adapter uses browser localStorage.

Why this was reasonable:

- It supports users across schema changes.
- It keeps persistent shape distinct from runtime shape.

Current limitations:

- Storage corruption and write failure are hidden at the browser adapter.
- Import/export has a collection schema string but no versioned collection
  contract module.
- There is no persistence recovery UI plan.

Better alternative now:

- Add a versioned collection contract.
- Return storage load/save report objects.
- Surface corruption/quota issues through board migration warnings.
- Add import/export compatibility tests for collection shape.

Migration complexity:

- Medium.

Primary risk:

- Existing localStorage data compatibility.

Verification:

- Board document migration tests.
- Board library service tests.
- Manual import/export smoke with legacy and v1.1 examples.

### 8.8 Spectral Data And Bundle

Current approach:

- One large `all_series.json` is imported from domain spectral modules.
- Vite bundles the app into one main JS chunk of about 510.96 kB minified.

Why this was reasonable:

- Simple, deterministic, offline-friendly.
- No data fetching or async state needed.

Current limitations:

- The main bundle crosses Vite's warning threshold.
- Users pay for all spectral datasets on first load.
- Future LED dataset growth will worsen the bundle.

Better alternative now:

- Split spectral datasets by series or family.
- Lazy-load only selected LED datasets.
- Cache loaded datasets in `spectralCore`.
- Keep an offline static data strategy.
- Add a build budget gate.

Migration complexity:

- Medium to high.

Primary risk:

- Async spectral loading ripples through currently synchronous services.

Verification:

- Build budget check.
- LED Lab snapshot tests adapted for async only if async is introduced.
- Browser smoke for first chart render.

### 8.9 Vue Components

Current approach:

- Components use `<script setup>` with JavaScript.
- Components call store actions directly.
- Charts and heatmap are rendered with SVG/canvas.

Why this was reasonable:

- Vue Composition API keeps the implementation straightforward.
- Direct store calls reduced boilerplate.

Current limitations:

- Large components combine control panels, rendering, event handling, and
  formatting.
- Component props/events are runtime-only, not statically checked.
- Browser-specific rendering and pointer behavior are not covered by tests.
- Several global styles are broad.
- Google Fonts are imported from a network URL in CSS.

Better alternative now:

- Split large SFCs into smaller presentational components and composables.
- Keep store calls near page/container components.
- Use props/events for leaf components.
- Add component/browser tests after decomposition.
- Consider self-hosted or system fonts for offline/privacy consistency.

Migration complexity:

- Medium.

Primary risk:

- UI regressions not caught by current Node-only tests.

Verification:

- Browser smoke tests.
- Component tests for controls, events, labels, and pointer flows.
- Manual visual checks during transition.

### 8.10 Testing And Tooling

Current approach:

- `node:test` covers pure service and workflow behavior.
- ESLint and Prettier are configured.
- Vite build passes.

Why this was reasonable:

- Fast, minimal dependency stack.
- Good fit for service-heavy architecture.

Current limitations:

- No CI.
- No type check.
- No component tests.
- No browser tests.
- No bundle budget gate.
- No automated architecture graph check.

Better alternative now:

- Add CI first.
- Add type checking after approval of dependency/tooling changes.
- Add browser smoke tests only after pages/components are split enough to test.
- Keep Node tests as the core numerical regression suite.

Migration complexity:

- Low to medium.

Primary risk:

- Tooling churn slows feature work.

Verification:

- CI green on clean checkout.
- Scripts documented in README.

## 9. Phased Implementation Roadmap

### Phase 0: Baseline, Governance, And CI

Objective:

- Make the current healthy baseline repeatable outside this workstation.

Entry criteria:

- Current local checks pass.
- Node runtime version is known.
- Team agrees that generated `dist/` remains ignored.

Tasks:

1. Add a CI workflow for install, lint, format check, tests, and build.
2. Pin or document Node version using `.nvmrc`, `.node-version`, or package
   `engines`.
3. Update README quality commands to include the exact supported local path:
   `npm test`, `npm run lint`, `npm run format:check`, `npm run build`.
4. Add a `check` script that already exists to CI.
5. Add a lightweight bundle-size budget script or CI grep for Vite chunk
   warnings.
6. Add an ADR or implementation note for the migration strategy in this file.
7. Decide whether `AGENTS.md` should be tracked, then stage it if yes.
8. Confirm no CI secrets or network-only resources are required.

Verification gate:

- CI runs clean on a fresh checkout.
- Local `npm run check` passes.
- CI fails if format, lint, tests, or build fail.

Rollback:

- Disable only the new CI workflow.
- No application code rollback should be needed.

Risks:

- Node version mismatch.
- Lockfile or install behavior differs locally and in CI.

Mitigation:

- Use committed `package-lock.json`.
- Use `npm ci` in CI.

### Phase 1: Boundary And Type Strategy

Objective:

- Make public data boundaries explicit before moving code.

Entry criteria:

- Phase 0 complete.
- Team chooses either "JSDoc plus checkJs first" or "incremental TypeScript".

Recommended path:

- Start with JSDoc cleanup and architecture tests.
- Add TypeScript tooling only after the current JSDoc contracts are coherent.
- Convert pure modules before Vue SFCs if TypeScript is adopted.

Tasks:

1. Inventory exported functions under `src/application`, `src/domain`,
   `src/catalog`, and `src/contracts`.
2. Classify each exported function as:
   - public boundary
   - internal helper
   - compatibility facade
3. Add or tighten JSDoc on public boundaries only.
4. Replace broad `Function` dependency signatures with typedefs in:
   - `src/application/planner/plannerUseCases.js`
   - `src/application/planner/useCases/emitterActions.js`
   - `src/application/planner/useCases/instanceActions.js`
   - `src/application/planner/useCases/libraryActions.js`
5. Replace `Record<string, any>` dependency shapes with named state typedefs.
6. Add architecture fitness tests for:
   - domain modules do not import application modules
   - contracts do not import stores/components
   - components do not import `src/domain/*`
   - stores do not import components
7. Add an ADR for type strategy.
8. If approved, add type-check tooling in a separate commit.

Verification gate:

- Existing 60 tests still pass.
- Lint and format pass.
- New architecture fitness tests pass.
- No runtime behavior changes.

Rollback:

- Remove only new checks or typedef changes.
- No data migration required.

Risks:

- Type cleanup reveals inconsistent runtime shapes.
- Over-tightening architecture tests blocks legitimate imports.

Mitigation:

- Add tests as advisory first if needed.
- Keep exceptions explicit and temporary.

### Phase 2: Deterministic Runtime Adapters

Objective:

- Remove direct timing and browser primitives from application boundaries.

Entry criteria:

- Phase 1 public boundaries documented.

Tasks:

1. Extend `src/utils/runtime.js` with a timer dependency:
   - `systemTimer.nowMs()`
   - `createFixedTimer()` for tests if useful.
2. Thread timer dependency into:
   - `buildPlannerSnapshotPipeline()`
   - `resolveBoardInstanceSimulation()`
3. Keep default behavior using `performance.now()` through the adapter.
4. Update tests to assert deterministic timing with an injected timer.
5. Add storage result wrappers:
   - `loadSavedBoardsWithReport()`
   - `saveBoardCollectionWithReport()`
6. Preserve existing `loadSavedBoards()` and `saveBoardCollection()` as
   compatibility wrappers until store code migrates.
7. Surface storage read/write warnings in board migration issue state.
8. Add tests for malformed localStorage JSON and quota/save failures.

Verification gate:

- Planner timing tests are deterministic.
- Existing storage behavior remains backward-compatible.
- Import/export tests pass.

Rollback:

- Keep adapter functions but revert store adoption.

Risks:

- UI relies on exact `calculationMs` behavior.
- Storage issue surfacing may add UI warnings users have not seen before.

Mitigation:

- Keep warning severity low for recoverable read corruption.
- Add UI copy only after confirming desired behavior.

### Phase 3: Simulation Geometry And PPFD Shared Foundations

Objective:

- Reduce duplicated geometry logic before touching engine internals.

Entry criteria:

- Phase 2 deterministic timer in place.
- Baseline numerical fixtures are green.

Tasks:

1. Create shared fixture layout helper for board count, explicit grid, spacing,
   and explicit offsets.
2. Use shared helper in:
   - `src/domain/PpfdEstimator.js`
   - `src/domain/ppfd/referenceEngine.js`
   - `src/application/planner/pipeline/resolveBoardInstanceSimulation.js`
3. Extract PPFD constants:
   - `PPFD_SCALE`
   - `VALUE_SCALE`
   - source bucketing thresholds
4. Add parity tests for fixture offsets across fast and reference paths.
5. Add tests for edge cases:
   - zero board count
   - explicit fixture grid
   - mixed fixture spacing X/Y
   - explicit placement offsets
   - rotated board footprints
6. Keep `PpfdEstimator` public behavior unchanged.
7. Add reference comparison tests across at least three fixture layouts.

Verification gate:

- Baseline snapshot stays within tolerance.
- Fast/reference comparison stays within agreed thresholds.
- Performance benchmark does not regress beyond an agreed budget.

Rollback:

- Revert helper adoption module by module.

Risks:

- Numerical drift from rounding or offset convention changes.
- Performance regression if helper allocations increase.

Mitigation:

- Preserve old helper logic behind tests before replacing.
- Avoid allocating in hot loops.

### Phase 4: Board Preview Service Decomposition

Objective:

- Split the largest board preview use case into testable sub-services.

Entry criteria:

- Phase 3 helper extraction complete or explicitly deferred.
- Board preview baseline tests green.

Tasks:

1. Add characterization tests for current `buildBoardPlannerPreviewSnapshot()`
   shape.
2. Extract `normalizeBoardPreviewEmitters()` if not already sufficiently covered
   by `normalizeBoardPlannerEmitters()`.
3. Extract `resolveEmitterElectricalRows()`.
4. Extract `estimateEmitterPhotonRows()`.
5. Extract `aggregateEmitterPhotonSpectrum()`.
6. Extract `estimateBoardWiringFromEmitterGrid()`.
7. Extract `buildBoardSpectralSummary()`.
8. Extract `buildBoardCctSummary()`.
9. Extract `projectEmitterSelection()`.
10. Keep `buildBoardPlannerPreviewSnapshot()` as a facade that calls the new
    helpers.
11. Add tests for each helper.
12. Update docs to show preview snapshot data flow.

Verification gate:

- Existing board preview tests pass.
- Baseline tests pass.
- New helper tests pass.
- No component changes yet.

Rollback:

- Facade allows reverting helper internals without touching Vue.

Risks:

- Snapshot shape drift.
- Duplicate logic during transition.

Mitigation:

- Lock snapshot shape with tests before extraction.
- Delete old internal helper code after facade is stable.

### Phase 5: Planner Use-Case Decomposition

Objective:

- Reduce the 600+ line emitter action bundle and make state transitions easier
  to test.

Entry criteria:

- Phase 1 state typedefs exist.
- Phase 4 preview helpers are stable.

Tasks:

1. Add focused tests around current emitter selection behavior:
   - primary selection
   - additive selection
   - range selection
   - clear selection
   - select all
   - selection sanitization after emitter regeneration
2. Extract `emitterSelectionActions`.
3. Add tests around default emitter drive behavior:
   - constant voltage mode
   - constant current mode
   - preserve voltage
   - preserve current
   - temperature update
4. Extract `defaultEmitterDriveActions`.
5. Add tests around emitter config modal state.
6. Extract `emitterConfigActions`.
7. Add tests around bulk config open/save/cancel.
8. Extract `bulkEmitterConfigActions`.
9. Keep `createBoardPreviewEmitterActions()` as a composition facade.
10. Replace generic dependencies with typed dependency objects.

Verification gate:

- Existing workflow tests pass.
- New action tests pass.
- Store public API unchanged.

Rollback:

- Revert one extracted action group at a time.

Risks:

- Components depend on subtle action side effects.

Mitigation:

- Preserve facade return shape.
- Add tests before each extraction.

### Phase 6: Vue Component Decomposition

Objective:

- Turn large SFCs into containers plus focused presentational components.

Entry criteria:

- Board preview and action services are decomposed enough that components do
  not need to know service internals.

Tasks:

1. Extract `LampPlannerPage.vue` from `App.vue`.
2. Keep `App.vue` as shell, page switch, and provider.
3. Extract Board Preview components:
   - toolbar
   - default drive controls
   - geometry controls
   - wiring controls
   - emitter SVG
   - spectrum summary
   - warning list
4. Extract Board Preview composables:
   - board rect scaling
   - board coordinate conversion
   - keyboard selection shortcuts
5. Extract Heatmap rendering logic from `PpfdHeatmap.vue` into a composable or
   renderer module:
   - canvas sizing
   - heatmap cell painting
   - grid overlay
   - board rectangle overlay
   - drag preview
6. Extract LED Lab components:
   - comparison row controls
   - spectral metric tables
   - photon flux table
   - chart section
7. Replace emoji lock text with accessible icon/text or plain text that has
   stable accessible names.
8. Review all form controls for accessible labels and error messaging.
9. Avoid in-app instructional text unless it is domain content.
10. Add component tests after each split if/when component test tooling is
    approved.

Verification gate:

- Existing tests pass.
- Build passes.
- Manual UI smoke passes.
- Browser smoke passes once available.

Rollback:

- Component splits are isolated and can be reverted per component.

Risks:

- CSS regressions from moving markup.
- Event payload regressions.

Mitigation:

- Split markup without changing class names first.
- Add browser screenshots or manual screenshots for key viewports.

### Phase 7: Spectral Data And Bundle Strategy

Objective:

- Reduce initial bundle size and protect future spectral data growth.

Entry criteria:

- Core services and tests are stable.
- Team agrees on sync vs async spectral API migration.

Preferred strategy:

- Split spectral data by series or family.
- Introduce lazy dataset loading at the catalog/spectral boundary.
- Keep synchronous compatibility helpers until all callers migrate.

Tasks:

1. Measure current bundle with a reproducible script.
2. Identify which modules pull `all_series.json` into the main chunk.
3. Split `all_series.json` into per-family or per-series JSON assets.
4. Add a dataset manifest that maps series id to asset loader.
5. Add cached async `resolveSpectralDatasetAsync()`.
6. Keep current sync resolver for tests and compatibility until callers migrate.
7. Migrate LED Lab to async snapshot loading if required.
8. Migrate Board Preview spectral aggregation if required.
9. Add loading/error states for spectral data.
10. Add tests for missing dataset, cache hit, and dataset load failure.
11. Add Vite manual chunk or dynamic imports for rarely used page groups if data
    splitting alone is insufficient.
12. Replace Google Fonts network import with self-hosted fonts or system-font
    stack if offline/privacy is a product requirement.

Verification gate:

- Build warning removed or accepted via explicit chunk budget decision.
- Initial JS chunk below agreed budget.
- LED Lab and Board Preview still render selected spectra.
- Baseline spectral tests pass.

Rollback:

- Keep old sync resolver until async path is proven.
- Revert manifest adoption without changing runtime data shape.

Risks:

- Async migration touches many pure services.
- Lazy loading can introduce UI states not currently designed.

Mitigation:

- Use compatibility facades.
- Move one consumer at a time.

### Phase 8: Persistence Contract V1.2 Readiness

Objective:

- Make the next persisted board/schema change safe before it is needed.

Entry criteria:

- Board library service tests green.

Tasks:

1. Add `BoardDefinitionDocumentCollection` contract module.
2. Define collection version separately from board document version.
3. Add migration matrix tests:
   - empty storage
   - invalid non-array storage
   - legacy flat boards
   - valid v1.1 documents
   - malformed v1.1 documents
   - duplicate IDs
   - unknown future version
4. Decide whether unknown future versions are rejected, read-only, or migrated
   best-effort.
5. Add storage warning UI behavior for recovered legacy/corrupt data.
6. Add import conflict policy:
   - merge overwrite
   - merge skip duplicate
   - replace all
7. Make conflict policy explicit in import result data.
8. Add sample exported fixture under `test/fixtures/board-library/`.

Verification gate:

- Import/export round trip tests pass.
- Existing localStorage v1.1 data still reads.
- Corrupt data warning is visible but does not crash.

Rollback:

- Keep read path backward-compatible.
- Do not write v1.2 until tests and UI are complete.

Risks:

- Data loss.

Mitigation:

- Never delete old storage until a successful write is confirmed.
- Consider export-before-replace UI later.

### Phase 9: Component, Browser, And Release Verification

Objective:

- Cover the workflows current Node tests cannot see.

Entry criteria:

- Service layer decompositions reduce component complexity.
- Team approves test dependencies.

Possible tool choices:

- Keep `node:test` for service/domain tests.
- Add Vitest and Vue Test Utils for SFC behavior if approved.
- Add Playwright for browser smoke if approved.

Tasks:

1. Add one smoke test for app mounting.
2. Add one smoke test for switching between Lamp Planner and Board Planner.
3. Add one smoke test for LED Lab rendering a chart.
4. Add one smoke test for Board Preview emitter selection.
5. Add one smoke test for PPFD heatmap nonblank canvas.
6. Add accessibility checks for form labels and button names.
7. Add screenshot or DOM tests only for stable UI contracts.
8. Add CI jobs for browser tests if stable enough.
9. Keep browser tests few and high-value to avoid flake.

Verification gate:

- Browser tests pass locally and in CI.
- Existing Node tests remain fast.
- No broad snapshots that churn on styling.

Rollback:

- Keep browser smoke suite separate from core unit checks until stable.

Risks:

- Browser tests can become flaky.
- Dependency stack grows.

Mitigation:

- Test core workflows, not implementation details.
- Use deterministic data and fixed viewport.

## 10. Module-By-Module Migration Order

Recommended order:

1. `package.json`, CI config, Node version metadata.
2. `test/architecture.fitness.test.js` for boundary guardrails.
3. `src/utils/runtime.js` for timer adapter.
4. `src/application/planner/pipeline/*` for injected timing.
5. `src/domain/ppfd/*` and `src/domain/PpfdEstimator.js` for shared fixture
   helpers.
6. `src/application/planner/buildBoardPlannerPreviewSnapshot.js` facade
   extraction.
7. `src/application/planner/useCases/emitterActions.js` action extraction.
8. `src/stores/plannerStore.js` facade cleanup after action extraction.
9. `src/App.vue` to `LampPlannerPage.vue` extraction.
10. `src/components/BoardPreviewSection.vue` split.
11. `src/components/PpfdHeatmap.vue` rendering extraction.
12. `src/pages/LedComparisonPage.vue` split.
13. `src/application/spectral/spectralCore.js` and spectral catalog loading.
14. `src/application/boardLibrary/*` v1.2 readiness.
15. Optional type conversion of pure modules.
16. Optional component/browser test adoption.

Do not move folders wholesale before behavior is covered. Move only when a
module is already being touched and tests pin the behavior.

## 11. Data Contract And Interface Transition Plan

### Current Contract Assets

- `createSuccessResult()`
- `createFailureResult()`
- `createSnapshotEnvelope()`
- `BoardDefinitionDocument`
- `BoardEmitterDocument`
- App issue normalization
- Contract assertions
- Baseline fixture

### Target Contract Rules

1. Mutation use cases return operation envelopes.
2. Snapshot builders return snapshot envelopes at public boundaries.
3. Internal pure helpers return plain data or throw typed/narrow errors only if
   the facade catches them.
4. Storage adapters return report objects or envelopes, not silent fallbacks.
5. Persisted document version and runtime shape stay separate.
6. Unknown imported documents do not mutate storage.
7. Migration warnings are user-visible but not fatal unless data cannot be read.
8. Version constants are the only source of schema version strings.

### Transition Steps

1. Document current v1.1 persisted shape.
2. Add collection contract around board arrays.
3. Add migration result type:
   - `boards`
   - `warnings`
   - `errors`
   - `sourceVersion`
   - `targetVersion`
4. Update import/export to return conflict metadata.
5. Add fixtures for every supported input shape.
6. Only then introduce v1.2 fields if needed.

## 12. Test Strategy

### Keep

- Node test runner for pure service/domain/integration tests.
- Baseline fixture for numerical drift.
- Architecture fitness tests.
- Contract assertion tests.
- Workflow smoke tests.

### Add Before Refactors

- Characterization tests for large services before extraction.
- Edge-case tests for fixture layout and PPFD engines.
- Storage failure/corruption tests.
- Store initialization tests with memory storage and deterministic IDs.

### Add During Refactors

- Per-helper unit tests for extracted board preview services.
- Per-action tests for extracted emitter action modules.
- Parity tests comparing old facade output with new helper-composed output.

### Add After Refactors

- Component tests for split Vue controls.
- Browser smoke tests for canvas/SVG rendering and page flows.
- Bundle budget check.

### Avoid

- Broad snapshots of full Vue DOM.
- Exact Rich/Painter/canvas pixel tests unless they are stable and targeted.
- Browser tests for every tiny form field.
- Coverage percentage gates before meaningful tests exist for UI behavior.

## 13. Deployment And Rollout Strategy

Current deployment target is not represented in repo config. Treat the app as a
static Vite build until confirmed otherwise.

Rollout plan:

1. Establish CI on current build.
2. Keep each architecture phase in small PRs.
3. Use compatibility facades for every moved service.
4. Keep baseline fixture unchanged unless the numerical change is deliberate.
5. For persistence changes, read old versions before writing new versions.
6. For async spectral loading, ship hidden behind compatibility wrappers first.
7. For UI splits, keep class names and rendered text stable initially.
8. For route/page changes, keep default first screen behavior stable.

Rollback plan:

- Phase 0: disable CI workflow.
- Phase 1: relax new architecture/type checks.
- Phase 2: revert adapter adoption while keeping adapter modules.
- Phase 3: switch PPFD facade back to old helpers.
- Phase 4: use board preview facade to restore old helper logic.
- Phase 5: re-compose old action bundle behind same store API.
- Phase 6: revert individual component extractions.
- Phase 7: switch spectral resolver back to eager JSON.
- Phase 8: keep write path on v1.1 until v1.2 migration proves safe.
- Phase 9: mark browser tests non-blocking until stable.

## 14. Success Metrics

Technical:

- `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`
  pass in CI.
- No production build chunk warning, or an explicit documented budget exception.
- Fast/reference PPFD comparison stays under agreed MAE, p95, and max-error
  thresholds.
- Baseline snapshot deltas remain within current tolerances unless an ADR
  approves recalibration.
- No component directly imports `src/domain/*`.
- No application service imports stores/components.
- Timing tests can run with deterministic timer injection.
- Board library import rejects invalid data without mutating storage.

Maintainability:

- No Vue SFC over 400 lines without an explicit exception.
- No application service over 350 lines without an explicit exception.
- `PpfdEstimator` internals split or documented by focused helpers.
- Large action bundles split by responsibility.
- Public boundaries have clear JSDoc or TypeScript types.

Product:

- Planner snapshot still renders in under agreed interactive budget.
- Board Preview emitter selection remains stable.
- LED Lab comparison renders selected LED spectra correctly.
- Import/export preserves user custom boards.
- Users can recover from corrupted local board storage with clear messaging.

## 15. Risk Register

| Risk                                   | Severity | Where                                    | Mitigation                                                               |
| -------------------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Numerical drift                        | High     | PPFD, electrical, photon, spectral       | Baseline fixtures, reference comparison, ADR before recalibration        |
| LocalStorage data loss                 | High     | Board library                            | Read-before-write, migration matrix, export fixtures                     |
| Bundle splitting introduces async bugs | Medium   | Spectral catalog, LED Lab, Board Preview | Compatibility facade, migrate one consumer at a time                     |
| UI regression from component splits    | Medium   | Board Preview, Heatmap, LED Lab          | Preserve class names first, add browser smoke                            |
| Type migration churn                   | Medium   | JS/JSDoc to TS                           | Pure modules first, no SFC conversion until services are stable          |
| CI friction                            | Medium   | Tooling                                  | Start with current scripts only                                          |
| Performance regression                 | High     | PPFD hot path, canvas rendering          | Benchmarks, avoid allocations, profile before worker migration           |
| Overengineering                        | Medium   | New folders/tools                        | Require each abstraction to replace real duplication or reduce real risk |
| Test flake                             | Medium   | Browser tests                            | Few high-value smoke tests, deterministic viewport/data                  |

## 16. Immediate Implementation Tickets

### Ticket 001: Add CI For Current Scripts

Goal:

- Ensure current quality gates run consistently.

Files:

- `.github/workflows/ci.yml`
- `package.json`
- README quality section

Acceptance:

- CI runs install, lint, format check, tests, and build.
- CI uses committed lockfile.
- CI passes on current main branch.

### Ticket 002: Document Node Version

Goal:

- Remove local ambiguity around `npm` and Node.

Files:

- `.nvmrc` or `.node-version`
- `package.json`
- README

Acceptance:

- A fresh shell can discover the supported Node version.
- README setup is accurate.

### Ticket 003: Add Bundle Budget Gate

Goal:

- Prevent spectral data growth from silently increasing initial JS.

Files:

- `package.json`
- optional `scripts/check-bundle-size.mjs`

Acceptance:

- Build budget gate fails on unexpected warning or agreed threshold breach.
- Current 510.96 kB bundle warning is either fixed in Phase 7 or documented as
  temporary.

### Ticket 004: Add Timer Adapter

Goal:

- Keep timing useful while making services testable.

Files:

- `src/utils/runtime.js`
- `src/application/planner/pipeline/buildPlannerSnapshotPipeline.js`
- `src/application/planner/pipeline/resolveBoardInstanceSimulation.js`
- `test/planner.snapshot.timing.test.js`

Acceptance:

- Tests can inject deterministic timings.
- Default UI behavior still uses real performance timing.

### Ticket 005: Add Storage Report Adapter

Goal:

- Surface localStorage corruption/save failures.

Files:

- `src/utils/storage.js`
- `src/application/boardLibrary/boardLibraryService.js`
- `src/stores/plannerStore.js`
- new or existing board library tests

Acceptance:

- Malformed storage produces a warning instead of silent empty data.
- Save failure produces an operation error.

### Ticket 006: Extract Fixture Layout Helper

Goal:

- Make PPFD engine fixture placement consistent.

Files:

- `src/domain/ppfd/fixtureLayout.js`
- `src/domain/PpfdEstimator.js`
- `src/domain/ppfd/referenceEngine.js`
- `test/ppfd.engine.interface.test.js`

Acceptance:

- Fast and reference engines produce fixture counts and offsets consistently.
- Baseline snapshot stays within tolerance.

### Ticket 007: Extract Board Preview Electrical Rows

Goal:

- Isolate emitter electrical calculations from preview assembly.

Files:

- `src/application/planner/boardPreviewElectrical.js`
- `src/application/planner/buildBoardPlannerPreviewSnapshot.js`
- `test/board.preview.snapshot.test.js`

Acceptance:

- Helper has focused tests.
- Preview facade output shape does not change.

### Ticket 008: Extract Board Preview Spectrum Aggregation

Goal:

- Isolate photon spectrum aggregation and spectral warnings.

Files:

- `src/application/planner/boardPreviewSpectrum.js`
- `src/application/planner/buildBoardPlannerPreviewSnapshot.js`
- tests

Acceptance:

- Missing spectral dataset warning behavior is tested.
- Aggregate relative and photon spectra remain unchanged.

### Ticket 009: Split Emitter Selection Actions

Goal:

- Reduce `emitterActions.js` size and clarify selection behavior.

Files:

- `src/application/planner/useCases/emitterSelectionActions.js`
- `src/application/planner/useCases/emitterActions.js`
- tests

Acceptance:

- Additive, range, primary, clear, and select-all behavior is covered.
- Store API remains unchanged.

### Ticket 010: Extract Lamp Planner Page

Goal:

- Make `App.vue` a shell rather than a page implementation.

Files:

- `src/pages/LampPlannerPage.vue`
- `src/App.vue`

Acceptance:

- Page switching behavior remains unchanged.
- Root provider/modals still work.

### Ticket 011: Split Board Preview Section

Goal:

- Turn `BoardPreviewSection.vue` into a container plus focused child
  components.

Files:

- `src/components/BoardPreviewSection.vue`
- new `src/components/boardPreview/*` files or feature folder equivalent

Acceptance:

- No child component imports store unless it is explicitly a container.
- Controls emit events or accept callbacks.
- Build and manual smoke pass.

### Ticket 012: Add Browser Smoke For Canvas And SVG

Goal:

- Catch rendering regressions that Node tests cannot see.

Files:

- test tooling config after approval
- browser smoke specs

Acceptance:

- App mounts.
- Heatmap canvas is nonblank.
- Board Preview SVG has emitter nodes.
- LED Lab chart renders at least one path.

## 17. Python CLI Applicability Plan

Current state:

- No `pyproject.toml`.
- No `uv.lock`.
- No `.python-version`.
- No Python files.
- No Python CLI entry points.

Recommendation:

- Do not add Python tooling as part of this improvement plan.
- Do not introduce `uv`, Typer, Click, Rich, Ruff, ty, pytest, or Python
  packaging unless a real Python CLI task is requested.

Only consider a Python CLI if one of these future needs becomes concrete:

1. Reproducible vendor datasheet extraction from `pdf/*.pdf`.
2. Spectral dataset normalization from raw vendor CSV/PDF sources.
3. Offline calibration fixture generation.
4. Release audit/report generation that cannot be cleanly handled by Node.

If approved later, the CLI should:

- Be a separate `tools/` or `python/` package with `pyproject.toml`.
- Use `uv` for dependency management.
- Expose commands through `[project.scripts]`.
- Keep CLI callbacks thin.
- Put parsing/calibration logic in importable modules.
- Test with pytest and temporary directories.
- Keep stdout machine-readable for JSON modes.
- Write diagnostics to stderr.
- Avoid network, prompts, credentials, and local user config.

## 18. Open Questions For Human Confirmation

1. Should `AGENTS.md` be tracked in git?
2. Is the app expected to work fully offline? This affects Google Fonts and
   spectral data loading strategy.
3. Is there a deployment host with specific constraints?
4. Is initial bundle size important enough to prioritize before UI
   decomposition?
5. Is TypeScript desired, or should the repo stay JavaScript with stronger
   JSDoc and architecture tests?
6. Should future custom-board imports overwrite duplicate IDs by default, or
   should users choose conflict behavior?
7. What PPFD fast/reference error thresholds are scientifically acceptable?
8. Should browser tests be a blocking CI gate immediately or advisory at first?

## 19. Final Sequencing Summary

Recommended first three implementation steps:

1. Add CI and Node version metadata.
2. Add deterministic timer and storage report adapters.
3. Extract shared PPFD fixture layout helper.

Recommended next three after that:

1. Split board preview snapshot helpers.
2. Split emitter action modules.
3. Extract Lamp Planner page and Board Preview child components.

Recommended delayed work:

1. TypeScript migration.
2. Async spectral data loading.
3. Component/browser test dependency adoption.
4. Any Python CLI tooling.

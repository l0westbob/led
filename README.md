# LED PPFD Planner

Vue 3 + Vite app for configuring LED boards, estimating calibrated photon output, and previewing PPFD maps.

## Architecture (current state)

The app now follows a layered structure:

- `src/catalog/`: static data access + canonical resolvers
  - LED definitions (`LedLibraryV2`) behind checked data modules
  - board preset normalization
  - spectral dataset resolution (`all_series.json`)
- `src/application/`: use-cases/orchestration
  - electrical operating point resolution
  - photon output estimation
  - planner snapshot building
  - planner use-case orchestration (`plannerUseCases.ts`)
  - planner placement/config/library state helpers
  - LED Lab snapshot building
  - shared LED comparison math utilities + shared spectrum chart view-model
  - board preview emitter drag helpers
  - shared spectral core resolver (`relative`/`photon` display + photon kernels)
  - staged planner snapshot pipeline modules (`pipeline/*`)
  - board-level CCT estimation interfaces
  - board-library CRUD service + board-definition validation
  - board document migration layer (`legacy` ↔ `v1.1`)
- `src/contracts/versioned/`: contract/version primitives
  - operation envelopes (`{ ok, data, warnings, errors }`)
  - local contract assertions for persisted docs and planner snapshots
  - issue normalization
  - persisted board document contracts
  - schema version constants
- `src/domain/`: low-level domain primitives
  - `BoardProfile` geometry/model normalization
  - `PpfdEstimator` compute engine with source-binning, stamp-cache,
    accumulation, and summary helpers under `src/domain/ppfd/`
  - shared board geometry/orientation helpers (`src/domain/boardGeometry.ts`)
  - LED curve model and spectral math primitives (`src/domain/spectral/math.ts`)
- `src/stores/` + `src/components/` + `src/pages/`: presentation layer
  - testable store factories with explicit planner/LED Lab public contracts
  - store composition root with focused action modules:
    - `src/application/planner/useCases/libraryActions.ts`
    - `src/application/planner/useCases/instanceActions.ts`
    - `src/application/planner/useCases/emitterActions.ts`
  - typed page/component adapters own import/export, preview projection, SVG
    interaction, and heatmap drag scheduling boundaries

## Architecture status snapshot

- Planner snapshots now use the staged pipeline as the single runtime path.
- Planner state mutations are composed through framework-free application use cases; the Vue store is the reactive adapter.
- Permanent migration feature flags have been retired; runtime feature flag overrides remain available for future migrations.
- PPFD computation supports an engine interface:
  - `fast-preview` (default optimized estimator)
  - `reference` (slower direct-accumulation lane for drift checks)
- PPFD engines require resolved photon flux at their boundary; electrical and photon policy stays upstream in application services.
- Board library persistence is versioned through `BoardDefinitionDocument` v1.1 with migration warnings surfaced in UI state.
- Board library imports validate entries before writing storage, while still accepting legacy flat board entries.
- Board preview emitter interaction uses a deterministic interaction machine (click vs drag threshold behavior).
  - components render returned snapshots
- Planner snapshot and board preview snapshot are consumed as standardized envelopes in store boundaries.
- Board Planner includes custom-board library export/import UI (merge/replace with validation feedback).
- Component behavior has a Vitest + Vue Test Utils layer for reusable controls,
  modals, page adapters, preview interaction, and heatmap drag lifecycle.

## Key behavior

- Planner and LED Lab share the same LED/spectral resolution path.
- Electrical solve is independent from spectral calibration.
- Photon output can be anchored by:
  - direct PPF calibration (`ppfUmolS`) when available
  - lumen calibration (`luminousFluxLm`) via `V(lambda)` for variants without direct PPF
- PPFD map uses resolved board photon flux from the application layer.
- Board Planner manages custom boards (create/update/delete); presets are immutable and duplicated before edits.
- Lamp Planner consumes board definitions and places board instances with drag/rotate/configure controls.
- Board Preview supports per-emitter selection/config and move-lock-protected drag editing.
- Board Preview includes board spectrum chart (`Relative` / `Photon`) and board-level CCT metadata.
- Custom board persistence now normalizes through a versioned document adapter:
  - legacy flat board entries are read safely
  - new writes are persisted as `BoardDefinitionDocument` v1.1

## Important entry points

- [src/stores/plannerStore.ts](/Users/benochocki/Herd/led/src/stores/plannerStore.ts)
- [src/stores/planner/plannerState.ts](/Users/benochocki/Herd/led/src/stores/planner/plannerState.ts)
- [src/stores/planner/plannerSelectors.ts](/Users/benochocki/Herd/led/src/stores/planner/plannerSelectors.ts)
- [src/stores/planner/plannerLifecycle.ts](/Users/benochocki/Herd/led/src/stores/planner/plannerLifecycle.ts)
- [src/stores/ledLabStore.ts](/Users/benochocki/Herd/led/src/stores/ledLabStore.ts)
- [src/pages/boardPlanner/useBoardLibraryTransfer.ts](/Users/benochocki/Herd/led/src/pages/boardPlanner/useBoardLibraryTransfer.ts)
- [src/components/boardPreview/useBoardPreviewViewModel.ts](/Users/benochocki/Herd/led/src/components/boardPreview/useBoardPreviewViewModel.ts)
- [src/components/boardPreview/useBoardPreviewCanvasInteraction.ts](/Users/benochocki/Herd/led/src/components/boardPreview/useBoardPreviewCanvasInteraction.ts)
- [src/components/heatmap/useHeatmapBoardDrag.ts](/Users/benochocki/Herd/led/src/components/heatmap/useHeatmapBoardDrag.ts)
- [src/application/planner/plannerUseCases.ts](/Users/benochocki/Herd/led/src/application/planner/plannerUseCases.ts)
- [src/application/boardLibrary/boardLibraryService.ts](/Users/benochocki/Herd/led/src/application/boardLibrary/boardLibraryService.ts)
- [src/application/boardLibrary/boardDocumentMigration.ts](/Users/benochocki/Herd/led/src/application/boardLibrary/boardDocumentMigration.ts)
- [src/application/planner/buildPlannerSnapshot.ts](/Users/benochocki/Herd/led/src/application/planner/buildPlannerSnapshot.ts)
- [src/application/planner/pipeline/buildPlannerSnapshotPipeline.ts](/Users/benochocki/Herd/led/src/application/planner/pipeline/buildPlannerSnapshotPipeline.ts)
- [src/application/planner/placementState.ts](/Users/benochocki/Herd/led/src/application/planner/placementState.ts)
- [src/application/planner/boardConfigState.ts](/Users/benochocki/Herd/led/src/application/planner/boardConfigState.ts)
- [src/application/planner/boardLibraryState.ts](/Users/benochocki/Herd/led/src/application/planner/boardLibraryState.ts)
- [src/application/spectral/spectralCore.ts](/Users/benochocki/Herd/led/src/application/spectral/spectralCore.ts)
- [src/application/electrical/resolveElectricalOperatingPoint.ts](/Users/benochocki/Herd/led/src/application/electrical/resolveElectricalOperatingPoint.ts)
- [src/application/photons/estimatePhotonOutput.ts](/Users/benochocki/Herd/led/src/application/photons/estimatePhotonOutput.ts)
- [src/application/ledLab/buildLedLabSnapshot.ts](/Users/benochocki/Herd/led/src/application/ledLab/buildLedLabSnapshot.ts)
- [src/application/ledLab/spectralComparisonMath.ts](/Users/benochocki/Herd/led/src/application/ledLab/spectralComparisonMath.ts)
- [src/application/ledLab/buildSpectrumChartViewModel.ts](/Users/benochocki/Herd/led/src/application/ledLab/buildSpectrumChartViewModel.ts)
- [src/application/planner/buildBoardPlannerPreviewSnapshot.ts](/Users/benochocki/Herd/led/src/application/planner/buildBoardPlannerPreviewSnapshot.ts)
- [src/application/planner/boardPlannerEmitterState.ts](/Users/benochocki/Herd/led/src/application/planner/boardPlannerEmitterState.ts)
- [src/application/planner/emitterPlacement.ts](/Users/benochocki/Herd/led/src/application/planner/emitterPlacement.ts)
- [src/application/planner/estimateBoardCct.ts](/Users/benochocki/Herd/led/src/application/planner/estimateBoardCct.ts)
- [src/domain/PpfdEstimator.ts](/Users/benochocki/Herd/led/src/domain/PpfdEstimator.ts)
- [src/domain/ppfd/estimatePpfdMap.ts](/Users/benochocki/Herd/led/src/domain/ppfd/estimatePpfdMap.ts)
- [src/domain/ppfd/ppfdSourceBinning.ts](/Users/benochocki/Herd/led/src/domain/ppfd/ppfdSourceBinning.ts)
- [src/domain/ppfd/ppfdStampCache.ts](/Users/benochocki/Herd/led/src/domain/ppfd/ppfdStampCache.ts)
- [src/domain/ppfd/ppfdAccumulation.ts](/Users/benochocki/Herd/led/src/domain/ppfd/ppfdAccumulation.ts)
- [src/domain/ppfd/ppfdSummary.ts](/Users/benochocki/Herd/led/src/domain/ppfd/ppfdSummary.ts)
- [src/domain/led/ledDefinitionData.ts](/Users/benochocki/Herd/led/src/domain/led/ledDefinitionData.ts)
- [src/domain/spectral/radiantCalibration.ts](/Users/benochocki/Herd/led/src/domain/spectral/radiantCalibration.ts)
- [src/components/useEmitterDrag.ts](/Users/benochocki/Herd/led/src/components/useEmitterDrag.ts)
- [src/application/planner/emitterInteractionMachine.ts](/Users/benochocki/Herd/led/src/application/planner/emitterInteractionMachine.ts)
- [src/application/planner/useCases/libraryActions.ts](/Users/benochocki/Herd/led/src/application/planner/useCases/libraryActions.ts)
- [src/application/planner/useCases/instanceActions.ts](/Users/benochocki/Herd/led/src/application/planner/useCases/instanceActions.ts)
- [src/application/planner/useCases/emitterActions.ts](/Users/benochocki/Herd/led/src/application/planner/useCases/emitterActions.ts)
- [src/contracts/versioned/index.ts](/Users/benochocki/Herd/led/src/contracts/versioned/index.ts)
- [src/contracts/versioned/assertions.ts](/Users/benochocki/Herd/led/src/contracts/versioned/assertions.ts)
- [docs/adr/README.md](/Users/benochocki/Herd/led/docs/adr/README.md)

## Development

```bash
nvm use
npm ci
npm run dev
```

## Quality checks

```bash
npm test
npm run lint
npm run format:check
npm run build
npm run build:budget
npm run check:types
npm run test:components
npm run check
npm run test:browser
```

`npm run check` is the CI quality gate: lint, format check, Vue/TypeScript type
check, Node tests, Vitest component tests, production build, and bundle budget
verification.

`npm run check:types` is the strict Vue/TypeScript gate. Runtime source under
`src/` is TypeScript-first: modules are `.ts`, Vue SFCs use
`<script setup lang="ts">`, and `tsconfig.json` runs with `strict: true`.

`npm run test:browser` runs the Playwright smoke suite. It is intentionally
separate from `npm run check` so the fast Node gate remains lightweight. CI runs
it as a blocking `browser-smoke` job after the Node quality gate; the Playwright
config reuses an existing Vite dev server when one is already available.

### Baseline regression fixtures

- Golden baseline fixture: [test/fixtures/baseline/v1-baseline.json](/Users/benochocki/Herd/led/test/fixtures/baseline/v1-baseline.json)
- Guard test: [test/baseline.snapshot.test.js](/Users/benochocki/Herd/led/test/baseline.snapshot.test.js)
- Purpose:
  - freeze MVP-calibrated output for planner, board preview, and LED Lab
  - catch unintended numerical drift during rewrite phases

### Test runtime bootstrap

- `npm test` uses a `register()` bootstrap: [test/register-tests.mjs](/Users/benochocki/Herd/led/test/register-tests.mjs)
- The bootstrap registers [test/alias-loader.mjs](/Users/benochocki/Herd/led/test/alias-loader.mjs) so Node tests can resolve:
  - `@/` aliases
  - extensionless local imports
  - JSON modules used by spectral catalogs

### Test layers

- Unit + application integration tests run in Node test runner.
- Vue component and composable-adapter tests run in Vitest/jsdom via
  [vitest.config.ts](/Users/benochocki/Herd/led/vitest.config.ts) and
  [test/components](/Users/benochocki/Herd/led/test/components).
- Deterministic workflow smoke coverage is active in [test/e2e.workflows.test.js](/Users/benochocki/Herd/led/test/e2e.workflows.test.js) for:
  - board planner CRUD lifecycle
  - lamp planner placement/config/snapshot path
  - board preview emitter selection/bulk-config path
  - LED Lab multi-compare path
- Architecture fitness coverage is active in [test/architecture.fitness.test.js](/Users/benochocki/Herd/led/test/architecture.fitness.test.js) for:
  - no runtime `.js` modules under `src/`
  - typed Vue `<script setup lang="ts">` source
  - no broad `any` or untyped `Function` in public contracts
  - no direct runtime randomness/clocks in application services
  - no component imports from domain modules
  - no application-layer imports from stores
  - no contract imports from presentation layers
  - no store imports from components
  - presentation SFCs use typed adapters for board-library import/export and
    board preview snapshot construction
- Browser smoke coverage is active in [test/browser](/Users/benochocki/Herd/led/test/browser) for:
  - app mount
  - Lamp Planner / Board Planner switching
  - LED Lab chart rendering
  - Board Preview emitter selection
  - representative modal keyboard/focus behavior
  - mobile viewport overflow checks
  - board-library import validation and duplicate-skip feedback
  - PPFD heatmap nonblank canvas
  - core label and button-name contracts

Auto-fix:

```bash
npm run lint:fix
npm run format
```

## Data contracts quicksheet

- Geometry: board in `mm`, room and distance inputs in `cm` (normalized at app boundary)
- Flux:
  - LED/board photon flux: `umol/s`
  - PPFD map: `umol/m²/s`
- Spectrum modes:
  - relative SPD (`intensityRel`)
  - photon SPD (`umol/s/nm`)
- Board preview CCT:
  - `cct.valueK`: numeric estimate or `null`
  - `cct.method`: current estimator method label
  - `cctK`: backwards-compatible mirror of `cct.valueK`

## Naming and Docstring Checklist

- Use descriptive names for variables/functions; avoid unclear 1-3 character acronyms.
- Keep domain-approved abbreviations only when explicit (`Mm`, `Cm`, `Nm`, `Ppf`, `Ppfd`).
- Add JSDoc to exported functions and non-trivial helpers.
- Reuse shared helpers for geometry/rotation/validation to avoid duplicated rules.

## Notes

- Structured warnings/errors now flow from application resolvers into UI instead of throwing from watchers.
- ADRs are tracked under [docs/adr](/Users/benochocki/Herd/led/docs/adr) and define PPFD, electrical, spectral, CI, type-boundary, preview, and browser-verification policy.
- If local `vite build` fails with Rollup native-module signing issues on macOS, run lint/tests first and verify runtime via `npm run dev` until the local node_modules environment is repaired.

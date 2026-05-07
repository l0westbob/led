# Implementation Improvement Plan - Round 2

Date: 2026-05-29

This is a second repository analysis and planning pass after the first
hardening/refactor roadmap. It uses the current worktree as source of truth and
is intentionally a plan only. Do not implement this plan until explicitly asked.

Requested skills applied:

- `vue3-vite-specialist`: Vue 3/Vite maintainability, reactivity, build,
  accessibility, and browser-test review.
- `coding-agent-principles`: diagnosis first, evidence over assumptions,
  minimal-but-meaningful changes, explicit boundaries, and pragmatic sequencing.
- `repo-rewrite-planner`: broad repository discovery, MVP retrospective,
  architecture critique, tradeoff comparison, and long-horizon phased plan.

Discovery note:

- Per `repo-rewrite-planner`, `AGENTS.md` guidance was intentionally ignored
  during discovery so the analysis could examine the full repository surface.

## 1. Current Baseline Evidence

### Worktree State

Observed with `git status --short`:

- Only `AGENTS.md` is untracked.
- No modified tracked source/config/test files were present at the time of this
  analysis.

Interpretation:

- The first roadmap implementation is now effectively the current baseline.
- Before any implementation round, decide whether `AGENTS.md` should be tracked
  with the next change set.

### Package And Runtime

Source: `package.json`

- Vue: `^3.5.13`
- Vite: `^6.3.5`
- Node engine: `24.14.1`
- Package manager: npm with `package-lock.json`
- Main scripts:
  - `npm run dev`
  - `npm test`
  - `npm run lint`
  - `npm run format:check`
  - `npm run build`
  - `npm run build:budget`
  - `npm run check`
  - `npm run test:browser`

Current missing quality dimension:

- No static type-checking gate exists yet.
- The project is JavaScript-first and has JSDoc contracts, but nothing currently
  enforces those contracts beyond lint and tests.

### Verification Baseline

Observed command results:

- `npm run check` passed.
- Node test runner passed 110 tests.
- Production build passed.
- Bundle budget passed:
  - `spectral-series` chunk: 258.37 kB / 300.00 kB
  - entry chunk: about 209 kB minified
- `npm run test:browser` passed 6 Playwright smoke tests.

Current quality posture:

- Strong service/domain regression coverage.
- Stronger than before architecture-fitness coverage.
- Browser smoke now catches basic app/page/canvas/SVG/chart accessibility paths.
- No component unit test stack and no type-check stack.

### Source Shape

Observed file counts:

- `src`: 112 JS/Vue source files.
- `test`: 3445 lines across Node and browser tests.
- Largest source files by line count:
  - `src/domain/LedLibraryV2.js`: 1466 lines
  - `src/domain/PpfdEstimator.js`: 649 lines
  - `src/application/planner/plannerUseCases.js`: 418 lines
  - `src/contracts/versioned/assertions.js`: 377 lines
  - `src/domain/ledV2Model.js`: 350 lines
  - `src/components/BoardPreviewControls.vue`: 320 lines
  - `src/components/PpfdHeatmap.vue`: 283 lines
  - `src/stores/plannerStore.js`: 282 lines
  - `src/application/boardLibrary/boardLibraryService.js`: 274 lines
  - `src/application/planner/useCases/instanceActions.js`: 271 lines
  - `src/pages/BoardPlannerPage.vue`: 265 lines

Import graph evidence:

- 112 source files scanned.
- No source import cycles found.
- Highest incoming dependency counts:
  - `src/domain/contracts.js`: 27
  - `src/stores/plannerContext.js`: 14
  - `src/catalog/ledCatalog.js`: 11
  - `src/contracts/versioned/results.js`: 11
  - `src/catalog/boardCatalog.js`: 10
- Highest outgoing dependency counts:
  - `src/application/planner/plannerUseCases.js`: 13
  - `src/App.vue`: 10
  - `src/application/planner/buildBoardPlannerPreviewSnapshot.js`: 9
  - `src/application/planner/pipeline/buildPlannerSnapshotPipeline.js`: 9
  - `src/application/boardLibrary/boardLibraryService.js`: 8
  - `src/application/planner/pipeline/resolveBoardInstanceSimulation.js`: 8
  - `src/stores/plannerStore.js`: 8

JSDoc broadness evidence:

- `Record<string, any>` and `Function` still appear in planner use-case and
  heatmap JSDoc boundaries.
- Remaining high-value examples:
  - `src/application/planner/useCases/instanceActions.js`
  - `src/application/planner/useCases/libraryActions.js`
  - `src/application/planner/useCases/emitterActions.js`
  - `src/application/planner/plannerUseCases.js`
  - `src/components/ppfdHeatmapCanvas.js`

## 2. Product And Workflow Summary

The app is an interactive LED board and lamp-planner for estimating:

- board geometry and emitter placement
- electrical operating points
- photon output
- PPFD map output
- board preview spectra and CCT estimates
- LED spectral comparisons
- custom board-library import/export

Primary users appear to be technically oriented LED/grow-light planners who
need fast exploratory feedback, not casual consumers. The UI is an operational
tool: dense controls, immediate calculation, saved custom board definitions,
and visual outputs.

Core workflows:

1. Lamp Planner:
   - choose board preset/custom board
   - place one or more board instances in a room
   - adjust room/slice/photoperiod/resolution
   - inspect PPFD and DLI stats
2. Board Planner:
   - create/update/delete custom board definitions
   - edit board geometry and default LED drive
   - regenerate emitter grid
   - select, drag, configure, or bulk-configure emitters
   - inspect board preview output
3. LED Lab:
   - compare multiple LEDs
   - switch relative/photon mode
   - inspect spectral metrics, flux, and chart output
4. Persistence:
   - load migrated local storage
   - import/export custom board library JSON

## 3. Current Architecture Map

### Runtime Shell

- `src/main.js`
  - mounts Vue app.
- `src/App.vue`
  - top-level app shell
  - provides planner store
  - owns page toggle between Lamp Planner and Board Planner bundle
  - lazy-loads board planner, board preview, and LED Lab.

### Presentation

- `src/pages/*`
  - page-level layout and workflow grouping.
- `src/components/*`
  - controls, modals, chart, heatmap, board preview, stats.
- `src/styles/*`
  - global theme and layout styling.

### State

- `src/stores/plannerStore.js`
  - singleton mutable planner state.
  - computes planner snapshot envelope.
  - delegates mutations/use cases to application modules.
- `src/stores/ledLabStore.js`
  - LED Lab comparison state.
- `src/stores/plannerContext.js`
  - provide/inject bridge for planner store.

### Application Services

- `src/application/planner/*`
  - use cases, placement, preview snapshot, PPFD pipeline orchestration.
- `src/application/boardLibrary/*`
  - storage, migration, validation, import/export.
- `src/application/electrical/*`
  - operating point resolution.
- `src/application/photons/*`
  - photon output estimation.
- `src/application/spectral/*`
  - spectral resolver/cache/display kernel.
- `src/application/ledLab/*`
  - LED Lab snapshots and chart view-models.

### Domain

- `src/domain/LedLibraryV2.js`
  - large datasheet-backed LED data module plus interpolation/output helpers.
- `src/domain/PpfdEstimator.js`
  - optimized fast PPFD preview estimator.
- `src/domain/ppfd/*`
  - engine facade, reference engine, fixture layout.
- `src/domain/spectral/*`
  - action curves, math, series library, calibration, spectral JSON.
- `src/domain/boardGeometry.js`
  - board rotation/geometry helpers.

### Contracts

- `src/contracts/versioned/*`
  - result envelopes, version constants, issues, board documents, collections,
    assertions.

### Tests

- Node tests in `test/*.test.js`.
- Browser smoke in `test/browser/app-smoke.spec.js`.
- Baseline fixture in `test/fixtures/baseline/v1-baseline.json`.
- Board library fixture in `test/fixtures/board-library/v1.1-single-board-library.json`.

## 4. MVP Retrospective

### 4.1 What Is Now Intentional Architecture

These choices appear valuable and should be preserved:

- Layered separation:
  - presentation -> stores -> application -> domain/contracts/catalog
- Contract envelopes for operation/snapshot results.
- Storage adapters and runtime adapters for deterministic tests.
- Lazy spectral chunking.
- Compatibility facades around extracted planner actions.
- Node tests for pure domain/application logic.
- Small browser smoke suite for rendering and accessibility paths.
- Architecture fitness tests to prevent backsliding.

### 4.2 What Looks Like Accidental Complexity

These patterns likely grew from MVP speed and are now worth addressing:

- Large static domain catalog mixed with runtime model helpers in
  `LedLibraryV2.js`.
- Broad JSDoc dependency types that describe objects as `Record<string, any>` or
  `Function`, reducing editor/type value.
- Store singleton creation at module scope, which limits test isolation and
  future multi-instance/SSR-style flexibility.
- Repeated input/select/button markup across Board Preview controls and modals.
- Canvas interaction details mixed with component lifecycle in
  `PpfdHeatmap.vue`.
- Modal components duplicate shell/backdrop structure and lack a shared
  accessibility contract.
- Global CSS imports remote Google fonts at runtime, which creates a network,
  privacy, and offline rendering dependency.

### 4.3 What Was Reasonable During MVP Growth

- Keeping everything in JS avoided type-migration overhead while numerical
  behavior was still changing.
- Keeping LED data inline made datasheet iteration direct and searchable.
- Keeping forms as local markup made workflows visible and easy to alter.
- Using a singleton store avoided adding a state library or router too early.
- Using Node test runner avoided installing heavier frontend test tooling.

### 4.4 Why The Current Moment Is Different

The first hardening round added:

- CI gate
- bundle budget
- browser smoke
- architecture tests
- service decomposition
- contract readiness
- lazy spectral loading

That means the repo is now ready for the next frontier:

- make boundaries statically checkable
- split domain data from domain algorithms
- improve accessibility primitives
- reduce duplicated form/control markup
- increase browser confidence without broad snapshots

## 5. Main Hypothesis

The highest-return next improvement is not another broad feature rewrite.

The main hypothesis is:

> The project is now structurally stable enough that the next gains should come
> from enforcing contracts, isolating data-heavy domain catalogs, and extracting
> UI interaction primitives. This improves maintainability and future feature
> velocity without changing numerical behavior or replacing the stack.

Validation against code:

- Architecture tests pass and import graph has no cycles.
- Biggest files are now domain/data or interaction/control surfaces, not the
  previously extracted Board Preview wrapper.
- Tests cover service behavior well, but no static type-checking catches contract
  drift.
- Browser tests exist but only cover broad smoke paths, not modal accessibility,
  import/export behavior, mobile layout, or keyboard interaction.

## 6. Recommended Option

### Option A: JSDoc-First Type Hardening And Interaction Primitives

Summary:

- Keep Vue/Vite/JS.
- Add enforceable type checking gradually.
- Replace broad JSDoc types with domain/use-case contracts.
- Extract UI primitives and canvas composables.
- Split LED catalog data from algorithms.

Pros:

- Lowest disruption.
- Builds directly on current tests.
- Matches current ADR direction.
- Keeps existing package architecture.
- Avoids framework churn.

Cons:

- Type safety is incremental rather than immediate.
- Some JS/JSDoc friction remains.
- Still needs careful sequencing to avoid noisy type-check failures.

Recommendation:

- Choose this option.

### Option B: Immediate TypeScript Conversion

Summary:

- Convert domain/application modules to `.ts` and Vue SFCs to
  `<script setup lang="ts">` quickly.

Pros:

- Strongest long-term static guarantees.
- Cleaner than indefinite JSDoc for complex contracts.

Cons:

- Too much mechanical churn at once.
- Risky around numerical baseline and import/export contracts.
- Many current `Record<string, any>` seams would become blockers rather than
  improvements.

Recommendation:

- Do not choose as the immediate plan.
- Keep as a later branch after JSDoc/checkJs hardening.

### Option C: UI Component Library Or Pinia/Router Introduction

Summary:

- Add a UI kit, Pinia, or Vue Router to formalize app structure.

Pros:

- Could help if navigation/deep links or shared store patterns become bigger.

Cons:

- Current app does not require route URLs or external UI kit conventions.
- Adds dependencies and migration work without solving the current highest-risk
  areas.

Recommendation:

- Do not choose now.
- Revisit router only if deep links, browser history, or shareable planner URLs
  become product requirements.

## 7. Target Architecture For Round 2

### Target Shape

```text
src/
  application/
    planner/
      useCases/
        contracts.js
        ...
      heatmap/
        heatmapInteraction.js
        heatmapViewport.js
    ledCatalog/
      ledCatalogData.js
      ledCatalogSchema.js
      ledOutputModel.js
  catalog/
    ledCatalog.js
  components/
    controls/
      NumericField.vue
      SegmentedControl.vue
      FieldGroup.vue
    modals/
      PlannerModalFrame.vue
    heatmap/
      useResizableCanvas.js
      useHeatmapBoardDrag.js
  contracts/
    versioned/
  domain/
    led/
      ledCurves.js
      ledDefinitions.js
      ledOutputModel.js
    ppfd/
    spectral/
```

This is a target, not a required exact folder tree. The key goal is to separate:

- data definitions from computational behavior
- UI shell primitives from workflow-specific modals
- canvas rendering from pointer/resize/lifecycle orchestration
- use-case dependency contracts from concrete implementations

### Boundary Rules

Preserve existing rules:

1. Components do not import domain modules directly.
2. Application does not import stores/components.
3. Domain does not import application/stores/components.
4. Contracts do not import presentation layers.
5. Stores do not import components.
6. Runtime primitives go through adapters where deterministic tests matter.

Add new proposed rules:

7. Components should not own non-trivial placement validation policy.
8. Shared modal shell behavior must be centralized.
9. Static catalog data should not live in the same module as calculation
   algorithms once it becomes the dominant file size.
10. Public use-case factory dependencies should use named JSDoc typedefs.
11. New public modules should be either statically type-checked or deliberately
    excluded with a documented reason.
12. Browser tests should assert stable user-visible contracts, not broad DOM
    snapshots.

## 8. Improvement Backlog

### P0: Keep The Baseline Reproducible

Reasons:

- Only `AGENTS.md` is untracked.
- New plan work should start from a clean, explicit baseline.

Candidate improvements:

1. Decide whether to track `AGENTS.md`.
2. Add a short "Round 2 baseline" note to docs after implementation starts.
3. Keep `npm run check` green after every phase.
4. Keep `npm run test:browser` green after UI phases.

### P1: Static Boundary Enforcement

Reasons:

- No type-check command exists.
- JSDoc contracts are useful but unenforced.
- Broad `Record<string, any>` and `Function` remain in critical use-case seams.

Candidate improvements:

1. Add TypeScript tooling only for checking, not conversion.
2. Add a `type:check` or `check:types` script.
3. Start with `checkJs` on a small allowlist of pure modules.
4. Replace broad JSDoc in planner use-case dependencies.
5. Add architecture tests that reject new `Function` and `Record<string, any>`
   in selected application files once replacement is complete.

### P1: Modal Accessibility Primitive

Reasons:

- `BoardConfigModal.vue`, `EmitterConfigModal.vue`, and
  `BulkEmitterConfigModal.vue` duplicate modal shell CSS/markup.
- They do not share a documented dialog accessibility contract.
- Browser tests do not currently exercise modal keyboard behavior.

Candidate improvements:

1. Extract `PlannerModalFrame.vue`.
2. Add `role="dialog"`, `aria-modal="true"`, labelled heading association, and
   Escape close support.
3. Add initial focus and focus return.
4. Add browser smoke for opening/closing one modal by keyboard.

### P1: Heatmap Interaction Separation

Reasons:

- `PpfdHeatmap.vue` still owns resize, canvas sizing, pointer hit detection,
  drag preview state, validation, and rendering orchestration.
- Rendering helper extraction was successful, but interaction logic remains
  coupled to Vue lifecycle.

Candidate improvements:

1. Extract geometry hit-test helpers to a pure application/component module.
2. Extract `useResizableCanvas`.
3. Extract `useHeatmapBoardDrag`.
4. Use a render scheduler to coalesce repeated resize/watch/pointer updates.
5. Add tests for drag validity and coordinate conversion.

### P2: LED Catalog Data Boundary

Reasons:

- `LedLibraryV2.js` is 1466 lines and mixes data, helper factories,
  interpolation, derating, reference selection, and output estimation.
- Catalog data is important and source-backed, but its size makes code review
  noisy.

Candidate improvements:

1. Split immutable data from algorithms.
2. Keep public exports compatible first.
3. Add schema/invariant tests for every LED definition.
4. Add fixture/source-document consistency tests.
5. Move algorithm helpers to `ledOutputModel` or similar domain module.

### P2: Form Control De-Duplication

Reasons:

- Board Preview controls and modals repeat numeric field markup.
- Segmented mode buttons exist in several components.
- Repetition increases accessibility drift risk.

Candidate improvements:

1. Add small local control primitives:
   - `NumericField.vue`
   - `SelectField.vue` if useful
   - `SegmentedControl.vue`
2. Extract by workflow section, not as a full design system.
3. Keep existing labels and emitted store calls stable.
4. Add browser label/name assertions for extracted controls.

### P2: Store Factory And Test Isolation

Reasons:

- `plannerStore.js` has module-level singleton state and `initialized`.
- This is fine for the app but makes future isolation, SSR-like testing, and
  independent store instances harder.

Candidate improvements:

1. Introduce `createPlannerStore()`.
2. Keep `usePlannerStore()` as compatibility facade returning the singleton.
3. Update tests to use fresh store factory where isolation matters.
4. Keep `providePlannerStore()` unchanged for app code initially.

### P3: Browser Test Maturity

Reasons:

- Current Playwright tests are valuable but intentionally small.
- CI browser smoke is advisory.
- Missing coverage:
  - modal keyboard behavior
  - mobile viewport layout
  - import/export conflict UI
  - board drag on heatmap
  - lazy chunk request regression

Candidate improvements:

1. Add a mobile viewport project or targeted spec.
2. Add modal keyboard spec.
3. Add import/export UI spec with in-memory/localStorage setup.
4. Add lazy chunk network assertion only if stable.
5. Make browser CI blocking only after several green runs.

### P3: Theme And Runtime Asset Hygiene

Reasons:

- `src/styles/main.css` imports Google Fonts at runtime.
- The app is otherwise local/static and does not need a third-party runtime
  font dependency.
- Global styling uses many component-local color literals and large radii.

Candidate improvements:

1. Replace remote font import with system font stack or self-hosted fonts.
2. Expand theme tokens for common semantic colors.
3. Reduce repeated color literals in components.
4. Avoid a broad visual redesign unless requested.

## 9. Detailed Phased Plan

### Phase 0: Baseline Lock And Planning Hygiene

Objective:

- Start implementation from a known-good baseline and avoid accidental
  worktree ambiguity.

Entry criteria:

- User says to implement the Round 2 plan.
- Current `npm run check` and `npm run test:browser` results are known.

Tasks:

1. Inspect `git status --short`.
2. Decide whether `AGENTS.md` should be tracked:
   - if yes, include it in the change set
   - if no, add it to an ignored/local-only strategy only with explicit user
     approval
3. Run `npm run check`.
4. Run `npm run test:browser`.
5. Record baseline chunk sizes from Vite build output.
6. Record current largest source files.
7. Create an implementation checklist from this plan.
8. Do not change application behavior in this phase.

Verification gate:

- `npm run check` passes.
- `npm run test:browser` passes.
- Worktree status is understood.

Rollback:

- No application code change.

Risks:

- Browser smoke may fail because local Chrome/Playwright environment changes.

Mitigation:

- Treat environment failures separately from app failures.
- Do not alter app code to hide environment issues.

Acceptance criteria:

- A clean, current baseline is written in the implementation notes or final
  implementation summary.

### Phase 1: Type-Check Probe Without Broad Migration

Objective:

- Add static checking in a way that reveals useful problems without forcing a
  full TypeScript rewrite.

Entry criteria:

- Phase 0 complete.
- User approves adding a dev dependency if required.

Tasks:

1. Add `typescript` and `vue-tsc` as dev dependencies if not already present.
2. Convert `jsconfig.json` into a TypeScript-aware config or add
   `tsconfig.json` while preserving `@/*` aliases.
3. Start with conservative settings:
   - `allowJs: true`
   - `checkJs: false` globally
   - `noEmit: true`
   - strictness documented but not all enabled at once
4. Add a script:
   - `check:types`
5. Run `npm run check:types`.
6. If the checker cannot parse current Vue/JS setup, fix config only.
7. Do not add `check:types` to `npm run check` yet.
8. Pick a small allowlist of pure files for `// @ts-check`:
   - `src/utils/runtime.js`
   - `src/utils/strings.js`
   - `src/contracts/versioned/results.js`
   - `src/contracts/versioned/issues.js`
9. Fix only real type errors in the allowlist.
10. Add README note explaining that type checking is advisory/expanding.

Verification gate:

- `npm run check:types` passes for the initial allowlist/config.
- `npm run check` still passes.

Rollback:

- Remove new dependency, script, and config.
- No application behavior should depend on type-checking setup.

Risks:

- Tooling churn can distract from app improvements.
- Vue SFC JavaScript checking can be noisy.

Mitigation:

- Do not enable global `checkJs` immediately.
- Use explicit allowlist/comments first.

Acceptance criteria:

- The repo has a repeatable type-check command.
- Type checking is not yet a blocking gate unless it is stable and fast.

### Phase 2: Replace Broad Planner Use-Case Dependency Types

Objective:

- Make planner use-case factories understandable and statically checkable.

Entry criteria:

- Phase 1 type-check probe exists.
- Existing planner use-case tests pass.

Tasks:

1. Add `src/application/planner/useCases/contracts.js`.
2. Define JSDoc typedefs for:
   - `PlannerMutableState`
   - `PlannerFormState`
   - `BoardInstanceActionDependencies`
   - `BoardLibraryActionDependencies`
   - `EmitterSelectionActionDependencies`
   - `EmitterConfigActionDependencies`
   - `BulkEmitterConfigActionDependencies`
   - `DefaultEmitterDriveActionDependencies`
   - `PlannerUseCaseDependencies`
3. Replace `Record<string, any>` in
   `src/application/planner/plannerUseCases.js`.
4. Replace `Function` and `Record<string, any>` in
   `src/application/planner/useCases/instanceActions.js`.
5. Replace `Function` in
   `src/application/planner/useCases/libraryActions.js`.
6. Replace broad emitter action JSDoc in:
   - `src/application/planner/useCases/emitterActions.js`
   - `src/application/planner/useCases/emitterSelectionActions.js`
   - `src/application/planner/useCases/emitterConfigActions.js`
   - `src/application/planner/useCases/bulkEmitterConfigActions.js`
   - `src/application/planner/useCases/defaultEmitterDriveActions.js`
   - `src/application/planner/useCases/emitterDragActions.js`
7. Add `// @ts-check` to one or two use-case files only after their typedefs are
   stable.
8. Run focused tests:
   - `npm test -- test/planner.use-cases.test.js`
   - `npm test -- test/emitter.selection.actions.test.js`
   - `npm test -- test/emitter.config.actions.test.js`
   - `npm test -- test/bulk.emitter.config.actions.test.js`
   - `npm test -- test/emitter.drag.actions.test.js`
   - `npm test -- test/default.emitter.drive.actions.test.js`
9. Add or update architecture fitness test:
   - no new `Function` JSDoc in `src/application/planner/useCases`
   - no new `Record<string, any>` in selected use-case factory docs
10. Run full `npm run check`.

Verification gate:

- Focused use-case tests pass.
- `npm run check` passes.
- `npm run check:types` passes for enabled files.

Rollback:

- Revert JSDoc contract changes file by file.
- Runtime code should remain mostly unchanged.

Risks:

- Overly exact typedefs can become busywork.

Mitigation:

- Type public dependencies and data shapes, not every local object.
- Keep factory compatibility unchanged.

Acceptance criteria:

- Critical planner use-case dependencies are named and discoverable.
- Future refactors have editor/type support at the factory boundary.

### Phase 3: Store Factory Seam

Objective:

- Preserve the current singleton app behavior while enabling isolated store
  instances for tests and future app composition.

Entry criteria:

- Phase 2 reduces planner dependency ambiguity.
- Store tests/workflow tests are green.

Tasks:

1. Add `createPlannerStore()` inside or next to `plannerStore.js`.
2. Move state creation into a factory function:
   - `createPlannerState()`
   - `createFormState(source)`
3. Move initialization into per-store closure state:
   - no shared `initialized` across factory instances
4. Keep `usePlannerStore()` as the existing singleton facade:
   - app behavior unchanged
   - no immediate component changes required
5. Update `providePlannerStore(store)` call only if needed.
6. Add tests for factory isolation:
   - two stores can select different boards
   - one store's board instances do not leak to another
   - migration warnings are per-instance
7. Update existing tests that currently rely on singleton state only when
   necessary.
8. Run:
   - `npm test -- test/e2e.workflows.test.js`
   - `npm test -- test/planner.use-cases.test.js`
   - `npm run check`

Verification gate:

- App singleton behavior unchanged.
- New isolated store tests pass.
- Existing workflows pass.

Rollback:

- Keep `usePlannerStore()` singleton path and revert factory exports.

Risks:

- Watcher initialization can accidentally run twice.
- Reactive state replacement can break injected references.

Mitigation:

- Use factory tests before app wiring changes.
- Keep returned store public API identical.

Acceptance criteria:

- Test code can create fresh planner stores without module reload tricks.

### Phase 4: Modal Accessibility And Shared Shell

Objective:

- Centralize modal structure and make dialog behavior accessible and testable.

Entry criteria:

- Browser smoke baseline is green.
- Modal state/use-case tests are green.

Tasks:

1. Create `src/components/modals/PlannerModalFrame.vue`.
2. Props:
   - `open`
   - `title`
   - `labelId` or generated id
   - optional `size`
3. Emits:
   - `close`
4. Behavior:
   - `role="dialog"`
   - `aria-modal="true"`
   - `aria-labelledby`
   - Escape key closes
   - backdrop click policy explicitly decided
   - first actionable control receives focus
   - focus returns to trigger when possible
5. Move shared modal styles from:
   - `BoardConfigModal.vue`
   - `EmitterConfigModal.vue`
   - `BulkEmitterConfigModal.vue`
6. Refactor `BoardConfigModal.vue` to use the frame.
7. Refactor `EmitterConfigModal.vue` to use the frame.
8. Refactor `BulkEmitterConfigModal.vue` to use the frame.
9. Add `aria-pressed` to modal drive mode buttons.
10. Add Playwright tests:
    - open board config modal from Lamp Planner placed board
    - modal has dialog role/name
    - Escape closes
    - Cancel closes
    - focus does not disappear after close
11. Add Node tests only if composable/modal helpers contain pure logic.
12. Run:
    - `npm run test:browser`
    - `npm run check`

Verification gate:

- Browser modal accessibility test passes.
- Existing workflow tests pass.
- No visual regression in basic modal paths.

Rollback:

- Revert one modal at a time back to local shell markup.

Risks:

- Focus handling can be flaky if implemented too aggressively.

Mitigation:

- Start with simple initial focus and Escape behavior.
- Add focus trap only if needed.

Acceptance criteria:

- All planner modals share one accessibility shell.
- Browser tests prove one representative keyboard path.

### Phase 5: Heatmap Interaction Decomposition

Objective:

- Split canvas resize/render lifecycle from board-drag interaction and pure
  placement validity.

Entry criteria:

- Existing heatmap renderer tests pass.
- Browser heatmap smoke is green.

Tasks:

1. Add pure helper module:
   - `src/components/heatmap/heatmapInteraction.js` or
     `src/application/planner/heatmapInteraction.js`
2. Move from `PpfdHeatmap.vue` into pure functions:
   - `canvasPointFromPointerEvent`
   - `findBoardRectAtPoint`
   - `resolveDraggedBoardCenterCm`
   - `isBoardMovePreviewValid`
3. Add tests for these helpers:
   - point scaling with device pixel ratio
   - topmost board hit wins
   - out-of-room invalid
   - overlapping board invalid
   - valid move emits expected center coordinates
4. Add `src/components/heatmap/useResizableCanvas.js`.
5. Responsibilities:
   - observe container
   - compute CSS size
   - set backing canvas size with DPR
   - cleanup observer
6. Add `src/components/heatmap/useScheduledCanvasRender.js`.
7. Responsibilities:
   - schedule render with `requestAnimationFrame`
   - avoid duplicate renders in same frame
   - expose immediate render for tests if needed
8. Refactor `PpfdHeatmap.vue`:
   - keep props/emits/template stable
   - delegate resize
   - delegate drag calculations
   - delegate render scheduling
9. Replace deep watcher with narrower watched values if possible:
   - `summary.values`
   - `summary.gridWidth`
   - `summary.gridDepth`
   - dimensions
   - board instance identity/position fields
10. Run:
    - `npm test -- test/ppfd.heatmap.canvas.test.js`
    - new heatmap interaction test
    - `npm run test:browser`
    - `npm run check`

Verification gate:

- Heatmap canvas remains nonblank in browser.
- Board drag behavior remains unchanged.
- New pure tests cover drag validity.

Rollback:

- Keep renderer helper and revert interaction composables if lifecycle issues
  appear.

Risks:

- Canvas sizing can be sensitive to timing and DPR.
- Pointer event behavior may differ across browsers.

Mitigation:

- Preserve current DOM and emitted payloads first.
- Avoid changing visual rendering while extracting.

Acceptance criteria:

- `PpfdHeatmap.vue` becomes a thin orchestrator.
- Drag and resize behavior are testable without mounting Vue.

### Phase 6: LED Catalog Data/Algorithm Split

Objective:

- Reduce `LedLibraryV2.js` review burden and separate datasheet data from
  calculation behavior.

Entry criteria:

- Baseline LED/spectral tests are green.
- Bundle budget is known.

Tasks:

1. Add characterization tests for current catalog invariants:
   - all LED ids are unique
   - every LED has a name/family/curveSetId/reference/sourceDocuments
   - every `curveSetId` exists in `LED_CURVES`
   - every luminous flux bin code resolves
   - every spectral series id resolves or has an explicit exception
   - every source document listed exists under `pdf/` unless marked external
2. Extract curve constants to `src/domain/led/ledCurves.js`.
3. Extract chromaticity constants to `src/domain/led/ledChromaticity.js`.
4. Extract LED definitions to `src/domain/led/ledDefinitions.js`.
5. Move output algorithms to `src/domain/led/ledOutputModel.js`:
   - `interpolateCurve`
   - `interpolateInverseCurve`
   - `getDeratedMaxCurrentMA`
   - `getPreferredReference`
   - `estimateLedOutput`
6. Keep `src/domain/LedLibraryV2.js` as compatibility facade:
   - re-export old names
   - no callers need to change yet
7. Update direct imports only when safe:
   - `src/domain/ledV2Model.js`
   - `src/catalog/ledCatalog.js`
   - tests
8. Add architecture test or docs:
   - data modules should not import algorithms
   - algorithm modules may import data through explicit parameters or facade
9. Run:
   - `npm test -- test/ppf.estimation.test.js`
   - `npm test -- test/resolve.led.context.test.js`
   - `npm test -- test/led.comparison.snapshot.test.js`
   - `npm run check`
10. Compare build chunk sizes before/after.

Verification gate:

- Numerical baseline unchanged.
- LED Lab snapshot unchanged.
- Build/budget unchanged or improved.

Rollback:

- Compatibility facade allows reverting internal split without caller changes.

Risks:

- Moving large data can create import mistakes or circular dependencies.

Mitigation:

- Add invariants before extraction.
- Move constants first, algorithms second.

Acceptance criteria:

- LED data and LED algorithms are separately reviewable.
- Existing public imports continue working.

### Phase 7: Form Control And Segmented Control Extraction

Objective:

- Reduce repeated form-control markup while preserving workflow-specific
  behavior and labels.

Entry criteria:

- Modal frame is stable.
- Browser label/name checks are green.

Tasks:

1. Create `src/components/controls/NumericField.vue`.
2. Props:
   - `label`
   - `modelValue` or `value`
   - `min`
   - `max`
   - `step`
   - `className`/`inputClass` only if necessary
3. Emits:
   - `update:modelValue` or `input-value`
4. Keep numeric parsing policy outside the component initially:
   - component emits raw string or parsed number explicitly by contract
   - choose one and document it
5. Create `src/components/controls/SegmentedControl.vue`.
6. Props:
   - `label`
   - `options`
   - `modelValue`
7. Behavior:
   - `role="group"`
   - stable button names
   - `aria-pressed`
8. Refactor low-risk repeated sections first:
   - LED Lab SPD mode
   - Board Preview SPD mode
9. Then refactor drive mode controls:
   - Board Preview default drive mode
   - Board config modal
   - Emitter config modal
   - Bulk emitter config modal
10. Refactor numeric fields in one component at a time:
    - `BoardPreviewControls.vue`
    - `BoardConfigModal.vue`
    - `EmitterConfigModal.vue`
    - `BulkEmitterConfigModal.vue`
11. Add tests:
    - browser label/name smoke remains passing
    - Node tests only for parsing helper if introduced
12. Run after each component:
    - `npm run format:check`
    - targeted browser spec if changed
    - `npm run check`

Verification gate:

- Labels and accessible names unchanged.
- Store action calls unchanged.
- Browser smoke passes.

Rollback:

- Revert component-by-component.

Risks:

- Generic form components can become a mini-framework.

Mitigation:

- Only extract patterns used at least three times.
- Keep components boring and prop-light.

Acceptance criteria:

- Repeated drive/number controls are centralized enough to prevent
  accessibility drift.

### Phase 8: Browser Coverage Expansion And CI Decision

Objective:

- Expand browser confidence around the areas Node tests cannot see, then decide
  whether browser CI should become blocking.

Entry criteria:

- Modal and form primitives are stable.
- Existing 6 browser tests pass consistently.

Tasks:

1. Add Playwright helper utilities:
   - `openBoardPlanner(page)`
   - `openLedLab(page)`
   - `regenerateBoardGrid(page)`
   - `expectNoConsoleErrors(page)` if stable
2. Split `test/browser/app-smoke.spec.js` into focused specs if it grows:
   - `app-navigation.spec.js`
   - `board-preview.spec.js`
   - `modals.spec.js`
   - `persistence.spec.js`
3. Add modal keyboard spec from Phase 4.
4. Add mobile viewport test:
   - 390 x 844 or equivalent
   - top switch visible
   - core controls do not overlap
   - heatmap visible
5. Add import/export UI test:
   - seed localStorage with one custom board
   - export button creates payload path if testable
   - import malformed JSON shows error
   - merge skip duplicates reports expected message
6. Add lazy chunk test only if not flaky:
   - initial load does not request spectral JSON chunk
   - opening LED Lab or Board Preview requests spectral chunk
7. Run browser tests repeatedly locally:
   - at least 3 consecutive passes
8. Update CI:
   - if stable, remove `continue-on-error: true`
   - if still environment-sensitive, keep advisory and document reason
9. Update README with browser stability policy.

Verification gate:

- Browser suite passes locally.
- CI decision documented.
- No broad screenshots or DOM snapshots introduced.

Rollback:

- Remove flaky spec, not the whole suite.
- Keep browser job advisory if required.

Risks:

- Browser tests can become slow/flaky.

Mitigation:

- Keep specs workflow-level and deterministic.
- Prefer role/name assertions and targeted canvas pixel checks.

Acceptance criteria:

- Browser tests cover modal, mobile, persistence, and canvas/SVG workflows at a
  small but meaningful level.

### Phase 9: Runtime Asset And Theme Hygiene

Objective:

- Remove runtime font network dependency and centralize visual tokens without a
  broad redesign.

Entry criteria:

- Browser smoke and build gates are green.

Tasks:

1. Replace Google Fonts `@import` in `src/styles/main.css` with system font
   stacks, or self-host only with explicit approval.
2. Add theme tokens for common semantic colors:
   - warning text
   - info text
   - panel border
   - selected state
   - danger/override emitter state
3. Replace repeated component-local color literals where low risk.
4. Do not change layout or product visual identity in this phase.
5. Add browser smoke at desktop and mobile after visual token changes.
6. Run `npm run build` and inspect CSS asset size.

Verification gate:

- No remote font request in production CSS.
- Browser smoke passes.
- CSS asset size does not grow meaningfully.

Rollback:

- Revert theme token substitutions.

Risks:

- Font changes alter visual spacing.

Mitigation:

- Use close system fallback stack.
- Browser smoke checks text does not disappear/overlap in core flows.

Acceptance criteria:

- App no longer depends on Google Fonts at runtime.
- Theme tokens cover common repeated component colors.

### Phase 10: Optional TypeScript Pilot

Objective:

- Decide whether TypeScript conversion is now worth doing and pilot it in pure
  modules only.

Entry criteria:

- Phases 1 and 2 have reduced JSDoc ambiguity.
- `check:types` is stable.
- User explicitly approves TypeScript conversion.

Tasks:

1. Choose pure low-risk modules:
   - `src/utils/runtime.js`
   - `src/utils/strings.js`
   - `src/contracts/versioned/issues.js`
   - `src/contracts/versioned/results.js`
2. Convert one file to `.ts`.
3. Update imports only where required.
4. Run:
   - `npm run check:types`
   - `npm test`
   - `npm run build`
5. Convert no Vue SFCs in the pilot.
6. Document conversion rules:
   - use `unknown` at boundaries
   - avoid `any`
   - use `import type`
   - preserve runtime behavior
7. Decide after pilot:
   - continue pure-module conversion
   - pause at JSDoc/checkJs
   - create separate TypeScript roadmap

Verification gate:

- No runtime behavior changes.
- Type check, Node tests, and build pass.

Rollback:

- Rename files back to `.js` and restore JSDoc.

Risks:

- Import extension/resolution churn.

Mitigation:

- Convert one module at a time.
- Avoid SFC conversion until pure modules prove smooth.

Acceptance criteria:

- A real pilot proves or disproves the value of TypeScript for this repo.

## 10. Module-By-Module Migration Order

Recommended order:

1. `AGENTS.md` tracking decision.
2. type-check config/scripts.
3. `src/application/planner/useCases/contracts.js`.
4. `src/application/planner/useCases/instanceActions.js`.
5. `src/application/planner/useCases/libraryActions.js`.
6. emitter use-case JSDoc files.
7. `src/application/planner/plannerUseCases.js`.
8. `src/stores/plannerStore.js` factory seam.
9. modal frame component.
10. board config modal.
11. emitter config modal.
12. bulk emitter config modal.
13. heatmap interaction helpers.
14. heatmap composables.
15. `PpfdHeatmap.vue` refactor.
16. LED catalog invariant tests.
17. LED data module split.
18. LED algorithm module split.
19. form-control primitives.
20. Board Preview controls refactor.
21. modal control refactor.
22. browser test expansion.
23. theme/runtime asset cleanup.
24. optional TypeScript pilot.

## 11. Test Strategy

### Keep

- Node test runner for domain/application behavior.
- Baseline snapshot tests for numerical drift.
- Architecture fitness tests.
- Contract assertion tests.
- Browser smoke suite.
- Bundle budget.

### Add

- Type-check command.
- JSDoc boundary regression tests for planner use-case docs.
- Store factory isolation tests.
- Modal accessibility browser tests.
- Heatmap drag/coordinate pure tests.
- LED catalog invariant tests.
- Mobile browser smoke.
- Persistence browser smoke.

### Avoid

- Full DOM snapshots.
- Pixel-perfect screenshots.
- Global `checkJs` before contracts are ready.
- Full TypeScript conversion without pilot.
- UI-kit dependency unless the app grows beyond local primitives.

## 12. Risk Register

| Risk                                       | Severity | Area           | Mitigation                                                      |
| ------------------------------------------ | -------- | -------------- | --------------------------------------------------------------- |
| Type-check setup becomes noisy             | Medium   | Tooling        | Start advisory, allowlist files, avoid global checkJs initially |
| Modal refactor regresses workflow          | Medium   | UI             | Refactor one modal at a time, browser test representative paths |
| Heatmap refactor changes drag behavior     | High     | UI/canvas      | Extract pure tests first, preserve payloads and DOM             |
| LED catalog split changes imports          | Medium   | Domain/catalog | Add invariant tests first, keep compatibility facade            |
| Browser tests become flaky                 | Medium   | CI             | Keep tests small, deterministic, and role-based                 |
| Theme cleanup changes visual spacing       | Low      | CSS            | Avoid layout changes, run browser smoke                         |
| Store factory breaks singleton assumptions | Medium   | State          | Keep `usePlannerStore` facade unchanged                         |
| Optional TS pilot creates churn            | Medium   | Tooling        | Convert only pure modules after approval                        |

## 13. Success Metrics

Technical:

- `npm run check` remains green after every phase.
- `npm run test:browser` remains green after UI phases.
- No production bundle budget regression.
- No numerical baseline drift unless explicitly approved.
- No new architecture fitness violations.
- Import graph remains cycle-free.
- Broad `Function` dependency JSDoc removed from planner use-case files.
- `Record<string, any>` removed from selected public application boundaries.
- Modal components share one accessible shell.
- `PpfdHeatmap.vue` line count and responsibility count decrease.
- `LedLibraryV2.js` becomes compatibility facade or materially smaller.

Product:

- Existing planner, board preview, LED Lab, and persistence workflows behave the
  same.
- Keyboard users can open and close at least one representative modal reliably.
- Browser smoke covers the most important visual workflows.

Maintainability:

- New contributors can find domain data, algorithms, UI primitives, and
  contracts without reading monolithic files.
- Future type migration has a low-risk path.

## 14. Implementation Tickets

### Ticket R2-001: Round 2 Baseline

Scope:

- Inspect status.
- Decide `AGENTS.md` tracking.
- Run `npm run check`.
- Run `npm run test:browser`.

Acceptance:

- Baseline documented in final implementation summary.

### Ticket R2-002: Advisory Type-Check Setup

Scope:

- Add TypeScript/vue-tsc tooling.
- Add `check:types`.
- Configure aliases.
- Enable first tiny allowlist.

Acceptance:

- `npm run check:types` passes.
- `npm run check` passes.

### Ticket R2-003: Planner Use-Case Contract Typedefs

Scope:

- Add named JSDoc dependency contracts.
- Replace broad `Function` in instance/library actions.

Acceptance:

- Focused action tests pass.
- No runtime behavior change.

### Ticket R2-004: Emitter Action Contract Typedefs

Scope:

- Replace broad emitter action dependency docs.
- Enable `// @ts-check` for one stable action module if feasible.

Acceptance:

- Emitter action tests pass.

### Ticket R2-005: JSDoc Regression Fitness Test

Scope:

- Add architecture test preventing reintroduction of broad public dependency
  docs in selected folders.

Acceptance:

- Architecture tests pass.

### Ticket R2-006: Planner Store Factory Seam

Scope:

- Add `createPlannerStore`.
- Preserve `usePlannerStore`.
- Add isolation tests.

Acceptance:

- Two store instances do not share mutable state.

### Ticket R2-007: Planner Modal Frame

Scope:

- Extract shared modal shell.
- Add dialog semantics and Escape close.

Acceptance:

- One modal browser test proves dialog behavior.

### Ticket R2-008: Refactor Modals Onto Frame

Scope:

- Board config modal.
- Emitter config modal.
- Bulk emitter config modal.

Acceptance:

- Existing modal workflows pass.

### Ticket R2-009: Heatmap Interaction Helpers

Scope:

- Pure coordinate/hit-test/validity helpers.
- Tests for drag validity.

Acceptance:

- New helper tests pass.

### Ticket R2-010: Heatmap Composables

Scope:

- Resize composable.
- Render scheduler.
- Refactor `PpfdHeatmap.vue`.

Acceptance:

- Heatmap browser smoke passes.

### Ticket R2-011: LED Catalog Invariant Tests

Scope:

- Validate LED definition shape/source references.

Acceptance:

- Tests catch missing curve/source/bin relationships.

### Ticket R2-012: LED Catalog Data Split

Scope:

- Move data constants out of algorithm module.
- Keep compatibility facade.

Acceptance:

- Baselines unchanged.

### Ticket R2-013: Control Primitive Pilot

Scope:

- Add `SegmentedControl.vue`.
- Refactor LED Lab and Board Preview SPD mode controls.

Acceptance:

- Accessible names unchanged.

### Ticket R2-014: Numeric Field Primitive Pilot

Scope:

- Add `NumericField.vue`.
- Refactor one low-risk component section.

Acceptance:

- Store actions receive same value semantics.

### Ticket R2-015: Browser Coverage Expansion

Scope:

- Add modal, mobile, persistence browser specs.
- Decide CI advisory/blocking status.

Acceptance:

- Browser suite passes.
- CI policy updated.

### Ticket R2-016: Runtime Font And Theme Cleanup

Scope:

- Remove remote font import or self-host with approval.
- Add semantic theme tokens.

Acceptance:

- No runtime Google Fonts request.
- Browser smoke passes.

### Ticket R2-017: Optional TypeScript Pilot

Scope:

- Convert one pure module after explicit approval.

Acceptance:

- Type check, tests, and build pass.

## 15. Explicit Non-Goals For This Round

- Do not rewrite the entire app.
- Do not replace Vue.
- Do not add Pinia unless a separate state-library decision is made.
- Do not add Vue Router unless deep links/history become a product requirement.
- Do not change PPFD calibration or spectral math behavior without a separate
  numerical decision.
- Do not change persistence schema write version beyond the existing supported
  path unless a schema migration is explicitly planned.
- Do not make broad visual redesigns as part of architecture cleanup.
- Do not convert Vue SFCs to TypeScript in this round unless the optional pilot
  has succeeded and the user explicitly approves expansion.

## 16. Final Recommendation

Implement this plan in this order:

1. Baseline and worktree hygiene.
2. Advisory type-check setup.
3. Planner use-case JSDoc contracts.
4. Store factory seam.
5. Modal accessibility shell.
6. Heatmap interaction decomposition.
7. LED catalog data/algorithm split.
8. Small form/control primitives.
9. Browser coverage expansion and CI decision.
10. Runtime font/theme hygiene.
11. Optional TypeScript pilot only after explicit approval.

This sequence maximizes maintainability gains while protecting the current
green baseline and avoiding a risky big-bang migration.

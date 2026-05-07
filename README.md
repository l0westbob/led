# LED PPFD Planner

Vue 3 + Vite app for configuring LED boards, estimating calibrated photon output, and previewing PPFD maps.

## Architecture (Phase 1 "real version")

The app now follows a layered structure:

- `src/catalog/`: static data access + canonical resolvers
  - LED definitions (`LedLibraryV2`)
  - board preset normalization
  - spectral dataset resolution (`all_series.json`)
- `src/application/`: use-cases/orchestration
  - electrical operating point resolution
  - photon output estimation
  - planner snapshot building
  - planner placement/config/library state helpers
  - LED Lab snapshot building
  - shared LED comparison math utilities + shared spectrum chart view-model
  - board preview emitter drag helpers
  - board-level CCT estimation interfaces
  - board-library CRUD service + board-definition validation
- `src/domain/`: low-level domain primitives
  - `BoardProfile` geometry/model normalization
  - `PpfdEstimator` compute engine
  - shared board geometry/orientation helpers (`src/domain/boardGeometry.js`)
  - LED curve model and spectral math primitives (`src/domain/spectral/math.js`)
- `src/stores/` + `src/components/` + `src/pages/`: presentation layer
  - store coordinates form state and calls application services
  - components render returned snapshots

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

## Important entry points

- [src/stores/plannerStore.js](/Users/benochocki/Herd/led/src/stores/plannerStore.js)
- [src/application/boardLibrary/boardLibraryService.js](/Users/benochocki/Herd/led/src/application/boardLibrary/boardLibraryService.js)
- [src/application/planner/buildPlannerSnapshot.js](/Users/benochocki/Herd/led/src/application/planner/buildPlannerSnapshot.js)
- [src/application/planner/placementState.js](/Users/benochocki/Herd/led/src/application/planner/placementState.js)
- [src/application/planner/boardConfigState.js](/Users/benochocki/Herd/led/src/application/planner/boardConfigState.js)
- [src/application/planner/boardLibraryState.js](/Users/benochocki/Herd/led/src/application/planner/boardLibraryState.js)
- [src/application/electrical/resolveElectricalOperatingPoint.js](/Users/benochocki/Herd/led/src/application/electrical/resolveElectricalOperatingPoint.js)
- [src/application/photons/estimatePhotonOutput.js](/Users/benochocki/Herd/led/src/application/photons/estimatePhotonOutput.js)
- [src/application/ledLab/buildLedLabSnapshot.js](/Users/benochocki/Herd/led/src/application/ledLab/buildLedLabSnapshot.js)
- [src/application/ledLab/spectralComparisonMath.js](/Users/benochocki/Herd/led/src/application/ledLab/spectralComparisonMath.js)
- [src/application/ledLab/buildSpectrumChartViewModel.js](/Users/benochocki/Herd/led/src/application/ledLab/buildSpectrumChartViewModel.js)
- [src/application/planner/buildBoardPlannerPreviewSnapshot.js](/Users/benochocki/Herd/led/src/application/planner/buildBoardPlannerPreviewSnapshot.js)
- [src/application/planner/boardPlannerEmitterState.js](/Users/benochocki/Herd/led/src/application/planner/boardPlannerEmitterState.js)
- [src/application/planner/emitterPlacement.js](/Users/benochocki/Herd/led/src/application/planner/emitterPlacement.js)
- [src/application/planner/estimateBoardCct.js](/Users/benochocki/Herd/led/src/application/planner/estimateBoardCct.js)
- [src/domain/PpfdEstimator.js](/Users/benochocki/Herd/led/src/domain/PpfdEstimator.js)
- [src/domain/spectral/radiantCalibration.js](/Users/benochocki/Herd/led/src/domain/spectral/radiantCalibration.js)
- [src/components/useEmitterDrag.js](/Users/benochocki/Herd/led/src/components/useEmitterDrag.js)

## Development

```bash
nvm use v24.14.1
npm install
npm run dev
```

## Quality checks

```bash
npm test
npm run lint
npm run format:check
npm run check
```

### Test runtime bootstrap

- `npm test` uses a `register()` bootstrap: [test/register-tests.mjs](/Users/benochocki/Herd/led/test/register-tests.mjs)
- The bootstrap registers [test/alias-loader.mjs](/Users/benochocki/Herd/led/test/alias-loader.mjs) so Node tests can resolve:
  - `@/` aliases
  - extensionless local imports
  - JSON modules used by spectral catalogs

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
- If local `vite build` fails with Rollup native-module signing issues on macOS, run lint/tests first and verify runtime via `npm run dev` until the local node_modules environment is repaired.

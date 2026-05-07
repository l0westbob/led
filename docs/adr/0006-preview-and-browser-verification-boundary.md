# ADR 0006: Preview And Browser Verification Boundary

## Context

Board Preview mixes UI interaction, emitter geometry, electrical summaries,
spectral aggregation, CCT projection, and wiring estimates. Those workflows are
hard to validate with Node-only tests because canvas, SVG, lazy chunks, and
accessible controls are browser-visible behavior.

## Decision

Keep Board Preview as a UI-owned view boundary with service-backed data and
typed presentation adapters:

- `useBoardPreviewViewModel()` owns preview snapshot construction for the lazy
  preview page.
- The planner store does not eagerly import Board Preview snapshot or spectral
  data paths.
- Preview computation is split into focused application services for electrical
  rows, spectrum aggregation, selection projection, CCT summary, and wiring.
- SVG emitter interaction keeps pointer behavior, while transparent HTML hit
  controls provide stable accessible names for selection.
- SVG emitter geometry/drag wiring and PPFD heatmap drag lifecycle are
  component-local composables with Vitest coverage.
- `PpfdHeatmap.vue` exposes a named canvas image role for browser verification.
- Browser smoke coverage stays small and stable:
  - app mount
  - page switching
  - LED Lab chart rendering
  - Board Preview emitter selection
  - PPFD heatmap nonblank canvas
  - core label and button-name checks

## Consequences

- Board Preview can stay lazily loaded without losing test coverage.
- Service logic remains testable in Node.
- Interaction wiring remains testable in Vitest without broad DOM snapshots.
- Browser tests cover the rendering and accessibility contracts that Node tests
  cannot see.
- CI treats browser smoke as a blocking job after the Node quality gate.
- The browser suite avoids broad DOM snapshots that would churn during styling
  changes.

## Rollback / Alternative

If browser smoke becomes flaky, keep the service-level tests and temporarily
mark only the browser CI job advisory until the flaky contract is narrowed or
removed.

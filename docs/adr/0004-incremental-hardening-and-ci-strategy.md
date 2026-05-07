# ADR 0004: Incremental Hardening And CI Strategy

## Context

The planner already has valuable MVP behavior and numerical baselines. A broad
rewrite would create avoidable risk across PPFD, board-library persistence,
spectral output, and UI workflows.

## Decision

Use incremental hardening as the migration strategy:

- Preserve the current Vue/Vite application shape while extracting services and
  components behind compatibility facades.
- Keep `dist/` generated and ignored.
- Pin the Node runtime through `.nvmrc` and `package.json` engines.
- Treat `npm run check` as the core quality gate:
  - lint
  - format check
  - Vue/TypeScript type check
  - Node tests
  - Vitest component/composable tests
  - production build
  - bundle budget
- Track bundle size with an explicit script rather than relying on manual Vite
  warnings.
- Keep browser smoke tests separate from `npm run check` so the Node gate
  remains lightweight.
- Run browser smoke in CI as a separate blocking job after the Node quality
  gate.
- Track `AGENTS.md` at the repo root so future agent sessions start with the
  same routing and context-budget rules.

## Consequences

- Refactors can land in small, reversible steps.
- CI catches formatting, type, architecture, test, build, browser, and bundle
  drift.
- Browser coverage exists without slowing the fast Node feedback loop.
- Runtime TypeScript strictness, store factories, component adapters, and
  catalog/PPFD helper boundaries are now covered by the core gate and fitness
  tests.

## Rollback / Alternative

If CI or browser smoke creates too much friction, disable only the affected
workflow job or script. Application behavior does not depend on the CI files.

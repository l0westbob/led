# ADR 0007: Global TypeScript Strictness

## Context

The hardening roadmap moved from JSDoc boundary contracts to a full runtime
source TypeScript migration. The remaining risk was leaving the repo in a mixed
mode where strict type checking passed only because `allowJs` kept JavaScript
runtime modules in scope.

## Decision

Runtime source under `src/` is globally strict TypeScript:

- `tsconfig.json` uses `strict: true` and no longer relies on `allowJs`.
- Runtime modules under `src/` use `.ts`.
- Vue SFCs use `<script setup lang="ts">`.
- Node tests import runtime source through extensionless local paths or `@/`
  aliases. The local alias loader remains for alias and JSON-module support.
- Architecture fitness tests block new runtime `.js` files, untyped Vue setup
  scripts, and broad `any` or untyped `Function` in public contracts.

## Consequences

- Public store, application-service, contract, catalog, and component boundaries
  now have compiler-checked contracts.
- Store factories/selectors, presentation adapters, component/composable tests,
  typed catalog data, and PPFD helper modules are part of the hardened target
  architecture rather than follow-up migration work.
- Browser and Node smoke tests remain the behavior gate; this ADR does not
  authorize framework, router, state-library, SSR, or UI-kit churn.
- Historical planning docs may still mention JavaScript paths, but live routing
  docs and README entry points should point at `.ts` runtime source.

## Rollback / Alternative

If strict TypeScript blocks an urgent production fix, revert the smallest
affected module batch and restore `allowJs` only as a short-lived emergency
bridge. The normal path is to fix the typed boundary, not to reintroduce mixed
runtime source.

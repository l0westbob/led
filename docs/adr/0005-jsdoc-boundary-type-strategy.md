# ADR 0005: JSDoc Boundary Type Strategy

Status: Superseded by ADR 0007 for runtime source under `src/`.

## Context

The codebase is JavaScript-first. The roadmap identified type ambiguity around
application-service dependencies, planner use cases, result envelopes, and
persisted board-library data. Adding TypeScript before boundaries are stable
would mix mechanical migration work with behavioral refactors.

## Decision

Use JSDoc and architecture fitness tests before adopting TypeScript:

- Keep runtime source as JavaScript for the current hardening phase.
- Add named dependency and contract shapes at public boundaries instead of broad
  `Function` or catch-all object signatures.
- Prefer service-level tests for extracted modules before adding component test
  tooling.
- Enforce layer boundaries with architecture fitness tests:
  - domain does not depend on application, stores, or components
  - application does not depend on stores
  - contracts do not depend on presentation layers
  - components do not import domain modules directly
  - stores do not import components
- If TypeScript is adopted later, convert pure modules first, then application
  services, then Vue SFCs.

## Consequences

- The current package stack stays small.
- Public contracts become easier to review without a wholesale compiler
  migration.
- TypeScript remains available as a later phase once domain and application
  seams are quieter.

## Rollback / Alternative

If JSDoc becomes insufficient, add TypeScript tooling in a dedicated change and
start with contract/domain modules that have no Vue dependency.

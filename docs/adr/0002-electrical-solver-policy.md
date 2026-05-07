# ADR 0002: Electrical Solver Policy

## Context

Electrical synchronization is central to planner correctness. Historic MVP
iterations showed issues with drift/runaway updates when voltage, current, and
temperature were edited repeatedly.

## Decision

Establish explicit solver policy boundaries:

- Solver resolves one operating point per request with deterministic precedence.
- `constantVoltage` and `constantCurrent` flows are explicit and symmetric.
- Wiring precedence:
  - explicit series/parallel overrides inferred values
  - inferred values are derived from LED reference behavior only
- Solver outputs include provenance and limit/violation metadata.
- Electrical violation metadata is now always emitted; the permanent migration
  flag for this behavior has been retired.

## Consequences

- UI state orchestration can consume consistent solver results.
- Round-trip edits become testable and stable.
- Future solver upgrades can run dual-compare without touching component code.

## Rollback / Alternative

If policy decomposition introduces regressions, route through compatibility
adapter to the previous sync path while retaining new output contracts.

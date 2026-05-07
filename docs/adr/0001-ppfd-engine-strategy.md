# ADR 0001: PPFD Engine Strategy

## Context

The project requires fast, interactive PPFD previews while preserving confidence
in numerical output. The current estimator is optimized for speed and is a
valid MVP baseline, but long-horizon roadmap work needs explicit boundaries for
engine evolution and comparison.

## Decision

Adopt a dual-engine strategy:

- Keep the current estimator as `FastPreviewEngine` for UI responsiveness.
- Introduce a contract boundary (`estimatePpfdMap(input): PpfdMapResult`) so a
  second `ReferenceEngine` can be added for correctness checks.
- Compare engines through fixture-based regression and map-level error metrics
  (MAE, max error, percentile error).
- Require callers to provide resolved photon flux when invoking PPFD engines so
  geometry estimation stays independent from electrical/photon policy.

## Consequences

- Feature work can continue using the fast engine without blocking.
- Numerical drift becomes measurable and reviewable.
- Engine swap risk is reduced through contract-level isolation.
- Electrical and photon calculations remain upstream in application services.

## Rollback / Alternative

If abstraction overhead or complexity becomes too high, keep the single engine
path and run correctness checks in offline test harness only.

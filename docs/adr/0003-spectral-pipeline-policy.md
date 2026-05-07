# ADR 0003: Spectral Pipeline Policy

## Context

Spectral math is consumed by multiple views (Lamp Planner, Board Preview, LED
Lab). Duplicated transform paths increase drift risk and make calibration
behavior harder to reason about.

## Decision

Use one canonical spectral pipeline with explicit modes and grids:

- Canonical series contracts:
  - `RelativeSpdSeries`
  - `RadiantSpdSeries`
  - `PhotonSpdSeries`
- Canonical transform order:
  - relative -> radiant (when lumen-anchored)
  - radiant -> photon
  - weighting/integration on shared wavelength grid
- Shared resolver path for LED -> spectrum dataset -> calibration anchor.
- Reusable spectrum chart view-model rendering is shared across LED Lab and
  Board Preview.

## Consequences

- LED Lab and planner outputs align numerically for the same LED context.
- Calibration fallback behavior is centralized and testable.
- Future additions (e.g. improved CCT estimation) can rely on one data source.

## Rollback / Alternative

If a full unification rollout causes short-term instability, keep current
builders and enable the new pipeline behind a feature flag with dual-run checks.

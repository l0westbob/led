import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSpectralWeighting,
  integrateTrapezoid,
  normalizeToMax,
} from "../src/domain/spectral/math";

test("integrateTrapezoid integrates a constant function", () => {
  const x = [0, 1, 2, 3];
  const y = [2, 2, 2, 2];
  assert.equal(integrateTrapezoid(x, y), 6);
});

test("normalizeToMax returns a max-normalized array", () => {
  assert.deepEqual(normalizeToMax([2, 4, 8]), [0.25, 0.5, 1]);
});

test("computeSpectralWeighting produces finite ratios", () => {
  const wavelengthNm = [400, 405, 410, 415, 420, 425, 430];
  const values = [1, 1.2, 1.4, 1.3, 1.1, 1, 0.9];
  const result = computeSpectralWeighting({ wavelengthNm, values });

  assert.ok(Number.isFinite(result.total));
  assert.ok(Number.isFinite(result.mccreeRatio));
  assert.ok(result.mccreeRatio >= 0);
});

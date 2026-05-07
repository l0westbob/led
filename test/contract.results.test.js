import test from "node:test";
import assert from "node:assert/strict";
import {
  createFailureResult,
  createSnapshotEnvelope,
  createSuccessResult,
} from "../src/contracts/versioned/results";

test("createSuccessResult returns normalized v1.1 envelope", () => {
  const result = createSuccessResult({
    data: { value: 1 },
    warnings: [{ code: "W", message: "warning", severity: "warning" }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.contractVersion, "1.1");
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.data, { value: 1 });
});

test("createFailureResult returns normalized v1.1 envelope", () => {
  const result = createFailureResult({
    errors: [{ code: "E", message: "error", severity: "error", field: "test" }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.contractVersion, "1.1");
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].field, "test");
});

test("createSnapshotEnvelope returns consistent snapshot shape", () => {
  const envelope = createSnapshotEnvelope({
    data: { summary: 1 },
    warnings: [{ code: "W", message: "warn", severity: "warning" }],
    errors: [],
    timings: { stage: 1.23 },
  });

  assert.equal(envelope.contractVersion, "1.1");
  assert.deepEqual(envelope.data, { summary: 1 });
  assert.equal(envelope.warnings.length, 1);
  assert.deepEqual(envelope.timings, { stage: 1.23 });
});

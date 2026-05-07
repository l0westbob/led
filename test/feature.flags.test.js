import test from "node:test";
import assert from "node:assert/strict";
import {
  isFeatureEnabled,
  listFeatureFlags,
} from "../src/application/shared/featureFlags";

test("feature flags only expose runtime overrides after permanent flags retire", () => {
  const flags = listFeatureFlags();
  assert.deepEqual(flags, {});
  assert.equal(isFeatureEnabled("retired.flag"), false);
});

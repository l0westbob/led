import test from "node:test";
import assert from "node:assert/strict";
import { resolveLedContext } from "../src/application/shared/resolveLedContext.js";

test("resolveLedContext returns structured error for unknown LED", () => {
  const result = resolveLedContext({
    ledId: "non-existing-led-id",
    stepNm: 5,
  });

  assert.equal(result.led, null);
  assert.ok(result.errors.some((issue) => issue.code === "LED_NOT_FOUND"));
  assert.equal(result.data.led, null);
});

test("resolveLedContext returns known LED and warnings/errors arrays", () => {
  const result = resolveLedContext({
    ledId: "lm301h_cri80_5000k",
    stepNm: 5,
  });

  assert.ok(result.led);
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
  assert.equal(result.data.led?.id, result.led.id);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createLedLabStore } from "../src/stores/ledLabStore";

test("LED Lab store factory keeps compared LED rows isolated", () => {
  const storeA = createLedLabStore();
  const storeB = createLedLabStore();

  storeA.addComparedLed();
  storeA.state.comparedLeds[1].id = "lm301h_evo_5000k";

  assert.equal(storeA.state.comparedLeds.length, 2);
  assert.equal(storeB.state.comparedLeds.length, 1);
  assert.equal(storeB.state.comparedLeds[0].id, "lm301h_cri80_5000k");
});

test("LED Lab store factory keeps display mode isolated", () => {
  const storeA = createLedLabStore();
  const storeB = createLedLabStore();

  storeA.setMode("photon");

  assert.equal(storeA.state.mode, "photon");
  assert.equal(storeA.snapshot.value.mode, "photon");
  assert.equal(storeB.state.mode, "relative");
  assert.equal(storeB.snapshot.value.mode, "relative");
});

import test from "node:test";
import assert from "node:assert/strict";
import { estimateBasePpfFromSpectrumCalibration } from "../src/domain/spectral/ppfEstimation";
import { estimateBasePpfFromCalibrationLookup } from "../src/domain/spectral/basePpfCalibration";
import { LED_LIBRARY_V2 } from "../src/domain/LedLibraryV2";

test("lumen-anchored LM301H variant yields non-zero base PPF", () => {
  const led = LED_LIBRARY_V2.lm301h_cri80_3000k;
  const ppf = estimateBasePpfFromSpectrumCalibration(led);
  assert.ok(ppf > 0);
});

test("base PPF lookup matches dataset-backed lumen calibration", () => {
  const led = LED_LIBRARY_V2.lm301h_cri80_3000k;
  const expected = estimateBasePpfFromSpectrumCalibration(led);
  const actual = estimateBasePpfFromCalibrationLookup(led);

  assert.equal(actual, Number(expected.toFixed(12)));
});

test("ppf-anchored EVO variant preserves positive base PPF", () => {
  const led = LED_LIBRARY_V2.lm301h_evo_5000k;
  const ppf = estimateBasePpfFromSpectrumCalibration(led);
  assert.ok(ppf > 0);
});

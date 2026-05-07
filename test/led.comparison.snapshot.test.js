import test from "node:test";
import assert from "node:assert/strict";
import { buildLedComparisonSnapshot } from "../src/application/ledLab/buildLedComparisonSnapshot";

test("buildLedComparisonSnapshot supports multiple LEDs in relative mode", () => {
  const snapshot = buildLedComparisonSnapshot({
    comparedLeds: [
      { id: "lm301h_cri80_3000k", color: "#ffaa3c" },
      { id: "lm301h_cri80_5000k", color: "#56e1ff" },
    ],
    mode: "relative",
    fallbackLedId: "lm301h_cri80_5000k",
  });

  assert.equal(snapshot.mode, "relative");
  assert.equal(snapshot.columns.length, 2);
  assert.ok(snapshot.chartData.series.some((series) => series.id === "mccree"));
  assert.ok(snapshot.chartData.series.some((series) => series.id === "din"));
  assert.ok(snapshot.chartData.series.some((series) => series.id === "led-1"));
  assert.ok(snapshot.chartData.series.some((series) => series.id === "led-2"));
});

test("buildLedComparisonSnapshot hides mccree/din in photon mode", () => {
  const snapshot = buildLedComparisonSnapshot({
    comparedLeds: [{ id: "lm301h_evo_5000k", color: "#ffaa3c" }],
    mode: "photon",
    fallbackLedId: "lm301h_evo_5000k",
  });

  assert.equal(snapshot.mode, "photon");
  assert.ok(
    snapshot.chartData.series.every(
      (series) => !["mccree", "din"].includes(series.id),
    ),
  );
  assert.equal(
    typeof snapshot.seriesPath(snapshot.chartData.series[0].y),
    "string",
  );
});

test("buildLedComparisonSnapshot handles empty compared rows safely", () => {
  const snapshot = buildLedComparisonSnapshot({
    comparedLeds: [{ id: "", color: "#ffaa3c" }],
    mode: "relative",
    fallbackLedId: "lm301h_cri80_5000k",
  });

  assert.ok(snapshot.columns.length === 0);
  assert.ok(snapshot.chartData.series.length >= 1);
});

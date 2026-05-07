import test from "node:test";
import assert from "node:assert/strict";
import { buildSpectrumChartViewModel } from "../src/application/ledLab/buildSpectrumChartViewModel";

test("buildSpectrumChartViewModel builds relative axis and path", () => {
  const viewModel = buildSpectrumChartViewModel({
    mode: "relative",
    nmMin: 280,
    nmMax: 840,
    series: [
      {
        id: "board-spectrum",
        label: "Board",
        color: "#56e1ff",
        y: Array.from({ length: 561 }, () => 0.5),
      },
    ],
  });

  assert.equal(viewModel.mode, "relative");
  assert.equal(viewModel.yAxisLabel, "Relative SPD (%)");
  assert.equal(viewModel.yTicks.length, 11);
  assert.match(viewModel.seriesPath(viewModel.series[0].y), /^M /);
});

test("buildSpectrumChartViewModel builds photon axis", () => {
  const viewModel = buildSpectrumChartViewModel({
    mode: "photon",
    nmMin: 280,
    nmMax: 840,
    series: [
      {
        id: "led-1",
        label: "LED 1",
        color: "#ffaa3c",
        y: Array.from({ length: 561 }, (_, index) => index / 20),
      },
    ],
  });

  assert.equal(viewModel.mode, "photon");
  assert.equal(viewModel.yAxisLabel, "Photon SPD (µmol/s/nm)");
  assert.equal(viewModel.yTicks.length, 11);
});

test("buildSpectrumChartViewModel photon axis scales for non-led series ids", () => {
  const viewModel = buildSpectrumChartViewModel({
    mode: "photon",
    nmMin: 280,
    nmMax: 282,
    series: [
      {
        id: "board-spectrum",
        label: "Board",
        color: "#56e1ff",
        y: [0, 12.5, 25],
      },
    ],
  });

  assert.equal(viewModel.maxPhotonValue, 25);
  assert.equal(viewModel.yTicks.at(-1)?.label, "25.000");
});

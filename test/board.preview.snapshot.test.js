import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardPlannerPreviewSnapshot } from "../src/application/planner/buildBoardPlannerPreviewSnapshot";

test("board preview snapshot returns zero electrical values when no emitters exist", () => {
  const snapshot = buildBoardPlannerPreviewSnapshot({
    board: {
      id: "test-board",
      name: "Test Board",
      ledType: "lm301h_cri80_5000k",
      widthMm: 100,
      depthMm: 100,
      ledCount: 1,
      columns: 1,
      rows: 1,
      spacingXMm: 20,
      spacingYMm: 20,
      seriesCount: 1,
      parallelCount: 1,
      emitters: [],
    },
  });

  assert.equal(snapshot.boardElectricalEstimate.boardVoltageV, 0);
  assert.equal(snapshot.boardElectricalEstimate.boardCurrentA, 0);
  assert.equal(snapshot.boardElectricalEstimate.inputPowerW, 0);
});

test("board preview snapshot returns structured CCT metadata", () => {
  const snapshot = buildBoardPlannerPreviewSnapshot({
    board: {
      id: "test-board",
      name: "Test Board",
      ledType: "lm301h_cri80_5000k",
      widthMm: 100,
      depthMm: 100,
      ledCount: 1,
      columns: 1,
      rows: 1,
      spacingXMm: 20,
      spacingYMm: 20,
      seriesCount: 1,
      parallelCount: 1,
      emitters: [
        {
          id: "emitter-1",
          xMm: 50,
          yMm: 50,
          ledType: "lm301h_cri80_5000k",
          drive: {
            driveMode: "constantCurrent",
            voltageV: 2.7,
            currentA: 0.065,
            temperatureC: 25,
            seriesCount: 1,
            parallelCount: 1,
          },
        },
      ],
    },
  });

  assert.equal(typeof snapshot.cct, "object");
  assert.equal(snapshot.cct.method, "photon-flux-weighted-led-cct");
  assert.equal(snapshot.cct.valueK, snapshot.cctK);
});

test("board preview snapshot exposes selected emitter ids and count", () => {
  const snapshot = buildBoardPlannerPreviewSnapshot({
    board: {
      id: "test-board",
      name: "Test Board",
      ledType: "lm301h_cri80_5000k",
      widthMm: 100,
      depthMm: 100,
      ledCount: 2,
      columns: 2,
      rows: 1,
      spacingXMm: 20,
      spacingYMm: 20,
      seriesCount: 1,
      parallelCount: 1,
      emitters: [
        {
          id: "emitter-1",
          xMm: 40,
          yMm: 50,
          ledType: "lm301h_cri80_5000k",
          drive: {
            driveMode: "constantCurrent",
            voltageV: 2.7,
            currentA: 0.065,
            temperatureC: 25,
            seriesCount: 1,
            parallelCount: 1,
          },
        },
        {
          id: "emitter-2",
          xMm: 60,
          yMm: 50,
          ledType: "lm301h_cri80_5000k",
          drive: {
            driveMode: "constantCurrent",
            voltageV: 2.7,
            currentA: 0.065,
            temperatureC: 25,
            seriesCount: 1,
            parallelCount: 1,
          },
        },
      ],
    },
    selectedEmitterIds: [
      "emitter-1",
      "emitter-missing",
      "emitter-2",
      "emitter-1",
    ],
  });

  assert.deepEqual(snapshot.selectedEmitterIds, ["emitter-1", "emitter-2"]);
  assert.equal(snapshot.selectedEmitterCount, 2);
});

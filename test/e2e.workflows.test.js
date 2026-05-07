import test from "node:test";
import assert from "node:assert/strict";
import {
  createBoardDefinition,
  deleteBoardDefinition,
  duplicateBoardDefinition,
  listCustomBoardDefinitions,
  updateBoardDefinition,
} from "../src/application/boardLibrary/boardLibraryService";
import { buildPlannerSnapshot } from "../src/application/planner/buildPlannerSnapshot";
import { applyBoardInstanceQuarterTurn } from "../src/application/planner/placementState";
import { resolveBoardConfigDraft } from "../src/application/planner/boardConfigState";
import { createEmitterInteractionMachine } from "../src/application/planner/emitterInteractionMachine";
import { applyBulkEmitterConfiguration } from "../src/application/planner/applyBulkEmitterConfiguration";
import { buildBoardPlannerPreviewSnapshot } from "../src/application/planner/buildBoardPlannerPreviewSnapshot";
import { buildLedComparisonSnapshot } from "../src/application/ledLab/buildLedComparisonSnapshot";

function createMemoryStorageAdapter() {
  /** @type {Array<object>} */
  let values = [];
  return {
    loadSavedBoards() {
      return values;
    },
    saveBoardCollection(_storageKey, boards) {
      values = boards;
    },
  };
}

function createBoardDraft(name = "Workflow Board") {
  return {
    id: "",
    name,
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 440,
    depthMm: 285,
    ledCount: 308,
    columns: 22,
    rows: 14,
    spacingXMm: 20,
    spacingYMm: 18,
    voltageV: 38.6,
    currentA: 2,
    temperatureC: 50,
    seriesCount: 14,
    parallelCount: 22,
    distanceCm: 35,
    roomWidthCm: 120,
    roomDepthCm: 120,
    photoperiodHours: 12,
    boardCount: 1,
    boardSpacingCm: 20,
    fixtureColumns: 1,
    fixtureRows: 1,
    fixtureSpacingXCm: 20,
    fixtureSpacingYCm: 20,
  };
}

/**
 * Workflow smoke tests ("E2E-like") for core product flows.
 *
 * These remain deterministic and fast in Node test runs and provide a stable
 * regression safety net for the release-critical user journeys.
 */
test("e2e: Board Planner CRUD flow", () => {
  const storageKey = "e2e.board.planner";
  const storageAdapter = createMemoryStorageAdapter();

  const created = createBoardDefinition({
    storageKey,
    storageAdapter,
    draft: createBoardDraft("E2E Board"),
  });
  assert.equal(created.ok, true);
  assert.ok(created.data?.id);

  const persistedAfterCreate = listCustomBoardDefinitions({
    storageKey,
    storageAdapter,
  });
  assert.equal(persistedAfterCreate.length, 1);

  const updated = updateBoardDefinition({
    storageKey,
    storageAdapter,
    boardId: created.data.id,
    draft: {
      ...createBoardDraft("E2E Board Updated"),
      id: created.data.id,
      currentA: 2.25,
    },
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.data?.currentA, 2.25);

  const duplicated = duplicateBoardDefinition({
    storageKey,
    storageAdapter,
    draft: updated.data,
  });
  assert.equal(duplicated.ok, true);
  assert.notEqual(duplicated.data?.id, updated.data?.id);

  const deleted = deleteBoardDefinition({
    storageKey,
    storageAdapter,
    boardId: created.data.id,
  });
  assert.equal(deleted.ok, true);

  const persistedAfterDelete = listCustomBoardDefinitions({
    storageKey,
    storageAdapter,
  });
  assert.equal(persistedAfterDelete.length, 1);
});

test("e2e: Lamp Planner placement/config/snapshot flow", () => {
  const board = createBoardDraft("Lamp Planner Workflow");
  const boardInstance = {
    id: "instance-1",
    name: "Instance 1",
    presetBoardId: "lamp-workflow",
    ledType: board.ledType,
    widthMm: board.widthMm,
    depthMm: board.depthMm,
    ledCount: board.ledCount,
    columns: board.columns,
    rows: board.rows,
    spacingXMm: board.spacingXMm,
    spacingYMm: board.spacingYMm,
    emitters: board.emitters,
    xCm: 60,
    yCm: 60,
    rotationDeg: 0,
    drive: {
      driveMode: "constantVoltage",
      voltageV: board.voltageV,
      currentA: board.currentA,
      temperatureC: board.temperatureC,
      seriesCount: board.seriesCount,
      parallelCount: board.parallelCount,
    },
  };

  applyBoardInstanceQuarterTurn({
    boardInstance,
    boardInstances: [boardInstance],
    roomWidthCm: board.roomWidthCm,
    roomDepthCm: board.roomDepthCm,
    direction: "right",
  });
  assert.equal(boardInstance.rotationDeg, 90);

  const draftResolved = resolveBoardConfigDraft({
    boardInstance,
    draft: {
      ...boardInstance.drive,
      driveMode: "constantCurrent",
      currentA: 2.1,
      temperatureC: 45,
    },
    preserveField: "currentA",
  });
  boardInstance.drive = draftResolved.resolvedDrive;

  const snapshot = buildPlannerSnapshot({
    board,
    boardInstances: [boardInstance],
    resolutionCm: 2,
    runReferenceComparison: false,
  });

  assert.ok(Number.isFinite(snapshot.summary.average));
  assert.ok(Number.isFinite(snapshot.summary.calculationMs));
  assert.equal(snapshot.boardInstances.length, 1);
  assert.ok(snapshot.summary.inputPower > 0);
});

test("e2e: Board Preview emitter edit flow", () => {
  const interactionMachine = createEmitterInteractionMachine({
    dragThresholdPx: 6,
  });
  const pointerStart = interactionMachine.beginPointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 100,
    clientY: 100,
  });
  assert.equal(pointerStart.shouldStartDrag, false);

  const pointerMove = interactionMachine.movePointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 118,
    clientY: 102,
  });
  assert.equal(pointerMove.shouldStartDrag, true);
  assert.equal(pointerMove.shouldPreviewDrag, true);

  const pointerEnd = interactionMachine.endPointer({
    emitterId: "emitter-1",
    pointerId: 1,
  });
  assert.equal(pointerEnd.shouldCommitDrag, true);

  const emitters = [
    {
      id: "emitter-1",
      xMm: 20,
      yMm: 20,
      ledType: "lm301h_cri80_5000k",
      drive: {
        driveMode: "constantVoltage",
        voltageV: 2.7,
        currentA: 0.07,
        temperatureC: 25,
        seriesCount: 1,
        parallelCount: 1,
      },
    },
    {
      id: "emitter-2",
      xMm: 40,
      yMm: 20,
      ledType: "lm301h_cri80_5000k",
      drive: {
        driveMode: "constantVoltage",
        voltageV: 2.7,
        currentA: 0.07,
        temperatureC: 25,
        seriesCount: 1,
        parallelCount: 1,
      },
    },
  ];
  const bulkResult = applyBulkEmitterConfiguration({
    emitters,
    selectedEmitterIds: ["emitter-1"],
    apply: {
      ledType: true,
      driveMode: true,
      voltageV: true,
      currentA: false,
      temperatureC: true,
    },
    values: {
      ledType: "lm301h_evo_5000k",
      driveMode: "constantCurrent",
      voltageV: 2.95,
      currentA: 0.07,
      temperatureC: 30,
    },
    roundToTwoDecimals: (value) => Math.round(value * 100) / 100,
  });
  assert.equal(bulkResult.ok, true);
  assert.equal(bulkResult.data.emitters[0].ledType, "lm301h_evo_5000k");
  assert.equal(bulkResult.data.emitters[1].ledType, "lm301h_cri80_5000k");

  const preview = buildBoardPlannerPreviewSnapshot({
    board: {
      ...createBoardDraft("Board Preview Workflow"),
      emitters: bulkResult.data.emitters,
      ledCount: 2,
      columns: 2,
      rows: 1,
      seriesCount: 1,
      parallelCount: 2,
    },
    selectedEmitterIds: ["emitter-1"],
  });
  assert.equal(preview.selectedEmitterCount, 1);
  assert.ok(preview.totalPhotonFlux >= 0);
});

test("e2e: LED Lab multi-compare flow", () => {
  const relativeSnapshot = buildLedComparisonSnapshot({
    comparedLeds: [
      { id: "lm301h_cri80_3000k", color: "#ffaa3c" },
      { id: "lm301h_cri80_5000k", color: "#56e1ff" },
      { id: "lm301h_evo_5000k", color: "#8cff8c" },
    ],
    mode: "relative",
    fallbackLedId: "lm301h_cri80_5000k",
  });
  assert.equal(relativeSnapshot.columns.length, 3);
  assert.ok(
    relativeSnapshot.chartData.series.some((series) => series.id === "mccree"),
  );
  assert.ok(
    relativeSnapshot.chartData.series.some((series) => series.id === "din"),
  );

  const photonSnapshot = buildLedComparisonSnapshot({
    comparedLeds: [
      { id: "lm301h_cri80_3000k", color: "#ffaa3c" },
      { id: "lm301h_evo_5000k", color: "#56e1ff" },
    ],
    mode: "photon",
    fallbackLedId: "lm301h_cri80_5000k",
  });
  assert.equal(photonSnapshot.mode, "photon");
  assert.ok(
    photonSnapshot.chartData.series.every(
      (series) => !["mccree", "din"].includes(series.id),
    ),
  );
  assert.ok(
    photonSnapshot.columns.every((column) =>
      Number.isFinite(column.photonFlux),
    ),
  );
});

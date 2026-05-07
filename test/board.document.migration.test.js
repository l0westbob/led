import test from "node:test";
import assert from "node:assert/strict";
import {
  deserializeBoardDefinitionDocument,
  serializeBoardDefinitionDocument,
} from "../src/application/boardLibrary/boardDocumentMigration";

function createLegacyBoardEntry() {
  return {
    id: "legacy-board",
    name: "Legacy Board",
    ledType: "lm301h_cri80_5000k",
    emitters: [{ xMm: 20, yMm: 10, type: "lm301h_cri80_5000k" }],
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

test("deserializeBoardDefinitionDocument migrates legacy flat entries with warning", () => {
  const migrated = deserializeBoardDefinitionDocument(createLegacyBoardEntry());

  assert.equal(migrated.board.id, "legacy-board");
  assert.equal(migrated.board.boardSchemaVersion, "1.1");
  assert.equal(migrated.board.simulationContextVersion, "1.1");
  assert.ok(
    migrated.warnings.some(
      (issue) => issue.code === "MIGRATED_LEGACY_BOARD_DOCUMENT",
    ),
  );
});

test("serializeBoardDefinitionDocument creates v1.1 board document shape", () => {
  const serialized = serializeBoardDefinitionDocument(createLegacyBoardEntry());

  assert.equal(serialized.documentType, "BoardDefinitionDocument");
  assert.equal(serialized.boardSchemaVersion, "1.1");
  assert.equal(serialized.simulationContextVersion, "1.1");
  assert.equal(serialized.definition.id, "legacy-board");
  assert.equal(serialized.simulationContext.roomWidthCm, 120);
  assert.equal(serialized.defaultDriveTemplate.voltageV, 38.6);
  assert.ok(Array.isArray(serialized.emitters));
  assert.equal(serialized.emitters[0].documentType, "BoardEmitterDocument");
});

test("deserializeBoardDefinitionDocument round-trips v1.1 documents", () => {
  const serialized = serializeBoardDefinitionDocument(createLegacyBoardEntry());
  const deserialized = deserializeBoardDefinitionDocument(serialized);

  assert.equal(deserialized.warnings.length, 0);
  assert.equal(deserialized.board.id, "legacy-board");
  assert.equal(deserialized.board.ledType, "lm301h_cri80_5000k");
  assert.equal(deserialized.board.emitters.length, 1);
  assert.equal(deserialized.board.emitters[0].ledType, "lm301h_cri80_5000k");
});

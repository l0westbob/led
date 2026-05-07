import test from "node:test";
import assert from "node:assert/strict";
import {
  assertBoardDefinitionDocumentCollection,
  assertBoardDefinitionDocument,
  assertOperationResult,
  assertPlannerSnapshotSummary,
  createBoardDefinitionDocumentCollection,
  createSuccessResult,
} from "../src/contracts/versioned/index";
import { serializeBoardDefinitionDocument } from "../src/application/boardLibrary/boardDocumentMigration";

test("contract assertions accept valid board documents and operation results", () => {
  const document = serializeBoardDefinitionDocument({
    id: "assertion-board",
    name: "Assertion Board",
    ledType: "lm301h_cri80_5000k",
  });
  const operationResult = createSuccessResult({ data: { id: "ok" } });

  assert.deepEqual(assertBoardDefinitionDocument(document), []);
  assert.deepEqual(assertOperationResult(operationResult), []);
});

test("contract assertions accept valid board document collections", () => {
  const document = serializeBoardDefinitionDocument({
    id: "assertion-board",
    name: "Assertion Board",
    ledType: "lm301h_cri80_5000k",
  });
  const collection = createBoardDefinitionDocumentCollection({
    exportedAtIso: "2026-05-29T00:00:00.000Z",
    boards: [document],
  });

  assert.deepEqual(assertBoardDefinitionDocumentCollection(collection), []);
});

test("contract assertions reject malformed planner summaries", () => {
  const issues = assertPlannerSnapshotSummary({
    average: 1,
    min: 0,
    max: 2,
  });

  assert.ok(issues.some((issue) => issue.field === "summary.gridWidth"));
});

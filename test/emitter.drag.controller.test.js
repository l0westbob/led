import test from "node:test";
import assert from "node:assert/strict";
import { createEmitterDragController } from "../src/components/useEmitterDrag";

function pointerEventStub(overrides = {}) {
  return {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    currentTarget: { setPointerCapture() {} },
    ...overrides,
  };
}

test("emitter drag controller keeps click as selection without movement", () => {
  const calls = [];
  const dragController = createEmitterDragController({
    isMoveLocked: () => false,
    startDrag: () => calls.push("start"),
    previewDrag: () => calls.push("preview"),
    commitDrag: () => calls.push("commit"),
    cancelDrag: () => calls.push("cancel"),
    selectEmitter: () => calls.push("select"),
    isDraggingEmitter: () => false,
    toBoardCoordinates: () => ({ xMm: 10, yMm: 10 }),
  });

  dragController.handlePointerDown(pointerEventStub(), "emitter-1");
  dragController.handlePointerUp(pointerEventStub(), "emitter-1");
  assert.deepEqual(calls, ["select"]);
});

test("emitter drag controller starts drag after threshold crossing", () => {
  const calls = [];
  let isDragging = false;
  const dragController = createEmitterDragController({
    isMoveLocked: () => false,
    startDrag: () => {
      calls.push("start");
      isDragging = true;
    },
    previewDrag: () => calls.push("preview"),
    commitDrag: () => {
      calls.push("commit");
      isDragging = false;
    },
    cancelDrag: () => calls.push("cancel"),
    selectEmitter: () => calls.push("select"),
    isDraggingEmitter: () => isDragging,
    toBoardCoordinates: () => ({ xMm: 12, yMm: 24 }),
  });

  dragController.handlePointerDown(pointerEventStub(), "emitter-1");
  dragController.handlePointerMove(
    pointerEventStub({ clientX: 120, clientY: 120 }),
    "emitter-1",
  );
  dragController.handlePointerUp(
    pointerEventStub({ clientX: 120, clientY: 120 }),
    "emitter-1",
  );

  assert.deepEqual(calls, ["start", "preview", "commit"]);
});

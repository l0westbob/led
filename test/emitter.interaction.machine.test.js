import test from "node:test";
import assert from "node:assert/strict";
import { createEmitterInteractionMachine } from "../src/application/planner/emitterInteractionMachine";

test("emitter interaction machine keeps click as selection-only path", () => {
  const machine = createEmitterInteractionMachine({ dragThresholdPx: 6 });
  machine.beginPointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  machine.movePointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 13,
    clientY: 12,
  });
  const end = machine.endPointer({
    emitterId: "emitter-1",
    pointerId: 1,
  });
  assert.equal(end.shouldSelectOnly, true);
  assert.equal(end.shouldCommitDrag, false);
});

test("emitter interaction machine transitions to drag after threshold crossing", () => {
  const machine = createEmitterInteractionMachine({ dragThresholdPx: 6 });
  machine.beginPointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  const move = machine.movePointer({
    emitterId: "emitter-1",
    pointerId: 1,
    clientX: 20,
    clientY: 20,
  });
  assert.equal(move.shouldStartDrag, true);
  assert.equal(move.shouldPreviewDrag, true);
  const end = machine.endPointer({
    emitterId: "emitter-1",
    pointerId: 1,
  });
  assert.equal(end.shouldCommitDrag, true);
});

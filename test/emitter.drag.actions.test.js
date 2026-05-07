import test from "node:test";
import assert from "node:assert/strict";
import { createEmitterDragActions } from "../src/application/planner/useCases/emitterDragActions";

function createState() {
  return {
    form: {
      widthMm: 100,
      depthMm: 80,
      emitters: [
        { id: "emitter-1", xMm: 10, yMm: 10 },
        { id: "emitter-2", xMm: 20, yMm: 20 },
      ],
    },
    selectedBoardPlannerEmitterId: "",
    emitterDragState: { isDragging: false, emitterId: "" },
    boardPlannerSpectrumMode: "relative",
    boardPlannerEmitterMoveLocked: false,
  };
}

test("emitter drag actions start dragging an existing emitter", () => {
  const state = createState();
  const actions = createEmitterDragActions({ state });

  const result = actions.startEmitterDrag("emitter-2");

  assert.equal(result.ok, true);
  assert.equal(state.emitterDragState.isDragging, true);
  assert.equal(state.emitterDragState.emitterId, "emitter-2");
  assert.equal(state.selectedBoardPlannerEmitterId, "emitter-2");
});

test("emitter drag actions reject dragging a missing emitter", () => {
  const state = createState();
  const actions = createEmitterDragActions({ state });

  const result = actions.startEmitterDrag("missing");

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, "EMITTER_NOT_FOUND");
  assert.equal(state.emitterDragState.isDragging, false);
});

test("emitter drag actions clamp preview positions to board bounds", () => {
  const state = createState();
  const actions = createEmitterDragActions({ state });

  const result = actions.previewEmitterPosition("emitter-1", 101.4, -2);

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { xMm: 100, yMm: 0 });
  assert.equal(state.form.emitters[0].xMm, 100);
  assert.equal(state.form.emitters[0].yMm, 0);
});

test("emitter drag actions commit movement and clear drag state", () => {
  const state = createState();
  const actions = createEmitterDragActions({ state });

  actions.startEmitterDrag("emitter-1");
  const result = actions.commitEmitterPosition("emitter-1", 42, 43);

  assert.equal(result.ok, true);
  assert.equal(state.form.emitters[0].xMm, 42);
  assert.equal(state.form.emitters[0].yMm, 43);
  assert.equal(state.emitterDragState.isDragging, false);
  assert.equal(state.emitterDragState.emitterId, "");
});

test("emitter drag actions switch spectrum mode and lock movement", () => {
  const state = createState();
  const actions = createEmitterDragActions({ state });

  actions.startEmitterDrag("emitter-1");
  actions.setBoardPlannerSpectrumMode("photon");
  const result = actions.setBoardPlannerEmitterMoveLocked(true);

  assert.equal(result.ok, true);
  assert.equal(state.boardPlannerSpectrumMode, "photon");
  assert.equal(state.boardPlannerEmitterMoveLocked, true);
  assert.equal(state.emitterDragState.isDragging, false);
  assert.equal(state.emitterDragState.emitterId, "");
});

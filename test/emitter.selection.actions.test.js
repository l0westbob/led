import test from "node:test";
import assert from "node:assert/strict";
import { createEmitterSelectionActions } from "../src/application/planner/useCases/emitterSelectionActions";

function createState() {
  return {
    form: {
      emitters: [{ id: "emitter-1" }, { id: "emitter-2" }, { id: "emitter-3" }],
    },
    selectedBoardPlannerEmitterId: "",
    selectedBoardPlannerEmitterIds: [],
    boardPlannerSelectionAnchorEmitterId: "",
  };
}

test("emitter selection actions select one primary emitter", () => {
  const state = createState();
  const actions = createEmitterSelectionActions({ state });

  const result = actions.selectBoardPlannerEmitter("emitter-2");

  assert.equal(result.ok, true);
  assert.equal(state.selectedBoardPlannerEmitterId, "emitter-2");
  assert.deepEqual(state.selectedBoardPlannerEmitterIds, ["emitter-2"]);
  assert.equal(state.boardPlannerSelectionAnchorEmitterId, "emitter-2");
});

test("emitter selection actions support additive toggles", () => {
  const state = createState();
  const actions = createEmitterSelectionActions({ state });

  actions.selectBoardPlannerEmitter("emitter-1");
  actions.toggleBoardPlannerEmitterSelection("emitter-2", { additive: true });
  actions.toggleBoardPlannerEmitterSelection("emitter-1", { additive: true });

  assert.deepEqual(state.selectedBoardPlannerEmitterIds, ["emitter-2"]);
  assert.equal(state.selectedBoardPlannerEmitterId, "emitter-1");
});

test("emitter selection actions support range selection", () => {
  const state = createState();
  const actions = createEmitterSelectionActions({ state });

  actions.selectBoardPlannerEmitter("emitter-1");
  const result = actions.toggleBoardPlannerEmitterSelection("emitter-3", {
    range: true,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data.selectedEmitterIds, [
    "emitter-1",
    "emitter-2",
    "emitter-3",
  ]);
});

test("emitter selection actions sanitize unavailable ids", () => {
  const state = createState();
  state.selectedBoardPlannerEmitterId = "missing";
  state.selectedBoardPlannerEmitterIds = ["missing"];
  state.boardPlannerSelectionAnchorEmitterId = "missing";
  const actions = createEmitterSelectionActions({ state });

  actions.sanitizeEmitterSelection();

  assert.equal(state.selectedBoardPlannerEmitterId, "emitter-1");
  assert.deepEqual(state.selectedBoardPlannerEmitterIds, ["emitter-1"]);
  assert.equal(state.boardPlannerSelectionAnchorEmitterId, "");
});

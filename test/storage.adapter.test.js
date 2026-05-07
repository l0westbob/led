import test from "node:test";
import assert from "node:assert/strict";
import {
  loadSavedBoards,
  loadSavedBoardsWithReport,
  saveBoardCollectionWithReport,
} from "../src/utils/storage";

function withLocalStorage(localStorage, callback) {
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });

  try {
    callback();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
}

test("loadSavedBoardsWithReport warns when stored JSON is malformed", () => {
  withLocalStorage(
    {
      getItem() {
        return "{not-json";
      },
    },
    () => {
      const report = loadSavedBoardsWithReport("boards");

      assert.deepEqual(report.boards, []);
      assert.equal(report.warnings[0]?.code, "BOARD_STORAGE_READ_FAILED");
      assert.deepEqual(loadSavedBoards("boards"), []);
    },
  );
});

test("loadSavedBoardsWithReport warns when stored JSON is not an array", () => {
  withLocalStorage(
    {
      getItem() {
        return JSON.stringify({ boards: [] });
      },
    },
    () => {
      const report = loadSavedBoardsWithReport("boards");

      assert.deepEqual(report.boards, []);
      assert.equal(report.warnings[0]?.code, "BOARD_STORAGE_NOT_ARRAY");
    },
  );
});

test("saveBoardCollectionWithReport reports localStorage write failures", () => {
  withLocalStorage(
    {
      setItem() {
        throw new Error("quota exceeded");
      },
    },
    () => {
      const report = saveBoardCollectionWithReport("boards", []);

      assert.equal(report.ok, false);
      assert.equal(report.errors[0]?.code, "BOARD_STORAGE_WRITE_FAILED");
      assert.match(report.errors[0]?.message, /quota exceeded/);
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { createInspectionDraftActions } from "../src/features/inspection/hooks/use-inspection-draft-actions.ts";
import { fieldKey, getPumpCardKeys } from "../src/features/inspection/model/field-rules.ts";

// TS modules in this repository load Sonner through its CommonJS entry.
const { toast } = createRequire(import.meta.url)("sonner");

function createDraft(initial) {
  let current = initial;
  let writes = 0;
  const actions = createInspectionDraftActions((change) => {
    current = { ...change(current), updatedAt: `revision-${++writes}` };
  });
  return { actions, snapshot: () => current, writes: () => writes };
}

function lastUndo() {
  const notification = toast.getHistory().at(-1);
  assert.equal(notification.action.label, "撤销");
  return notification.action.onClick;
}

test("pump clear and undo preserve unrelated edits, current tab and absent fields", () => {
  const keys = getPumpCardKeys("slag8", "冲渣泵", 0);
  const draft = createDraft({ values: { [keys[0]]: "102", [keys[1]]: "42", unrelated: "11" }, beltTab: "SZ101" });
  draft.actions.clearPump("slag8", "冲渣泵", 0);
  const undo = lastUndo();
  for (const key of keys) assert.equal(draft.snapshot().values[key], "");
  draft.actions.updateValue("unrelated", "55");
  draft.actions.setBeltTab("SZ201");
  undo();
  assert.deepEqual(draft.snapshot().values, { [keys[0]]: "102", [keys[1]]: "42", unrelated: "55" });
  assert.equal(draft.snapshot().beltTab, "SZ201");
  assert.equal(draft.writes(), 4, "clear, edit, tab change and undo use the same persistence entry");
});

test("pump selection swaps duplicate numbers and new inspection persists an empty draft", () => {
  const first = fieldKey("slag8", "冲渣泵", "0", "no");
  const second = fieldKey("slag8", "冲渣泵", "1", "no");
  const draft = createDraft({ values: { [first]: "101", [second]: "102", unrelated: "8" }, beltTab: "SZ201-N" });
  draft.actions.choosePump("slag8", "冲渣泵", 0, "102");
  assert.equal(draft.snapshot().values[first], "102");
  assert.equal(draft.snapshot().values[second], "101");
  assert.equal(draft.snapshot().values.unrelated, "8");
  draft.actions.createNewInspection();
  assert.deepEqual(draft.snapshot(), { values: {}, beltTab: "SZ101", updatedAt: "revision-2" });
});

test("belt clear targets configured readings and undo retains later pump edits", () => {
  const motor = fieldKey("belt", "SZ101", "电机 / 减速机", "motor");
  const pump = fieldKey("slag9", "上塔泵", "0", "south");
  const draft = createDraft({ values: { [motor]: "37", [pump]: "42" }, beltTab: "SZ101" });
  draft.actions.clearBeltItem("SZ101", ["东", "西"], "电机 / 减速机");
  const undo = lastUndo();
  assert.equal(draft.snapshot().values[motor], "");
  assert.equal(draft.snapshot().values[pump], "42");
  draft.actions.updateValue(pump, "51");
  undo();
  assert.deepEqual(draft.snapshot().values, { [motor]: "37", [pump]: "51" });
});

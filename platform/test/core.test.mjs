// Тесты чистых подсчётов ядра (без ФС).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, computeByGroup } from "../src/lib/core.mjs";

const measures = {
  groups: [{ id: "A" }, { id: "B" }],
  measures: [
    { id: "A-1", group: "A" },
    { id: "A-2", group: "A" },
    { id: "B-1", group: "B" },
    { id: "B-2", group: "B" },
  ],
};

test("percent = pass / (total − na)", () => {
  const data = { assessments: { p: { "A-1": { status: "pass" }, "A-2": { status: "na" } } } };
  const s = computeScore("p", data, measures);
  assert.equal(s.total, 4);
  assert.equal(s.counts.pass, 1);
  assert.equal(s.counts.na, 1);
  assert.equal(s.counts.todo, 2);
  // 1 pass из (4 − 1 na) = 3 → 33%
  assert.equal(s.percent, 33);
});

test("нет мер по проекту → 0%, всё todo", () => {
  const s = computeScore("unknown", { assessments: {} }, measures);
  assert.equal(s.percent, 0);
  assert.equal(s.counts.todo, 4);
});

test("все na → percent 0 без деления на ноль", () => {
  const data = {
    assessments: { p: { "A-1": { status: "na" }, "A-2": { status: "na" }, "B-1": { status: "na" }, "B-2": { status: "na" } } },
  };
  const s = computeScore("p", data, measures);
  assert.equal(s.percent, 0);
});

test("computeByGroup раскладывает по группам", () => {
  const data = { assessments: { p: { "A-1": { status: "pass" }, "B-1": { status: "fail" } } } };
  const g = computeByGroup("p", data, measures);
  assert.equal(g.A.pass, 1);
  assert.equal(g.A.todo, 1);
  assert.equal(g.A.total, 2);
  assert.equal(g.B.fail, 1);
  assert.equal(g.B.total, 2);
});

import assert from "node:assert/strict";
import test from "node:test";
import { credit, debit, initialData, moveToGoal } from "../lib/demo.ts";

test("credits and debits update pocket money and create matching log entries", () => {
  const credited = credit(initialData, 100, "Chore reward", "Reward");
  assert.equal(credited.balance, initialData.balance + 100);
  assert.equal(credited.transactions[0].amount, 100);
  assert.equal(credited.transactions[0].direction, "in");

  const debited = debit(credited, 40, "Practice snack", "Practice purchase");
  assert.equal(debited.balance, initialData.balance + 60);
  assert.equal(debited.transactions[0].direction, "out");
});

test("rejects invalid and unaffordable money moves without changing the original", () => {
  assert.throws(() => credit(initialData, 0, "Zero", "Test"));
  assert.throws(() => debit(initialData, initialData.balance + 1, "Too much", "Test"));
  assert.equal(initialData.balance, 1240);
  assert.equal(initialData.transactions.length, 6);
});

test("goal transfers reduce pocket money and increase only the selected goal", () => {
  const next = moveToGoal(initialData, "g1", 100);
  assert.equal(next.balance, initialData.balance - 100);
  assert.equal(next.goals[0].saved, initialData.goals[0].saved + 100);
  assert.equal(next.goals[1].saved, initialData.goals[1].saved);
  assert.equal(next.transactions[0].category, "Savings transfer");
  assert.throws(() => moveToGoal(initialData, "g1", 2000));
});

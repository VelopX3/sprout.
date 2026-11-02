import assert from "node:assert/strict";
import test from "node:test";
import { credit, decideRequest, debit, initialData, moveToGoal, replyToRequest, requestPurchase, simulatePurchase } from "../lib/demo.ts";

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

test("purchase requests support a local ask, follow-up, and approval without losing the decision", () => {
  const asked = requestPurchase({ ...initialData, requests: [] }, "Headphones", 350, "Games", "I can use them for learning videos.");
  const id = asked.requests[0].id;
  const question = decideRequest(asked, id, "more_info", "Could you wait until your next allowance?");
  assert.equal(question.balance, initialData.balance);
  const replied = replyToRequest(question, id, "I can wait and save part of next week’s allowance.");
  assert.equal(replied.requests[0].status, "pending");
  const approved = decideRequest(replied, id, "approved", "Good plan. Let’s compare prices together.");
  assert.equal(approved.balance, initialData.balance - 350);
  assert.equal(approved.transactions[0].amount, 350);
  assert.equal(approved.transactions[0].category, "Games");
  assert.equal(approved.requests[0].status, "approved");
  assert.throws(() => decideRequest(approved, id, "approved", "Already decided."));
});

test("rejected requests do not change the wallet and the simulator matches the goal gap", () => {
  const asked = requestPurchase({ ...initialData, requests: [] }, "Toy", 200, "Other", "It looks fun.");
  const rejected = decideRequest(asked, asked.requests[0].id, "rejected", "Let’s save for your scooter first.");
  assert.equal(rejected.balance, initialData.balance);
  assert.equal(rejected.transactions.length, initialData.transactions.length);
  assert.equal(rejected.requests[0].status, "rejected");
  assert.deepEqual(simulatePurchase(500, { target: 5000, saved: 1000 }, 350), { remainingBalance: 150, shortfall: 0, goalGap: 4000, goalGapAfter: 4350 });
  assert.deepEqual(simulatePurchase(40, { target: 5000, saved: 1000 }, 350), { remainingBalance: 0, shortfall: 310, goalGap: 4000, goalGapAfter: 4040 });
  assert.throws(() => requestPurchase({ ...initialData, requests: [] }, "Toy", 0, "Other", "Fun"));
});

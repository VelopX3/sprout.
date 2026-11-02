export type Txn = {
  id: string;
  title: string;
  category: string;
  amount: number;
  direction: "in" | "out";
  createdAt: string;
};

export type Goal = {
  id: string;
  title: string;
  emoji: string;
  target: number;
  saved: number;
  weeklySaving: number;
  color: string;
};

export type Request = {
  id: string;
  title: string;
  amount: number;
  emoji: string;
  category: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "more_info";
  feedback: string;
  createdAt: string;
};

export type AppData = {
  childName: string;
  parentName: string;
  balance: number;
  allowance: number;
  allowanceDay: string;
  xp: number;
  streak: number;
  avatar: string;
  notifications: boolean;
  transactions: Txn[];
  goals: Goal[];
  requests: Request[];
  completedLessons: string[];
  completedChallenges: string[];
};

const date = (month: number, day: number, hour = 12) =>
  new Date(Date.UTC(2026, month, day, hour)).toISOString();

export const initialData: AppData = {
  childName: "Maya",
  parentName: "Aarav",
  balance: 1240,
  allowance: 500,
  allowanceDay: "Monday",
  xp: 240,
  streak: 4,
  avatar: "🌼",
  notifications: true,
  transactions: [
    { id: "t1", title: "Weekly allowance", category: "Pocket money", amount: 500, direction: "in", createdAt: date(10, 2, 8) },
    { id: "t2", title: "The Book Nook", category: "Books", amount: 240, direction: "out", createdAt: date(10, 1, 16) },
    { id: "t3", title: "Made my bed", category: "Chore reward", amount: 50, direction: "in", createdAt: date(10, 1, 10) },
    { id: "t4", title: "Sunny Side Café", category: "Treats", amount: 185, direction: "out", createdAt: date(9, 31, 14) },
    { id: "t5", title: "Saved for my scooter", category: "Savings transfer", amount: 200, direction: "out", createdAt: date(9, 30, 11) },
    { id: "t6", title: "Recycling helper", category: "Chore reward", amount: 75, direction: "in", createdAt: date(9, 29, 9) },
  ],
  goals: [
    { id: "g1", title: "Rainbow scooter", emoji: "🛴", target: 4500, saved: 2850, weeklySaving: 250, color: "lilac" },
    { id: "g2", title: "Space book set", emoji: "🚀", target: 2000, saved: 1320, weeklySaving: 150, color: "peach" },
    { id: "g3", title: "Help the shelter", emoji: "🐾", target: 1000, saved: 500, weeklySaving: 100, color: "mint" },
  ],
  requests: [],
  completedLessons: ["needs-wants"],
  completedChallenges: ["plan-week"],
};

export const lessons = [
  { id: "needs-wants", title: "Need it or want it?", detail: "Spot the difference before you spend.", emoji: "🛍️", minutes: 4, xp: 25 },
  { id: "saving-plan", title: "Make a saving plan", detail: "Turn a big wish into little steps.", emoji: "🗺️", minutes: 5, xp: 30 },
  { id: "money-grows", title: "How money grows", detail: "Learn why patience can pay off.", emoji: "🌱", minutes: 6, xp: 35 },
];

export const challenges = [
  { id: "plan-week", title: "Plan your week", detail: "Pick one thing to save for this week.", emoji: "🗓️", reward: 20 },
  { id: "skip-treat", title: "Pause before a treat", detail: "Wait one day before buying a want.", emoji: "🍪", reward: 25 },
  { id: "money-chat", title: "Money chat", detail: "Ask a grown-up how they save.", emoji: "💬", reward: 15 },
];

export const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export function credit(data: AppData, amount: number, title: string, category: string): AppData {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a whole amount greater than zero.");
  return {
    ...data,
    balance: data.balance + amount,
    transactions: [{ id: crypto.randomUUID(), title, category, amount, direction: "in", createdAt: new Date().toISOString() }, ...data.transactions],
  };
}

export function debit(data: AppData, amount: number, title: string, category: string): AppData {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a whole amount greater than zero.");
  if (amount > data.balance) throw new Error("There isn’t enough pocket money for that yet.");
  return {
    ...data,
    balance: data.balance - amount,
    transactions: [{ id: crypto.randomUUID(), title, category, amount, direction: "out", createdAt: new Date().toISOString() }, ...data.transactions],
  };
}

export function moveToGoal(data: AppData, goalId: string, amount: number): AppData {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a whole amount greater than zero.");
  const goal = data.goals.find((item) => item.id === goalId);
  if (!goal) throw new Error("That savings goal could not be found.");
  if (amount > data.balance) throw new Error("There isn’t enough pocket money for that yet.");
  if (goal.saved + amount > goal.target) throw new Error("That amount is more than this goal needs.");
  return {
    ...data,
    balance: data.balance - amount,
    goals: data.goals.map((item) => item.id === goalId ? { ...item, saved: item.saved + amount } : item),
    transactions: [{ id: crypto.randomUUID(), title: `Added to ${goal.title}`, category: "Savings transfer", amount, direction: "out", createdAt: new Date().toISOString() }, ...data.transactions],
  };
}

export function requestPurchase(data: AppData, title: string, amount: number, category: string, reason: string): AppData {
  if (!title.trim() || title.trim().length > 48 || !reason.trim() || reason.trim().length > 180) throw new Error("Add a short item name and reason.");
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000) throw new Error("Choose a whole amount from ₹1 to ₹1,00,000.");
  if (!["Treats", "School", "Books", "Games", "Sports", "Other"].includes(category)) throw new Error("Choose a category from the list.");
  if (data.requests.some((item) => item.status === "pending" || item.status === "more_info")) throw new Error("Finish your open request with a grown-up first.");
  return { ...data, requests: [{ id: crypto.randomUUID(), title: title.trim(), amount, emoji: "🛍️", category, reason: reason.trim(), status: "pending", feedback: "", createdAt: new Date().toISOString() }, ...data.requests] };
}

export function decideRequest(data: AppData, requestId: string, status: "approved" | "rejected" | "more_info", feedback: string): AppData {
  const request = data.requests.find((item) => item.id === requestId);
  if (!request || (request.status !== "pending" && request.status !== "more_info")) throw new Error("This request is no longer waiting for a decision.");
  if (!feedback.trim() || feedback.trim().length > 180) throw new Error("Add a kind note of up to 180 characters to explain your decision.");
  if (status === "approved" && request.amount > data.balance) throw new Error("There isn’t enough pocket money to approve this yet.");
  const next = status === "approved" ? debit(data, request.amount, request.title, request.category) : data;
  return { ...next, requests: next.requests.map((item) => item.id === requestId ? { ...item, status, feedback: feedback.trim() } : item) };
}

export function replyToRequest(data: AppData, requestId: string, reason: string): AppData {
  const request = data.requests.find((item) => item.id === requestId);
  if (!request || request.status !== "more_info") throw new Error("There isn’t a question waiting for you.");
  if (!reason.trim() || reason.trim().length > 180) throw new Error("Add a short reply (up to 180 characters).");
  return { ...data, requests: data.requests.map((item) => item.id === requestId ? { ...item, reason: reason.trim(), status: "pending" } : item) };
}

export function simulatePurchase(balance: number, goal: Goal | undefined, amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Choose a whole amount of zero or more.");
  const spendable = Math.min(balance, amount);
  const goalGap = goal ? Math.max(0, goal.target - goal.saved) : 0;
  return { remainingBalance: balance - spendable, shortfall: amount - spendable, goalGap, goalGapAfter: goalGap + spendable };
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bike, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronRight, CircleHelp, CircleUserRound,
  Clock3, Coins, CreditCard, Gift, GraduationCap, HandCoins,
  Gamepad2, House, Leaf, LockKeyhole, LogOut, MoreHorizontal, Plus, Settings,
  ShieldCheck, Sparkles, Star, Target, TrendingUp, Trophy, Wallet, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppData, challenges, credit, currency, debit, initialData, lessons, moveToGoal } from "@/lib/demo";
import { supabase } from "@/lib/supabase";

type View = "home" | "parent" | "goals" | "activity" | "allowance" | "learn" | "challenges" | "profile" | "splash" | "onboarding" | "auth";
type ModalState = null | { kind: "goal" } | { kind: "deposit"; goalId: string } | { kind: "allowance" } | { kind: "spend" } | { kind: "reward" };
type IconType = typeof House;
type MascotPose = "happy" | "think" | "celebrate" | "encourage";

const outfitPoses: Record<string, MascotPose> = { cap: "happy", scarf: "think", cape: "celebrate", pack: "encourage" };
const outfits: { id: string; name: string; pose: MascotPose }[] = [
  { id: "cap", name: "Orange cap", pose: "happy" },
  { id: "scarf", name: "Blue scarf", pose: "think" },
  { id: "cape", name: "Sunny cape", pose: "celebrate" },
  { id: "pack", name: "Teal backpack", pose: "encourage" },
];

const nav: { id: View; label: string; icon: IconType }[] = [
  { id: "home", label: "My money", icon: House },
  { id: "goals", label: "Saving goals", icon: Target },
  { id: "activity", label: "Money log", icon: ArrowDownLeft },
  { id: "learn", label: "Money school", icon: GraduationCap },
  { id: "challenges", label: "Challenges", icon: Trophy },
];

const isAppData = (value: unknown): value is AppData => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AppData>;
  const transactions = data.transactions?.every((item) => item !== null && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string" && item.title.length <= 48 && typeof item.category === "string" && Number.isSafeInteger(item.amount) && item.amount > 0 && (item.direction === "in" || item.direction === "out") && typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)));
  const goals = data.goals?.every((item) => item !== null && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string" && item.title.length > 0 && item.title.length <= 48 && typeof item.emoji === "string" && Number.isSafeInteger(item.target) && item.target > 0 && Number.isSafeInteger(item.saved) && item.saved >= 0 && item.saved <= item.target && ["lilac", "peach", "mint"].some((color) => color === item.color));
  const requests = data.requests?.every((item) => item !== null && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string" && item.title.length <= 48 && typeof item.emoji === "string" && Number.isSafeInteger(item.amount) && item.amount > 0);
  return typeof data.childName === "string" && data.childName.length > 0 && data.childName.length <= 24 && typeof data.parentName === "string" && data.parentName.length > 0 && data.parentName.length <= 24 &&
    Number.isSafeInteger(data.balance) && (data.balance ?? -1) >= 0 && Number.isSafeInteger(data.allowance) && (data.allowance ?? -1) >= 0 &&
    typeof data.allowanceDay === "string" && Number.isSafeInteger(data.xp) && (data.xp ?? -1) >= 0 && Number.isSafeInteger(data.streak) && (data.streak ?? -1) >= 0 &&
    typeof data.avatar === "string" && typeof data.notifications === "boolean" && transactions === true && goals === true && requests === true &&
    Array.isArray(data.completedLessons) && data.completedLessons.every((item) => typeof item === "string") &&
    Array.isArray(data.completedChallenges) && data.completedChallenges.every((item) => typeof item === "string");
};

const demoStorageKey = "sprout-data-v1:demo";
const accountStorageKey = (id: string) => `sprout-data-v1:${id}`;
const readAppData = (key: string): AppData | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return isAppData(value) ? { ...initialData, ...value } : null;
  } catch { return null; }
};

const titleFor: Record<View, string> = {
  home: "Money garden", parent: "Family overview", goals: "Dreams in progress",
  activity: "Money log", allowance: "Pocket money plan", learn: "Money school",
  challenges: "Your next little win", profile: "Your corner", splash: "A little hello",
  onboarding: "Welcome to Sprout", auth: "Your Sprout account",
};

function moneyDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(value));
}

function SproutMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? " brand-mark-small" : ""}`} aria-hidden="true"><Leaf size={small ? 16 : 19} strokeWidth={2.4} /></span>;
}

export default function SproutApp() {
  const [data, setData] = useState<AppData>(initialData);
  const [view, setView] = useState<View>("home");
  const [onboardingStep, setOnboardingStep] = useState(0);
  const role: "child" | "parent" = view === "parent" || view === "allowance" ? "parent" : "child";
  const [modal, setModal] = useState<ModalState>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [lessonWasCompleted, setLessonWasCompleted] = useState(false);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formEmoji, setFormEmoji] = useState("🪴");
  const [formDay, setFormDay] = useState("Monday");
  const [formError, setFormError] = useState("");
  const [authError, setAuthError] = useState("");
  const [weekStart, setWeekStart] = useState(0);
  const [todayIndex, setTodayIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const demoData = readAppData(demoStorageKey) ?? readAppData("sprout-data-v1");
        if (demoData) setData(demoData);
        setAccountEmail(localStorage.getItem("sprout-email") ?? "");
      } catch {
        // Browser storage is optional; the sample garden still works without it.
      }
      setReady(true);
      if (!supabase) {
        setSyncReady(true);
        return;
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        const sessionUser = sessionData.session?.user;
        if (sessionUser) {
          setUserId(sessionUser.id);
          setAccountEmail(sessionUser.email ?? "");
          const localAccountData = readAppData(accountStorageKey(sessionUser.id));
          const { data: row } = await supabase.from("family_data").select("data").eq("user_id", sessionUser.id).maybeSingle();
          if (!cancelled) {
            const remote = row && isAppData(row.data) ? { ...initialData, ...row.data } : localAccountData ?? initialData;
            setData(remote);
            localStorage.setItem(accountStorageKey(sessionUser.id), JSON.stringify(remote));
          }
        }
      } catch {
        if (!cancelled) setToast("Your demo is ready. Cloud sync can reconnect later.");
      } finally {
        if (!cancelled) setSyncReady(true);
      }
    };
    void boot();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date();
      setWeekStart(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setTodayIndex((now.getDay() + 6) % 7);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal && !activeLesson) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModal(null); setActiveLesson(null); setFormError(""); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, activeLesson]);

  const commit = (next: AppData, ownerId = userId) => {
    setData(next);
    try { localStorage.setItem(ownerId ? accountStorageKey(ownerId) : demoStorageKey, JSON.stringify(next)); }
    catch { setToast("This browser could not save your changes. Check its storage settings."); }
    if (supabase && ownerId && syncReady) {
      void supabase.from("family_data").upsert({ user_id: ownerId, data: next }).then(({ error }) => {
        if (error) setToast("Saved on this device. Cloud sync needs a connection check.");
      });
    }
  };

  const showToast = (message: string) => setToast(message);
  const openModal = (next: Exclude<ModalState, null>) => {
    setModal(next);
    setFormTitle("");
    setFormAmount("");
    setFormEmoji("🪴");
    setFormDay(data.allowanceDay);
    setFormError("");
  };
  const changeRole = (next: "child" | "parent") => {
    setView(next === "parent" ? "parent" : "home");
  };

  const handleModalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(formAmount);
    if (modal?.kind === "goal") {
      const name = formTitle.trim();
      if (!name || name.length > 48) { setFormError("Give your goal a short name (up to 48 characters)."); return; }
      if (!Number.isSafeInteger(amount) || amount < 50 || amount > 1000000) { setFormError("Choose a whole-number goal between ₹50 and ₹10,00,000."); return; }
      commit({ ...data, goals: [...data.goals, { id: crypto.randomUUID(), title: name, emoji: formEmoji, target: amount, saved: 0, color: ["lilac", "peach", "mint"][data.goals.length % 3] }] });
      setModal(null); showToast("A new dream is growing 🌱");
    } else if (modal?.kind === "deposit") {
      try {
        const goal = data.goals.find((item) => item.id === modal.goalId);
        commit(moveToGoal(data, modal.goalId, amount));
        setModal(null);
        showToast(goal && goal.saved + amount === goal.target ? "You did it! Goal reached — time to celebrate 🌟" : "Look at you, growing that goal 🌿");
      } catch (error) { setFormError(error instanceof Error ? error.message : "That transfer could not be made."); }
    } else if (modal?.kind === "allowance") {
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000) { setFormError("Choose a whole amount up to ₹1,00,000."); return; }
      commit({ ...data, allowance: amount, allowanceDay: formDay });
      setModal(null); showToast("Pocket money plan updated.");
    } else if (modal?.kind === "spend") {
      const name = formTitle.trim();
      if (!name || name.length > 48) { setFormError("Add a short note for this practice purchase."); return; }
      try {
        commit(debit(data, amount, name, "Practice purchase"));
        setModal(null); showToast("Demo purchase added to your money log.");
      } catch (error) { setFormError(error instanceof Error ? error.message : "That purchase could not be recorded."); }
    } else if (modal?.kind === "reward") {
      const name = formTitle.trim();
      if (!name || name.length > 48) { setFormError("Add a short note about what you’re celebrating."); return; }
      try {
        commit(credit(data, amount, name, "Chore reward"));
        setModal(null); showToast("A little reward is in the money log 🌟");
      } catch (error) { setFormError(error instanceof Error ? error.message : "That reward could not be added."); }
    }
  };

  const giveAllowance = () => {
    if (!data.allowance) { showToast("Set a weekly amount before adding allowance."); return; }
    try {
      commit(credit(data, data.allowance, "Weekly allowance", "Pocket money"));
      showToast("This week’s demo allowance is in your pocket.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Allowance could not be added."); }
  };

  const resolveRequest = (requestId: string, approved: boolean) => {
    const request = data.requests.find((item) => item.id === requestId);
    if (!request) return;
    try {
      const next = approved ? debit(data, request.amount, request.title, "Parent approved") : data;
      commit({ ...next, requests: data.requests.filter((item) => item.id !== requestId) });
      showToast(approved ? `Approved ${currency(request.amount)} for ${request.title}.` : "Request declined.");
    } catch (error) { showToast(error instanceof Error ? error.message : "That request could not be approved."); }
  };

  const completeChallenge = (id: string, reward: number) => {
    if (data.completedChallenges.includes(id)) return;
    commit({ ...data, xp: data.xp + reward, completedChallenges: [...data.completedChallenges, id] });
    showToast(`+${reward} XP — little steps add up! ⭐`);
  };

  const finishLesson = (answerIndex: number) => {
    if (!activeLesson) return;
    setQuizChoice(answerIndex);
    const correctAnswers: Record<string, number> = { "needs-wants": 1, "saving-plan": 0, "money-grows": 2 };
    if (answerIndex !== correctAnswers[activeLesson]) return;
    if (!data.completedLessons.includes(activeLesson)) {
      const lesson = lessons.find((item) => item.id === activeLesson);
      commit({ ...data, xp: data.xp + (lesson?.xp ?? 20), completedLessons: [...data.completedLessons, activeLesson] });
    }
    showToast(data.completedLessons.includes(activeLesson) ? "Nice review! You already earned this lesson’s stars." : "Lesson complete — those are smart money moves! ⭐");
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAuthError("Enter a valid email address."); return; }
    if (password.length < 8) { setAuthError("Use at least 8 characters for your password."); return; }
    if (!supabase) {
      setAccountEmail(email);
      localStorage.setItem("sprout-email", email);
      setView("home");
      showToast("You’re in demo mode. This account stays on this device.");
      return;
    }
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setAuthError(result.error.message); return; }
    if (!result.data.user) { setAuthError("We couldn’t confirm that account. Try again."); return; }
    const ownerId = result.data.user.id;
    if (authMode === "signup" && !result.data.session) {
      setAuthError("Check your inbox to confirm your email, then log in here.");
      setAuthMode("login");
      return;
    }
    setUserId(ownerId);
    setAccountEmail(result.data.user.email ?? email);
    localStorage.setItem("sprout-email", result.data.user.email ?? email);
    const { data: row } = await supabase.from("family_data").select("data").eq("user_id", ownerId).maybeSingle();
    const next = row && isAppData(row.data) ? { ...initialData, ...row.data } : readAppData(accountStorageKey(ownerId)) ?? initialData;
    commit(next, ownerId);
    setView("home");
    showToast(authMode === "signup" ? "Your Sprout account is ready." : "Welcome back.");
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) { showToast("Sign-out could not finish. Please try again."); return; }
    }
    const demoData = readAppData(demoStorageKey) ?? readAppData("sprout-data-v1") ?? initialData;
    setUserId(null);
    setAccountEmail("");
    setData(demoData);
    localStorage.removeItem("sprout-email");
    setView("home");
    showToast("Signed out. Your local demo remains on this device.");
  };

  const screen = view === "auth" || view === "onboarding" || view === "splash";
  const savedTotal = data.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalMoney = data.balance + savedTotal;
  const level = Math.floor(data.xp / 150) + 1;
  const levelProgress = data.xp % 150;
  const weekSpend = data.transactions.filter((item) => item.direction === "out" && item.category !== "Savings transfer" && new Date(item.createdAt).getTime() >= weekStart).reduce((sum, item) => sum + item.amount, 0);
  const recent = [...data.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const spendingDays = useMemo(() => {
    const amounts = [0, 0, 0, 0, 0, 0, 0];
    for (const item of data.transactions) {
      const timestamp = new Date(item.createdAt).getTime();
      if (item.direction !== "out" || item.category === "Savings transfer" || timestamp < weekStart) continue;
      const day = new Date(item.createdAt).getDay();
      amounts[(day + 6) % 7] += item.amount;
    }
    return amounts;
  }, [data.transactions, weekStart]);
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const maxSpend = Math.max(1, ...spendingDays);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode); setAuthError(""); setView("auth");
  };
  const openLesson = (id: string) => {
    setLessonWasCompleted(data.completedLessons.includes(id));
    setActiveLesson(id);
    setQuizChoice(null);
  };

  const handleProfileSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const childName = String(form.get("childName") ?? "").trim();
    const parentName = String(form.get("parentName") ?? "").trim();
    if (!childName || childName.length > 24 || !parentName || parentName.length > 24) {
      showToast("Names should be between 1 and 24 characters."); return;
    }
    commit({ ...data, childName, parentName });
    showToast("Family details saved.");
  };

  return (
    <div className="app-frame">
      {!screen && <aside className="sidebar">
        <button className="brand-button" onClick={() => setView("home")} aria-label="Sprout home">
          <SproutMark /><span>sprout<span className="brand-period">.</span></span>
        </button>
        <div className="sidebar-label">MY MONEY</div>
        <nav className="side-nav" aria-label="Money navigation">
          {nav.slice(0, 3).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item${view === id ? " active" : ""}`} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}>
              <Icon size={19} strokeWidth={2} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-label grownups-label">LEARN &amp; PLAY</div>
        <nav className="side-nav" aria-label="Learning navigation">
          {nav.slice(3).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item${view === id ? " active" : ""}`} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}>
              <Icon size={19} strokeWidth={2} /><span>{label}</span>{id === "challenges" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <button className="sidebar-mission" onClick={() => setView("challenges")}>
          <span><Sparkles size={14} /> TODAY’S SPARK</span>
          <strong>{data.streak} day streak</strong>
          <small>{data.xp} XP · level {level} grower</small>
          <i aria-hidden="true"><span style={{ width: `${(data.xp % 150) / 1.5}%` }} /></i>
        </button>
        <div className="sidebar-label grownups-label">FAMILY SPACE</div>
        <nav className="side-nav" aria-label="Family navigation">
          <button className={`nav-item${view === "parent" ? " active" : ""}`} onClick={() => changeRole("parent")} aria-current={view === "parent" ? "page" : undefined}><ShieldCheck size={19} /><span>Family overview</span></button>
          <button className={`nav-item${view === "allowance" ? " active" : ""}`} onClick={() => { changeRole("parent"); setView("allowance"); }} aria-current={view === "allowance" ? "page" : undefined}><CalendarDays size={19} /><span>Pocket money plan</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note"><span className="demo-note-dot" /><div><strong>Demo garden</strong><small>Practice mode · no real money</small></div></div>
          <button className={`profile-chip${view === "profile" ? " profile-chip-active" : ""}`} onClick={() => setView("profile")}>
            <Mascot pose={outfitPoses[data.avatar] ?? "happy"} label={`${data.childName}'s Pip outfit`} className="avatar-sm" /><span className="profile-chip-text"><strong>{data.childName}</strong><small>Level {level} sprout</small></span><MoreHorizontal size={18} />
          </button>
        </div>
      </aside>}

      <main className={`main-area${screen ? " main-full" : ""}`}>
        {!screen && <header className="topbar">
          <div className="topbar-title"><span className="eyebrow">{role === "parent" ? "GROWN-UP CORNER" : "YOUR MONEY SPACE"}</span><h1>{titleFor[view]}</h1></div>
          <div className="topbar-actions">
            <span className="mode-pill"><span />Demo mode</span>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => showToast("All caught up. You’re doing great!")}><Bell size={19} /><i /></button>
            <button className="top-avatar" onClick={() => setView("profile")} aria-label="Open profile"><Mascot pose={outfitPoses[data.avatar] ?? "happy"} label={`${data.childName}'s Pip outfit`} /></button>
          </div>
        </header>}

        <div className={`page-content${screen ? " page-content-full" : ""}`}>
          {view === "home" && <>
            <section className="dashboard-hero">
              <div className="hero-copy">
                <div className="hero-kicker"><Sparkles size={14} /> LITTLE BY LITTLE</div>
                <h2>Hey, {data.childName}!<br /><span>Your money is growing.</span></h2>
                <p>You have <b>{currency(totalMoney)}</b> in your money garden.</p>
                <div className="hero-actions">
                  <button className="button button-lime" onClick={() => setView("goals")}>See my goals <ArrowRight size={16} /></button>
                  <button className="hero-link" onClick={() => openModal({ kind: "spend" })}>Practice a purchase</button>
                </div>
              </div>
              <div className="hero-art" aria-label="Pip the turtle, your Sprout money companion">
                <span className="orbit orbit-one" /><span className="orbit orbit-two" />
                <span className="hero-star hero-star-one">✳</span><span className="hero-star hero-star-two">✦</span>
                <Mascot pose="happy" label="Pip celebrates your growing money" className="mascot-image" />
                <div className="mascot-caption"><span>meet pip</span><span>your money buddy</span></div>
              </div>
              <div className="hero-bottom"><span><Wallet size={15} /> In your pocket <b>{currency(data.balance)}</b></span><span className="hero-separator" /><span><Target size={15} /> Growing in goals <b>{currency(savedTotal)}</b></span></div>
            </section>

            <section className="quick-stats" aria-label="Your money at a glance">
              <article className="stat-card stat-allowance"><div className="stat-icon icon-mint"><HandCoins size={18} /></div><div className="stat-meta"><span>Allowance</span><strong>{currency(data.allowance)}</strong><small>Every {data.allowanceDay.toLowerCase()} <span className="stat-arrow">↗</span></small></div><button aria-label="Manage pocket money" onClick={() => { changeRole("parent"); setView("allowance"); }}><ArrowUpRight size={17} /></button></article>
              <article className="stat-card stat-saved"><div className="stat-icon icon-lilac"><Coins size={18} /></div><div className="stat-meta"><span>Savings goals</span><strong>{currency(savedTotal)}</strong><small>{data.goals.length} little dreams in progress</small></div><button aria-label="Open savings goals" onClick={() => setView("goals")}><ArrowUpRight size={17} /></button></article>
              <article className="stat-card stat-streak"><div className="stat-icon icon-peach"><Sparkles size={18} /></div><div className="stat-meta"><span>Streak</span><strong>{data.streak} days <span className="streak-flower">✿</span></strong><small>{data.xp} XP · level {level}</small></div><button aria-label="View challenges" onClick={() => setView("challenges")}><ArrowUpRight size={17} /></button></article>
            </section>

            <div className="dashboard-grid">
              <section className="panel goals-panel">
                <div className="section-heading"><div><span className="eyebrow">DREAM A LITTLE</span><h3>Goals taking root</h3></div><button className="text-button" onClick={() => setView("goals")}>All goals <ArrowRight size={15} /></button></div>
                <div className="mini-goals">{data.goals.slice(0, 2).map((goal) => <GoalCard key={goal.id} goal={goal} compact onAdd={() => openModal({ kind: "deposit", goalId: goal.id })} />)}</div>
                <button className="add-goal-row" onClick={() => openModal({ kind: "goal" })}><span className="add-goal-plus"><Plus size={17} /></span><span>Plant a new goal</span><ChevronRight size={17} /></button>
              </section>

              <section className="panel spending-panel">
                <div className="section-heading"><div><span className="eyebrow">A LITTLE LOOK BACK</span><h3>This week’s spending</h3></div><span className="chart-week-label">LAST 7 DAYS</span></div>
                <div className="spending-total"><strong>{currency(weekSpend)}</strong><span>spent this week</span></div>
                <div className="bar-chart" role="img" aria-label={`Spending in the last 7 days: ${currency(weekSpend)}`}>
                  {spendingDays.map((amount, index) => <div className="bar-day" key={index}><div className="bar-track"><span className={index === todayIndex ? "bar-fill bar-today" : "bar-fill"} style={{ height: `${Math.max(5, (amount / maxSpend) * 100)}%` }} /></div><span>{dayLabels[index]}</span></div>)}
                </div>
                <div className="chart-footnote"><span className="chart-legend-dot" /> Little purchases, big learning <span className="chart-footnote-amount">{data.transactions.filter((item) => item.direction === "out" && item.category !== "Savings transfer").length} purchases</span></div>
              </section>
            </div>

            <div className="dashboard-grid dashboard-lower-grid">
              <section className="panel transactions-panel">
                <div className="section-heading"><div><span className="eyebrow">MONEY MOVES</span><h3>Recent activity</h3></div><button className="text-button" onClick={() => setView("activity")}>See all <ArrowRight size={15} /></button></div>
                <TransactionList transactions={recent.slice(0, 4)} />
              </section>
              <section className="lesson-teaser">
                <div className="lesson-topline"><span className="lesson-chip"><BookOpen size={13} /> 5 MIN MISSION</span><span className="lesson-sparkle">✦</span></div>
                <div className="lesson-teaser-body"><div className="lesson-teaser-icon">🧭</div><div><h3>Needs, wants &amp; wishes</h3><p>Make a smart little choice. Earn 25 stars.</p></div></div>
                <button className="button button-dark" onClick={() => { setView("learn"); openLesson("needs-wants"); }}>Start learning <ArrowRight size={16} /></button>
              </section>
            </div>

            <section className="achievement-strip"><span className="achievement-icon">🏵️</span><div><span className="eyebrow">A BADGE TO BE PROUD OF</span><strong>Kind saver</strong><small>You’ve already tucked {currency(data.goals.find((item) => item.id === "g3")?.saved ?? 0)} away to help animals.</small></div><button onClick={() => setView("challenges")} aria-label="View your badges"><ChevronRight size={19} /></button></section>
          </>}

          {view === "parent" && <ParentDashboard data={data} onGive={giveAllowance} onReward={() => openModal({ kind: "reward" })} onEditAllowance={() => openModal({ kind: "allowance" })} onResolve={resolveRequest} onGoals={() => setView("goals")} onActivity={() => setView("activity")} onAllowance={() => setView("allowance")} />}

          {view === "goals" && <>
            <section className="page-intro"><div><span className="eyebrow">PATIENCE LOOKS GOOD ON YOU</span><h2>Big dreams, tiny steps.</h2><p>Every little bit you save brings a wish closer.</p></div><button className="button button-dark" onClick={() => openModal({ kind: "goal" })}><Plus size={17} /> New savings goal</button></section>
            <section className="goal-summary"><div className="goal-summary-icon"><Sparkles size={21} /></div><div><span>Growing across {data.goals.length} goals</span><strong>{currency(savedTotal)}</strong></div><div className="goal-summary-meter"><span style={{ width: `${Math.min(100, data.goals.reduce((sum, goal) => sum + (goal.saved / goal.target) * 100, 0) / Math.max(1, data.goals.length))}%` }} /></div><small>One step at a time 🌱</small></section>
            <div className="goal-grid">{data.goals.map((goal) => <GoalCard key={goal.id} goal={goal} onAdd={() => openModal({ kind: "deposit", goalId: goal.id })} />)}</div>
            <section className="tip-banner"><span>🌈</span><div><strong>A little secret about saving</strong><p>Choose a small amount you can set aside each week. Tiny habits grow into big things.</p></div><button onClick={() => setView("learn")} className="text-button">Learn how <ArrowRight size={15} /></button></section>
          </>}

          {view === "activity" && <>
            <section className="page-intro"><div><span className="eyebrow">EVERY MONEY MOVE COUNTS</span><h2>Your money story.</h2><p>A clear little log of allowance, treats, rewards and savings moves.</p></div><button className="button button-dark" onClick={() => openModal({ kind: "spend" })}><Plus size={17} /> Practice a purchase</button></section>
            <section className="activity-summary"><div><span>In your pocket</span><strong>{currency(data.balance)}</strong></div><i /><div><span>In your savings goals</span><strong>{currency(savedTotal)}</strong></div><i /><div><span>Money moving this week</span><strong>{currency(weekSpend)}</strong></div></section>
            <section className="panel full-transaction-panel"><div className="section-heading"><div><span className="eyebrow">YOUR RECENT MONEY MOVES</span><h3>{data.transactions.length} moments and counting</h3></div><span className="demo-tag"><LockKeyhole size={12} /> Practice data</span></div><TransactionList transactions={[...data.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} /></section>
          </>}

          {view === "allowance" && <AllowanceView data={data} onEdit={() => openModal({ kind: "allowance" })} onGive={giveAllowance} onReward={() => openModal({ kind: "reward" })} onActivity={() => setView("activity")} onGoals={() => setView("goals")} />}

          {view === "learn" && <>
            <section className="learn-hero"><div><span className="eyebrow">CURIOSITY EARNS STARS</span><h2>Money smarts,<br />one story at a time.</h2><p>Short, friendly lessons to help you make money choices that feel good.</p><button className="button button-lime" onClick={() => openLesson("needs-wants")}>Continue your lesson <ArrowRight size={16} /></button></div><div className="learn-hero-art"><span>✦</span><Mascot pose="think" label="Pip is thinking through a money lesson" className="learn-mascot" /><span>✳</span></div></section>
            <div className="learn-progress"><div className="progress-illustration">🎓</div><div className="learn-progress-copy"><span className="eyebrow">YOUR LEARNING JOURNEY</span><strong>{data.completedLessons.length} of {lessons.length} lessons complete</strong><div className="progress-track"><span style={{ width: `${data.completedLessons.length / lessons.length * 100}%` }} /></div></div><span className="xp-pill"><Star size={15} fill="currentColor" /> {data.xp} XP</span></div>
            <section className="lesson-list-section"><div className="section-heading"><div><span className="eyebrow">PICK A LITTLE LESSON</span><h3>Money school</h3></div><span className="lesson-time-note"><Clock3 size={14} /> All under 6 minutes</span></div><div className="lesson-grid">{lessons.map((lesson, index) => {
              const done = data.completedLessons.includes(lesson.id);
              return <article className={`lesson-card lesson-card-${index}`} key={lesson.id}><div className="lesson-card-top"><span className="lesson-emoji">{lesson.emoji}</span><span className={done ? "lesson-done" : "lesson-xp"}>{done ? <><Check size={13} /> Learned</> : `+${lesson.xp} XP`}</span></div><h3>{lesson.title}</h3><p>{lesson.detail}</p><div className="lesson-card-bottom"><span><Clock3 size={13} /> {lesson.minutes} min</span><button onClick={() => openLesson(lesson.id)}>{done ? "Review lesson" : "Start lesson"} <ArrowRight size={15} /></button></div></article>;
            })}</div></section>
          </>}

          {view === "challenges" && <>
            <section className="challenge-hero"><div><span className="eyebrow">SMALL PROMISES, BIG PROGRESS</span><h2>Look at you<br />showing up.</h2><p>One kind choice at a time. Complete a challenge to earn stars and grow your level.</p><div className="streak-pill"><span>✿</span> {data.streak} day learning streak</div></div><div className="challenge-hero-art"><span className="challenge-sun">☀</span><Mascot pose="celebrate" label="Pip celebrates every challenge" /></div></section>
            <section className="level-card"><div className="level-badge"><Star size={19} fill="currentColor" /></div><div className="level-info"><div className="level-label"><span>LEVEL {level} · LITTLE GROWER</span><strong>{levelProgress} <small>/ 150 XP</small></strong></div><div className="progress-track progress-track-lime"><span style={{ width: `${levelProgress / 150 * 100}%` }} /></div><small>{150 - levelProgress} more XP to reach level {level + 1}</small></div><div className="level-reward">🌟<span>Keep going!</span></div></section>
            <section className="challenge-list-section"><div className="section-heading"><div><span className="eyebrow">YOUR MINI MISSIONS</span><h3>Challenges &amp; rewards</h3></div><span className="challenge-count">{data.completedChallenges.length} / {challenges.length} complete</span></div><div className="challenge-grid">{challenges.map((challenge) => {
              const done = data.completedChallenges.includes(challenge.id);
              return <article key={challenge.id} className={`challenge-card${done ? " challenge-complete" : ""}`}><div className="challenge-card-head"><span className="challenge-emoji">{challenge.emoji}</span><span className="challenge-reward"><Star size={13} fill="currentColor" /> {challenge.reward} XP</span></div><h3>{challenge.title}</h3><p>{challenge.detail}</p><button disabled={done} className={done ? "button button-completed" : "button button-soft"} onClick={() => completeChallenge(challenge.id, challenge.reward)}>{done ? <><CheckCircle2 size={16} /> All done</> : <>Mark as done <ArrowRight size={15} /></>}</button></article>;
            })}</div></section>
            <section className="badge-shelf"><div><span className="eyebrow">YOUR BADGE SHELF</span><h3>Little things worth celebrating</h3></div><div className="badge-row"><span title="Your first savings goal">🌱</span><span title="You learned your first money lesson">🧠</span><span title="Kind saver">🐾</span><span className="badge-locked" title="More badges are waiting">＋</span></div></section>
          </>}

          {view === "profile" && <>
            <section className="profile-hero"><div className="profile-big-avatar"><Mascot pose={outfitPoses[data.avatar] ?? "happy"} label={`${data.childName}'s chosen Pip outfit`} /></div><div><span className="eyebrow">YOUR SPROUT PROFILE</span><h2>Hello, {data.childName}!</h2><p>Level {level} little grower · {data.streak} day streak</p></div><button className="button button-soft" onClick={() => { setView("splash"); }}>Replay the intro <Sparkles size={15} /></button></section>
            <div className="profile-layout"><form className="panel profile-form" onSubmit={handleProfileSave}><div className="section-heading"><div><span className="eyebrow">YOUR FAMILY</span><h3>Little details</h3></div><Mascot pose={outfitPoses[data.avatar] ?? "happy"} label="Your current Pip outfit" className="profile-form-mascot" /></div><label>Child’s name<input name="childName" defaultValue={data.childName} maxLength={24} required /></label><label>Grown-up’s name<input name="parentName" defaultValue={data.parentName} maxLength={24} required /></label><label>Choose Pip’s outfit<span className="avatar-picker">{outfits.map((outfit) => <button type="button" className={data.avatar === outfit.id ? "avatar-choice selected" : "avatar-choice"} key={outfit.id} onClick={() => commit({ ...data, avatar: outfit.id })} aria-label={`Choose ${outfit.name}`} title={outfit.name}><Mascot pose={outfit.pose} label="" /></button>)}</span></label><button className="button button-dark" type="submit">Save my details <Check size={15} /></button></form>
              <div className="profile-side"><section className="panel settings-panel"><div className="section-heading"><div><span className="eyebrow">GROWN-UP TOOLS</span><h3>Family spaces</h3></div><ShieldCheck size={19} /></div><button className="settings-row" onClick={() => changeRole("parent")}><span className="settings-row-icon"><CircleUserRound size={18} /></span><span><b>Parent dashboard</b><small>Allowance, requests and progress</small></span><ChevronRight size={18} /></button><button className="settings-row" onClick={() => { changeRole("parent"); setView("allowance"); }}><span className="settings-row-icon"><CalendarDays size={18} /></span><span><b>Pocket money plan</b><small>Set the weekly amount and day</small></span><ChevronRight size={18} /></button><button className="settings-row" onClick={() => setView("challenges")}><span className="settings-row-icon"><Trophy size={18} /></span><span><b>Challenges &amp; rewards</b><small>Your stars and badges</small></span><ChevronRight size={18} /></button></section>
                <section className="panel preferences-panel"><div className="section-heading"><div><span className="eyebrow">YOUR SETTINGS</span><h3>Preferences</h3></div><Settings size={18} /></div><button className="settings-row" onClick={() => { const next = !data.notifications; commit({ ...data, notifications: next }); showToast(next ? "Little reminders are on." : "Little reminders are off."); }}><span className="settings-row-icon"><Bell size={18} /></span><span><b>Friendly reminders</b><small>{data.notifications ? "On · a gentle nudge now and then" : "Off · enjoy the quiet"}</small></span><span className={`toggle-pill${data.notifications ? " toggle-on" : ""}`}><i /></span></button><button className="settings-row" onClick={() => { setOnboardingStep(0); setView("onboarding"); }}><span className="settings-row-icon"><CircleHelp size={18} /></span><span><b>How Sprout works</b><small>Take the quick tour again</small></span><ChevronRight size={18} /></button></section></div></div>
            <section className="account-card"><div className="account-icon"><LockKeyhole size={19} /></div><div><strong>{accountEmail || "Your demo account"}</strong><small>{userId ? "Connected to your Supabase family space" : "Demo garden · saved in this browser"}</small></div>{accountEmail ? <button onClick={signOut}><LogOut size={15} /> Sign out</button> : <button onClick={() => openAuth("signup")}>Create account <ArrowRight size={15} /></button>}</section>
          </>}

          {view === "splash" && <SplashScreen onStart={() => { setOnboardingStep(0); setView("onboarding"); }} onExplore={() => setView("home")} />}
          {view === "onboarding" && <OnboardingScreen step={onboardingStep} onStep={setOnboardingStep} onNext={() => onboardingStep === 2 ? openAuth("signup") : setOnboardingStep(onboardingStep + 1)} onBack={() => setOnboardingStep(Math.max(0, onboardingStep - 1))} onLogin={() => openAuth("login")} onExplore={() => setView("home")} />}
          {view === "auth" && <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={submitAuth} error={authError} onBack={() => setView("onboarding")} demoMode={!supabase} />}
        </div>
      </main>

      {!screen && <nav className="mobile-nav" aria-label="Mobile navigation">
        {[{ id: "home" as View, label: "Home", icon: House }, { id: "goals" as View, label: "Goals", icon: Target }, { id: "activity" as View, label: "Wallet", icon: Wallet }, { id: "challenges" as View, label: "Challenges", icon: Trophy }, { id: "profile" as View, label: "Profile", icon: CircleUserRound }].map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "mobile-nav-active" : ""} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></button>)}
      </nav>}

      {modal && <ActionModal modal={modal} data={data} title={formTitle} amount={formAmount} emoji={formEmoji} day={formDay} setTitle={setFormTitle} setAmount={setFormAmount} setEmoji={setFormEmoji} setDay={setFormDay} error={formError} onSubmit={handleModalSubmit} onClose={() => { setModal(null); setFormError(""); }} />}
      {activeLesson && <LessonModal lessonId={activeLesson} completed={lessonWasCompleted} choice={quizChoice} onAnswer={finishLesson} onClose={() => { setActiveLesson(null); setQuizChoice(null); }} />}
      <AnimatePresence>{toast && <motion.div className="toast-message" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Sparkles size={16} />{toast}</motion.div>}</AnimatePresence>
      {!ready && <div className="load-indicator" aria-hidden="true" />}
    </div>
  );
}

function GoalCard({ goal, compact = false, onAdd }: { goal: AppData["goals"][number]; compact?: boolean; onAdd: () => void }) {
  const progress = Math.min(100, Math.round(goal.saved / goal.target * 100));
  const title = goal.title.toLowerCase();
  const GoalIcon = /bike|cycle/.test(title) ? Bike : /game|console|gaming/.test(title) ? Gamepad2 : /school|book|suppl/.test(title) ? BookOpen : Star;
  return <article className={`goal-card goal-${goal.color}${compact ? " goal-card-compact" : ""}${progress >= 100 ? " goal-card-complete" : ""}`}>
    <div className="goal-card-head"><span className="goal-emoji"><GoalIcon size={27} strokeWidth={2.8} aria-hidden="true" /></span><span className="goal-percent">{progress}%</span></div>
    <h3>{goal.title}</h3><div className="goal-progress-track"><span style={{ width: `${progress}%` }} /></div>
    <div className="goal-card-values"><strong>{currency(goal.saved)} <small>saved</small></strong><span>of {currency(goal.target)}</span></div>
    <div className="goal-card-footer">{progress >= 100 ? <span className="goal-complete-label"><CheckCircle2 size={14} /> You did it!</span> : <span>{currency(goal.target - goal.saved)} to go</span>}<button disabled={progress >= 100} onClick={onAdd} aria-label={`Add money to ${goal.title}`}><Plus size={15} /> Add</button></div>
  </article>;
}

function TransactionList({ transactions }: { transactions: AppData["transactions"] }) {
  if (!transactions.length) return <div className="empty-state"><span>🌱</span><strong>Your money story starts here.</strong><p>When allowance, rewards and practice purchases happen, they’ll show up here.</p></div>;
  return <div className="transaction-list">{transactions.map((item) => <div className="transaction-row" key={item.id}><span className={`transaction-icon${item.direction === "in" ? " transaction-in" : " transaction-out"}`}>{item.direction === "in" ? <ArrowDownLeft size={17} /> : item.category === "Savings transfer" ? <Target size={16} /> : <CreditCard size={16} />}</span><span className="transaction-main"><strong>{item.title}</strong><small>{item.category} · {moneyDate(item.createdAt)}</small></span><strong className={item.direction === "in" ? "transaction-amount amount-in" : "transaction-amount"}>{item.direction === "in" ? "+" : "−"}{currency(item.amount)}</strong></div>)}</div>;
}

function ParentDashboard({ data, onGive, onReward, onEditAllowance, onResolve, onGoals, onActivity, onAllowance }: {
  data: AppData; onGive: () => void; onReward: () => void; onEditAllowance: () => void; onResolve: (id: string, approved: boolean) => void; onGoals: () => void; onActivity: () => void; onAllowance: () => void;
}) {
  const totalSaved = data.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const spend = data.transactions.filter((item) => item.direction === "out" && item.category !== "Savings transfer").reduce((sum, item) => sum + item.amount, 0);
  const categories = data.transactions.filter((item) => item.direction === "out" && item.category !== "Savings transfer").reduce<Record<string, number>>((sum, item) => ({ ...sum, [item.category]: (sum[item.category] ?? 0) + item.amount }), {});
  const categoryList = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return <>
      <section className="parent-welcome"><div><span className="eyebrow">A CLEAR VIEW, A CALMER MIND</span><h2>Growing together,<br /><span>one good habit at a time.</span></h2><p>Here’s a gentle overview of {data.childName}’s money garden.</p></div><div className="parent-family-badge"><Mascot pose={outfitPoses[data.avatar] ?? "happy"} label={`${data.childName}'s Pip outfit`} className="avatar-sm" /><div><strong>{data.childName}’s garden</strong><small>Child account · demo</small></div><CheckCircle2 size={19} /></div></section>
    <section className="parent-stats"><article><span className="parent-stat-icon parent-icon-green"><Wallet size={18} /></span><span>In their pocket</span><strong>{currency(data.balance)}</strong><small>Available pocket money</small></article><article><span className="parent-stat-icon parent-icon-lilac"><Target size={18} /></span><span>Growing in goals</span><strong>{currency(totalSaved)}</strong><small>{data.goals.length} goals in progress</small></article><article><span className="parent-stat-icon parent-icon-peach"><TrendingUp size={18} /></span><span>Recorded spending</span><strong>{currency(spend)}</strong><small>Since this demo began</small></article></section>
    <div className="parent-grid"><section className="panel allowance-control-panel"><div className="section-heading"><div><span className="eyebrow">A ROUTINE THEY CAN COUNT ON</span><h3>Weekly pocket money</h3></div><button className="icon-button quiet-button" aria-label="Edit allowance" onClick={onEditAllowance}><Settings size={17} /></button></div><div className="allowance-amount-row"><div><strong>{currency(data.allowance)}</strong><span>every {data.allowanceDay.toLowerCase()}</span></div><div className="allowance-calendar"><CalendarDays size={23} /><span>Next up</span><b>{data.allowanceDay}</b></div></div><div className="parent-allowance-actions"><button className="button button-dark" onClick={onGive}><Gift size={16} /> Give this week’s allowance</button><button className="button button-soft" onClick={onEditAllowance}>Edit schedule</button><button className="button button-soft" onClick={onReward}><Sparkles size={15} /> Give a reward</button></div><p className="fine-print">Demo only. Allowance and rewards update the practice balance and money log.</p></section>
      <section className="panel parent-spending-panel"><div className="section-heading"><div><span className="eyebrow">A CHANCE TO TALK, NOT TO JUDGE</span><h3>Spending snapshot</h3></div><button className="text-button" onClick={onActivity}>Money log <ArrowRight size={15} /></button></div>{categoryList.length ? <><div className="parent-spend-total">{currency(spend)} <span>recorded spending</span></div><div className="category-list">{categoryList.map(([name, amount]) => <div className="category-row" key={name}><span>{name}</span><div className="category-track"><i style={{ width: `${Math.max(5, amount / Math.max(spend, 1) * 100)}%` }} /></div><strong>{currency(amount)}</strong></div>)}</div></> : <div className="empty-state"><span>🧾</span><strong>No spending yet.</strong><p>Practice purchases will give you something to talk through together.</p></div>}</section></div>
    <div className="parent-grid parent-grid-lower"><section className="panel approval-panel"><div className="section-heading"><div><span className="eyebrow">KIND BOUNDARIES</span><h3>Needs your okay</h3></div><span className="request-count">{data.requests.length}</span></div>{data.requests.length ? <div className="request-list">{data.requests.map((request) => <div className="request-row" key={request.id}><span className="request-emoji">{request.emoji}</span><div><strong>{request.title}</strong><small>Requested by {data.childName} · {currency(request.amount)}</small></div><div className="request-actions"><button onClick={() => onResolve(request.id, true)} aria-label={`Approve ${request.title}`} title="Approve"><Check size={16} /></button><button onClick={() => onResolve(request.id, false)} aria-label={`Decline ${request.title}`} title="Decline"><X size={16} /></button></div></div>)}</div> : <div className="empty-inline"><CheckCircle2 size={18} /> All caught up. No requests waiting.</div>}</section>
      <section className="panel child-progress-panel"><div className="section-heading"><div><span className="eyebrow">NOTICE THE EFFORT</span><h3>Growing habits</h3></div><Sparkles size={18} /></div><div className="habit-row"><span>🌱</span><div><strong>{data.completedLessons.length} short lessons</strong><small>Financial literacy, at their pace</small></div><b>{data.completedLessons.length}/{lessons.length}</b></div><div className="habit-row"><span>⭐</span><div><strong>{data.xp} experience points</strong><small>Level {Math.floor(data.xp / 150) + 1} · little grower</small></div><button onClick={onGoals} aria-label="See savings goals"><ChevronRight size={18} /></button></div><div className="habit-row"><span>🎯</span><div><strong>{data.goals.length} personal goals</strong><small>A reason to keep practicing</small></div><button onClick={onGoals} aria-label="See savings goals"><ChevronRight size={18} /></button></div></section></div>
    <section className="parent-footer-actions"><div><span className="eyebrow">FAMILY MONEY TOOLS</span><strong>Build a steady little routine.</strong></div><button onClick={onAllowance}><CalendarDays size={16} /> Allowance plan</button><button onClick={onActivity}><ArrowDownLeft size={16} /> Full activity log</button></section>
  </>;
}

function AllowanceView({ data, onEdit, onGive, onReward, onActivity, onGoals }: { data: AppData; onEdit: () => void; onGive: () => void; onReward: () => void; onActivity: () => void; onGoals: () => void }) {
  const weekly = data.transactions.filter((item) => item.category === "Pocket money").slice(0, 5);
  return <>
    <section className="page-intro"><div><span className="eyebrow">STEADY, SIMPLE, PREDICTABLE</span><h2>Pocket money, planned.</h2><p>A regular allowance helps make everyday money choices easier to practice.</p></div><button className="button button-dark" onClick={onEdit}><Settings size={16} /> Edit plan</button></section>
    <section className="allowance-hero-card"><div className="allowance-hero-pattern" /><div className="allowance-hero-copy"><span className="allowance-hero-icon"><HandCoins size={21} /></span><span className="eyebrow">WEEKLY ALLOWANCE</span><strong>{currency(data.allowance)}</strong><p>Scheduled for every {data.allowanceDay.toLowerCase()}</p><div className="allowance-controls"><button className="button button-lime" onClick={onGive}><Gift size={16} /> Give this week’s allowance</button><button className="button button-soft" onClick={onReward}><Sparkles size={15} /> Give a reward</button></div></div><div className="allowance-hero-side"><div className="allowance-next"><CalendarDays size={20} /><span>Next allowance</span><strong>{data.allowanceDay}</strong><small>Practice transfer · demo only</small></div><div className="allowance-side-note"><span>🌿</span><p>A predictable routine gives kids a safe place to practice choosing, saving and waiting.</p></div></div></section>
    <div className="allowance-info-grid"><section className="panel allowance-history"><div className="section-heading"><div><span className="eyebrow">MONEY RECEIVED</span><h3>Allowance history</h3></div><button className="text-button" onClick={onActivity}>Full log <ArrowRight size={15} /></button></div>{weekly.length ? <TransactionList transactions={weekly} /> : <div className="empty-state"><span>📬</span><strong>No allowance added yet.</strong><p>When you give a practice allowance, it’ll show up here.</p></div>}</section><section className="panel allowance-guide"><span className="guide-illustration">🪴</span><span className="eyebrow">A GOOD PLACE TO START</span><h3>Save a little before spending.</h3><p>Try setting aside a small part of each allowance for a goal. The habit matters more than the amount.</p><button className="text-button" onClick={onGoals}>Explore savings goals <ArrowRight size={15} /></button></section></div>
  </>;
}

function SplashScreen({ onStart, onExplore }: { onStart: () => void; onExplore: () => void }) {
  return <section className="welcome-screen splash-screen"><div className="welcome-logo"><SproutMark /><span>sprout<span className="brand-period">.</span></span></div><div className="splash-content"><span className="splash-confetti splash-confetti-one">✳</span><span className="splash-confetti splash-confetti-two">✦</span><div className="splash-mascot-wrap"><span className="splash-orbit" /><Mascot pose="happy" label="Pip, your Sprout money buddy" /></div><span className="eyebrow">A LITTLE MONEY GARDEN</span><h2>Good money habits<br />start <em>small.</em></h2><p>Save for what matters. Learn as you go. Celebrate every little win.</p><div className="welcome-actions"><button className="button button-lime" onClick={onStart}>Get started <ArrowRight size={16} /></button><button className="hero-link" onClick={onExplore}>Explore the demo</button></div><span className="welcome-disclaimer">For learning and family practice · no real payments</span></div></section>;
}

function OnboardingScreen({ step, onStep, onNext, onBack, onLogin, onExplore }: { step: number; onStep: (step: number) => void; onNext: () => void; onBack: () => void; onLogin: () => void; onExplore: () => void }) {
  const slides = [
    { eyebrow: "MAKE A WISH, MAKE A PLAN", title: <>Big ideas<br />start small.</>, copy: "Pick a goal you love, then watch each little saving step add up.", pose: "happy" as const, color: "onboarding-orange", note: "Your goals grow with you." },
    { eyebrow: "LEARN BY TRYING", title: <>Money choices<br />made simple.</>, copy: "Short stories and tiny quizzes help every money idea click.", pose: "think" as const, color: "onboarding-green", note: "A new money smarts lesson." },
    { eyebrow: "EVERY LITTLE WIN COUNTS", title: <>Save, learn,<br />level up!</>, copy: "Celebrate your progress, collect badges and keep your family in the loop.", pose: "celebrate" as const, color: "onboarding-blue", note: "You earned a new badge!" },
  ];
  const slide = slides[step];
  return <section className={`welcome-screen onboarding-screen ${slide.color}`}>
    <div className="onboarding-top"><button className="brand-button" onClick={onExplore}><SproutMark /><span>sprout<span className="brand-period">.</span></span></button><button className="onboarding-skip" onClick={onExplore}>Skip</button></div>
    <motion.div className="onboarding-main" key={step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28 }}>
      <div className="onboarding-art"><div className="onboarding-orbit" /><div className="onboarding-sun">★</div><Mascot pose={slide.pose} label={`Pip: ${slide.note}`} className="onboarding-mascot" /><span className="onboarding-star onboarding-star-a">✦</span><span className="onboarding-star onboarding-star-b">✳</span><span className="onboarding-coin">✦</span><span className="onboarding-art-note">{slide.note}</span></div>
      <div className="onboarding-copy"><span className="eyebrow">{slide.eyebrow}</span><h2>{slide.title}</h2><p>{slide.copy}</p><div className="onboarding-pagination" aria-label={`Onboarding screen ${step + 1} of 3`}>{slides.map((item, index) => <button key={item.color} className={`pagination-dot${step === index ? " active" : ""}`} onClick={() => onStep(index)} aria-label={`Go to screen ${index + 1}`} aria-current={step === index ? "step" : undefined} />)}</div><div className="onboarding-actions"><button className="button button-dark" onClick={onNext}>{step === 2 ? "Create my family space" : "Next"} <ArrowRight size={17} /></button>{step > 0 && <button className="button button-back" onClick={onBack}><ArrowLeft size={16} /> Back</button>}</div><button className="onboarding-demo-link" onClick={onLogin}>Already have an account? Log in</button></div>
    </motion.div>
  </section>;
}

function Mascot({ pose, label, className = "" }: { pose: MascotPose; label: string; className?: string }) {
  return <span className={`mascot-sprite mascot-${pose} ${className}`} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={!label} />;
}

function AuthScreen({ mode, setMode, onSubmit, error, onBack, demoMode }: { mode: "login" | "signup"; setMode: (mode: "login" | "signup") => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string; onBack: () => void; demoMode: boolean }) {
  return <section className="auth-screen"><div className="auth-top"><button className="brand-button" onClick={onBack}><SproutMark /><span>sprout<span className="brand-period">.</span></span></button><span className="auth-note"><LockKeyhole size={13} /> Family-first by design</span></div><div className="auth-card"><div className="auth-card-art"><div className="auth-art-circle"><Mascot pose="encourage" label="Pip is ready to help your family" /></div><span>✦</span><small>{demoMode ? "YOUR PRIVATE DEMO GARDEN" : "YOUR FAMILY MONEY SPACE"}</small></div><div className="auth-form-side"><span className="eyebrow">{mode === "signup" ? "A FRESH LITTLE START" : "GOOD TO SEE YOU AGAIN"}</span><h2>{mode === "signup" ? "Let’s grow together." : "Welcome back."}</h2><p>{mode === "signup" ? "Create a space for your family to learn and practice." : "Sign in to pick up where your family left off."}</p><form className="auth-form" onSubmit={onSubmit}><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark auth-submit" type="submit">{mode === "signup" ? "Create family space" : "Log in"} <ArrowRight size={16} /></button></form><div className="auth-toggle">{mode === "signup" ? <>Already have an account? <button onClick={() => setMode("login")}>Log in</button></> : <>New to Sprout? <button onClick={() => setMode("signup")}>Create an account</button></>}</div>{demoMode && <div className="auth-demo-notice"><Sparkles size={15} /><span><b>Demo mode is on.</b> This sign-in stays on this device. No payment accounts are connected.</span></div>}</div></div><button className="auth-back" onClick={onBack}><ArrowLeft size={15} /> Back to welcome</button></section>;
}

function ActionModal({ modal, data, title, amount, emoji, day, setTitle, setAmount, setEmoji, setDay, error, onSubmit, onClose }: {
  modal: Exclude<ModalState, null>; data: AppData; title: string; amount: string; emoji: string; day: string;
  setTitle: (value: string) => void; setAmount: (value: string) => void; setEmoji: (value: string) => void; setDay: (value: string) => void;
  error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  const goal = modal.kind === "deposit" ? data.goals.find((item) => item.id === modal.goalId) : null;
  const details: Record<ModalState extends null ? never : Exclude<ModalState, null>["kind"], { eyebrow: string; heading: string; copy: string; button: string; icon: string }> = {
    goal: { eyebrow: "A NEW LITTLE DREAM", heading: "What are you saving for?", copy: "Pick something that makes you excited to save.", button: "Plant this goal", icon: "🌱" },
    deposit: { eyebrow: "A LITTLE STEP FORWARD", heading: `Add to ${goal?.title ?? "your goal"}`, copy: `You have ${currency(data.balance)} in your pocket to move into a goal.`, button: "Move to my goal", icon: goal?.emoji ?? "🎯" },
    allowance: { eyebrow: "MAKE IT A ROUTINE", heading: "Pocket money plan", copy: "Set the practice allowance and the day it usually arrives.", button: "Save the plan", icon: "🗓️" },
    spend: { eyebrow: "PRACTICE, THEN LEARN", heading: "Record a practice purchase", copy: "This changes your demo balance only. No payment will be made.", button: "Add to money log", icon: "🛍️" },
    reward: { eyebrow: "CELEBRATE THE EFFORT", heading: "Give a little reward", copy: "Add a practice reward to the money log. No real money moves.", button: "Give demo reward", icon: "🌟" },
  };
  const detail = details[modal.kind];
  return <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button><span className="modal-emoji">{detail.icon}</span><span className="eyebrow">{detail.eyebrow}</span><h2 id="modal-title">{detail.heading}</h2><p>{detail.copy}</p><form onSubmit={onSubmit} className="modal-form">
    {modal.kind === "goal" && <><label>Give your goal a name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={48} placeholder="A new bike, a book…" required /></label><div className="form-two-col"><label>Target amount<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={50} max={1000000} step={1} placeholder="2500" inputMode="numeric" required /></label><label>Choose a little icon<select value={emoji} onChange={(event) => setEmoji(event.target.value)}>{["🪴", "🛴", "🚀", "🎨", "🐾", "🎮", "📚", "🌈"].map((item) => <option key={item}>{item}</option>)}</select></label></div></>}
    {modal.kind === "deposit" && <label>How much would you like to save?<div className="amount-input-wrap"><span>₹</span><input autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={1} max={Math.min(data.balance, (goal?.target ?? 0) - (goal?.saved ?? 0))} step={1} placeholder="100" inputMode="numeric" required /></div></label>}
    {modal.kind === "allowance" && <><label>Weekly amount<input autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={0} max={100000} step={1} placeholder={String(data.allowance)} inputMode="numeric" required /></label><label>Usually arrives on<select value={day} onChange={(event) => setDay(event.target.value)}>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((item) => <option key={item}>{item}</option>)}</select></label></>}
    {modal.kind === "spend" && <><label>What was the practice purchase?<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={48} placeholder="A snack, a book…" required /></label><label>Amount<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={1} max={data.balance} step={1} placeholder="100" inputMode="numeric" required /></label></>}
    {modal.kind === "reward" && <><label>What are you celebrating?<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={48} placeholder="Finished a chore, helped out…" required /></label><label>Reward amount<input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min={1} max={100000} step={1} placeholder="50" inputMode="numeric" required /></label></>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark modal-submit" type="submit">{detail.button} <ArrowRight size={15} /></button>
  </form><span className="modal-safe-note"><LockKeyhole size={12} /> A practice change in Sprout’s demo garden</span></motion.section></div>;
}

function LessonModal({ lessonId, completed, choice, onAnswer, onClose }: { lessonId: string; completed: boolean; choice: number | null; onAnswer: (index: number) => void; onClose: () => void }) {
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0];
  const questions: Record<string, { question: string; answers: string[]; correct: number }> = {
    "needs-wants": { question: "You have money for one thing today. Which one is a want?", answers: ["A snack for your lunch", "A new game you’re excited about", "A notebook for school"], correct: 1 },
    "saving-plan": { question: "What can make a big savings goal feel easier?", answers: ["Save a small amount regularly", "Wait until you have lots of money", "Spend it first and see what’s left"], correct: 0 },
    "money-grows": { question: "Why can saving a little every week help?", answers: ["It means you never have to choose", "Money appears by itself", "Small amounts add up over time"], correct: 2 },
  };
  const quiz = questions[lessonId] ?? questions["needs-wants"];
  const correct = choice === quiz.correct;
  return <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section className="action-modal lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-title" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}><button className="modal-close" onClick={onClose} aria-label="Close lesson"><X size={18} /></button><span className="lesson-modal-icon">{lesson.emoji}</span><span className="eyebrow">{lesson.minutes} MINUTE MISSION · +{lesson.xp} XP</span><h2 id="lesson-title">{lesson.title}</h2><p className="quiz-question">{quiz.question}</p><div className="quiz-answers">{quiz.answers.map((answer, index) => <button key={answer} className={`quiz-answer${choice === index ? (index === quiz.correct ? " quiz-correct" : " quiz-wrong") : ""}`} onClick={() => onAnswer(index)}>{answer}<span>{choice === index ? index === quiz.correct ? <CheckCircle2 size={17} /> : <X size={17} /> : <ChevronRight size={17} />}</span></button>)}</div>{choice !== null && <div className={`quiz-feedback${correct ? " quiz-feedback-good" : ""}`} role="status">{correct ? completed ? "You’ve already earned these stars. Nice review!" : "That’s it! Smart money choices start with a little pause." : "Not quite. Give it another try — you’ve got this."}</div>}{correct && <button className="button button-dark modal-submit" onClick={onClose}>{completed ? "Back to lessons" : "Collect my stars"} <Star size={15} fill="currentColor" /></button>}</motion.section></div>;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  Award,
  Check,
  ClipboardCheck,
  ClipboardList,
  Crown,
  DoorOpen,
  Gavel,
  Info,
  KeyRound,
  Lock,
  LogIn,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

type Role = "admin" | "player";
type ChoreStatus = "bidding_open" | "assigned" | "pending_approval" | "completed";

type QuestUser = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: Role;
  points: number;
  createdAt: string;
};

type QuestBid = {
  playerId: string;
  amount: number;
  createdAt: string;
};

type QuestChore = {
  id: string;
  title: string;
  description: string;
  frequency: "daily" | "weekly" | "one-off";
  basePoints: number;
  status: ChoreStatus;
  assignedTo: string | null;
  finalPoints: number | null;
  createdAt: string;
  bids: QuestBid[];
};

type QuestState = {
  users: QuestUser[];
  chores: QuestChore[];
};

const STORAGE_KEY = "chorequest-static-state-v2";
const SESSION_KEY = "chorequest-static-session-v2";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "ChoreQuest#2026";

const defaultState: QuestState = {
  users: [
    {
      id: "admin-static",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      displayName: "Quest Master",
      role: "admin",
      points: 0,
      createdAt: "2026-05-29T00:00:00.000Z",
    },
    {
      id: "player-mika",
      username: "mika",
      password: "mika123",
      displayName: "Mika",
      role: "player",
      points: 220,
      createdAt: "2026-05-29T00:00:00.000Z",
    },
    {
      id: "player-ari",
      username: "ari",
      password: "ari123",
      displayName: "Ari",
      role: "player",
      points: 160,
      createdAt: "2026-05-29T00:00:00.000Z",
    },
  ],
  chores: [
    {
      id: "quest-kitchen",
      title: "Kitchen Reset",
      description: "Clear dishes, wipe benches, reset the sink, and take compost out.",
      frequency: "daily",
      basePoints: 90,
      status: "bidding_open",
      assignedTo: null,
      finalPoints: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      bids: [{ playerId: "player-ari", amount: 55, createdAt: "2026-05-29T00:00:00.000Z" }],
    },
    {
      id: "quest-laundry",
      title: "Laundry Raid",
      description: "Wash, dry, fold, and deliver one full shared load.",
      frequency: "weekly",
      basePoints: 130,
      status: "bidding_open",
      assignedTo: null,
      finalPoints: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      bids: [{ playerId: "player-mika", amount: 85, createdAt: "2026-05-29T00:00:00.000Z" }],
    },
    {
      id: "quest-vacuum",
      title: "Hallway Sweep",
      description: "Vacuum entry, hallway, and living room paths.",
      frequency: "weekly",
      basePoints: 100,
      status: "assigned",
      assignedTo: "player-mika",
      finalPoints: 70,
      createdAt: "2026-05-29T00:00:00.000Z",
      bids: [{ playerId: "player-mika", amount: 70, createdAt: "2026-05-29T00:00:00.000Z" }],
    },
  ],
};

function cloneDefaultState(): QuestState {
  return JSON.parse(JSON.stringify(defaultState)) as QuestState;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadStoredState(): QuestState {
  if (typeof window === "undefined") {
    return cloneDefaultState();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = cloneDefaultState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(stored) as QuestState;
  } catch {
    const seeded = cloneDefaultState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function Dashboard() {
  const [state, setState] = useState<QuestState>(() => cloneDefaultState());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [login, setLogin] = useState({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  const [newUser, setNewUser] = useState({ displayName: "", username: "", password: "" });
  const [newChore, setNewChore] = useState({
    title: "",
    description: "",
    frequency: "weekly" as QuestChore["frequency"],
    basePoints: "100",
  });
  const [draftBids, setDraftBids] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Admin login is prefilled for first setup.");
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedState = loadStoredState();
    setState(storedState);
    setActiveUserId(window.localStorage.getItem(SESSION_KEY));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    animate(stageRef.current.querySelectorAll(".motion-card"), {
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.98, 1],
      delay: stagger(70),
      duration: 560,
      ease: "outCubic",
    });

    animate(stageRef.current.querySelectorAll(".orbit-rune"), {
      rotate: "1turn",
      duration: 18000,
      loop: true,
      ease: "linear",
    });
  }, [activeUserId]);

  const activeUser = useMemo(
    () => state.users.find((user) => user.id === activeUserId) ?? null,
    [activeUserId, state.users],
  );
  const players = useMemo(() => state.users.filter((user) => user.role === "player"), [state.users]);
  const leaderboard = useMemo(
    () => [...players].sort((a, b) => b.points - a.points),
    [players],
  );
  const openChores = state.chores.filter((chore) => chore.status === "bidding_open");
  const activeChores = state.chores.filter((chore) => chore.status === "assigned");
  const pendingChores = state.chores.filter((chore) => chore.status === "pending_approval");
  const completedChores = state.chores.filter((chore) => chore.status === "completed");

  function saveSession(userId: string | null) {
    setActiveUserId(userId);
    if (!userId) {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    window.localStorage.setItem(SESSION_KEY, userId);
  }

  function handleLogin() {
    const user = state.users.find(
      (candidate) =>
        candidate.username.toLowerCase() === login.username.trim().toLowerCase() &&
        candidate.password === login.password,
    );

    if (!user) {
      setMessage("No matching username and password found.");
      return;
    }

    saveSession(user.id);
    setMessage(user.role === "admin" ? "Admin console unlocked." : `Welcome back, ${user.displayName}.`);
  }

  function handleLogout() {
    saveSession(null);
    setMessage("Signed out.");
  }

  function createUser() {
    if (!activeUser || activeUser.role !== "admin") {
      return;
    }

    const username = newUser.username.trim().toLowerCase();
    const displayName = newUser.displayName.trim();
    if (!displayName || !username || !newUser.password.trim()) {
      setMessage("Enter a display name, username, and first password.");
      return;
    }

    if (state.users.some((user) => user.username.toLowerCase() === username)) {
      setMessage("That username already exists.");
      return;
    }

    setState((current) => ({
      ...current,
      users: [
        ...current.users,
        {
          id: createId("player"),
          username,
          password: newUser.password,
          displayName,
          role: "player",
          points: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setNewUser({ displayName: "", username: "", password: "" });
    setMessage(`${displayName} can now log in with the password you set.`);
  }

  function createChore() {
    if (!activeUser || activeUser.role !== "admin") {
      return;
    }

    const basePoints = Number(newChore.basePoints);
    if (!newChore.title.trim() || !newChore.description.trim() || !Number.isFinite(basePoints) || basePoints <= 0) {
      setMessage("Enter a title, description, and positive point value.");
      return;
    }

    setState((current) => ({
      ...current,
      chores: [
        {
          id: createId("quest"),
          title: newChore.title.trim(),
          description: newChore.description.trim(),
          frequency: newChore.frequency,
          basePoints: Math.floor(basePoints),
          status: "bidding_open",
          assignedTo: null,
          finalPoints: null,
          bids: [],
          createdAt: new Date().toISOString(),
        },
        ...current.chores,
      ],
    }));
    setNewChore({ title: "", description: "", frequency: "weekly", basePoints: "100" });
    setMessage("New chore posted to the bidding board.");
  }

  function placeBid(choreId: string) {
    if (!activeUser || activeUser.role !== "player") {
      setMessage("Only players can bid on chores.");
      return;
    }

    const amount = Number(draftBids[choreId]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a positive bid amount.");
      return;
    }

    setState((current) => ({
      ...current,
      chores: current.chores.map((chore) => {
        if (chore.id !== choreId || chore.status !== "bidding_open") {
          return chore;
        }

        const bids = chore.bids.filter((bid) => bid.playerId !== activeUser.id);
        return {
          ...chore,
          bids: [...bids, { playerId: activeUser.id, amount: Math.floor(amount), createdAt: new Date().toISOString() }],
        };
      }),
    }));
    setDraftBids((current) => ({ ...current, [choreId]: "" }));
    setMessage("Bid locked in. Lowest bid wins when admin closes the quest.");
  }

  function closeBidding(choreId: string) {
    if (!activeUser || activeUser.role !== "admin") {
      return;
    }

    let winnerName = "";
    setState((current) => ({
      ...current,
      chores: current.chores.map((chore) => {
        if (chore.id !== choreId || chore.status !== "bidding_open") {
          return chore;
        }

        const winningBid = [...chore.bids].sort((a, b) => a.amount - b.amount || a.createdAt.localeCompare(b.createdAt))[0];
        if (!winningBid) {
          setMessage("This chore has no bids yet.");
          return chore;
        }

        winnerName = current.users.find((user) => user.id === winningBid.playerId)?.displayName ?? "Player";
        return {
          ...chore,
          status: "assigned",
          assignedTo: winningBid.playerId,
          finalPoints: winningBid.amount,
        };
      }),
    }));

    if (winnerName) {
      setMessage(`${winnerName} won the chore with the lowest bid.`);
    }
  }

  function submitForApproval(choreId: string) {
    if (!activeUser) {
      return;
    }

    setState((current) => ({
      ...current,
      chores: current.chores.map((chore) =>
        chore.id === choreId && chore.assignedTo === activeUser.id && chore.status === "assigned"
          ? { ...chore, status: "pending_approval" }
          : chore,
      ),
    }));
    setMessage("Chore submitted. Another player can approve it.");
  }

  function approveChore(choreId: string) {
    if (!activeUser || activeUser.role !== "player") {
      setMessage("Only another player can approve completed chores.");
      return;
    }

    let approved = false;
    setState((current) => {
      const target = current.chores.find((chore) => chore.id === choreId);
      if (!target || target.status !== "pending_approval" || target.assignedTo === activeUser.id || !target.assignedTo) {
        setMessage("The assignee cannot approve their own chore.");
        return current;
      }

      approved = true;
      const points = target.finalPoints ?? target.basePoints;
      return {
        users: current.users.map((user) =>
          user.id === target.assignedTo ? { ...user, points: user.points + points } : user,
        ),
        chores: current.chores.map((chore) =>
          chore.id === choreId ? { ...chore, status: "completed" } : chore,
        ),
      };
    });

    if (approved) {
      setMessage("Approved. Points have been awarded.");
    }
  }

  function resetDemo() {
    const seeded = cloneDefaultState();
    setState(seeded);
    saveSession(null);
    setMessage("Demo data reset. Admin login is ready again.");
  }

  return (
    <main ref={stageRef} className="min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(130deg,#151217_0%,#1b2630_38%,#1f1828_72%,#261d13_100%)]" />
      <div className="orbit-rune fixed left-[-9rem] top-[-8rem] -z-10 h-80 w-80 rounded-full border border-teal-300/15 bg-teal-300/10 blur-sm" />
      <div className="orbit-rune fixed bottom-[-10rem] right-[-7rem] -z-10 h-96 w-96 rounded-full border border-orange-300/15 bg-orange-300/10 blur-sm" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="motion-card grid gap-4 border-b border-white/10 pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-teal-200/20 bg-teal-200/10 px-3 text-xs font-black uppercase tracking-[0.2em] text-teal-100">
                <Sparkles className="h-4 w-4" aria-hidden />
                ChoreQuest
              </span>
              <Link
                href="/how-to"
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 text-xs font-bold text-slate-100 transition hover:bg-white/15"
              >
                <Info className="h-4 w-4" aria-hidden />
                How to use
              </Link>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal text-white sm:text-6xl">
              Turn housework into a live quest board.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Admins post chores, players underbid for the work, and completed quests are approved by another player before points are awarded.
            </p>
          </div>
          <SessionPanel
            activeUser={activeUser}
            login={login}
            setLogin={setLogin}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        </header>

        <div className="motion-card rounded-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-slate-200 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          {message}
        </div>

        <section className="grid gap-5 lg:grid-cols-[0.88fr_1.42fr]">
          <Leaderboard users={leaderboard} />
          <QuestBoard
            chores={openChores}
            users={state.users}
            activeUser={activeUser}
            draftBids={draftBids}
            setDraftBids={setDraftBids}
            onBid={placeBid}
            onClose={closeBidding}
          />
        </section>

        {activeUser?.role === "admin" ? (
          <AdminConsole
            newUser={newUser}
            setNewUser={setNewUser}
            newChore={newChore}
            setNewChore={setNewChore}
            users={players}
            onCreateUser={createUser}
            onCreateChore={createChore}
            onResetDemo={resetDemo}
          />
        ) : null}

        {activeUser ? (
          <section className="grid gap-5 lg:grid-cols-3">
            <QuestLane
              title="Active Quests"
              icon={<Swords className="h-5 w-5 text-teal-200" aria-hidden />}
              chores={activeChores.filter((chore) => activeUser.role === "admin" || chore.assignedTo === activeUser.id)}
              users={state.users}
              empty="No active quests."
              actionLabel="Submit"
              onAction={submitForApproval}
              canAct={(chore) => activeUser.role === "player" && chore.assignedTo === activeUser.id}
            />
            <QuestLane
              title="Approval Gate"
              icon={<ClipboardCheck className="h-5 w-5 text-orange-200" aria-hidden />}
              chores={pendingChores.filter((chore) => activeUser.role === "admin" || chore.assignedTo !== activeUser.id)}
              users={state.users}
              empty="No quests waiting."
              actionLabel="Approve"
              onAction={approveChore}
              canAct={(chore) => activeUser.role === "player" && chore.assignedTo !== activeUser.id}
            />
            <QuestLane
              title="Completed"
              icon={<Trophy className="h-5 w-5 text-yellow-200" aria-hidden />}
              chores={completedChores.slice(0, 5)}
              users={state.users}
              empty="No completed quests yet."
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SessionPanel({
  activeUser,
  login,
  setLogin,
  onLogin,
  onLogout,
}: {
  activeUser: QuestUser | null;
  login: { username: string; password: string };
  setLogin: (value: { username: string; password: string }) => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (activeUser) {
    return (
      <aside className="rounded-md border border-white/10 bg-[#101418]/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <Avatar user={activeUser} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{activeUser.displayName}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{activeUser.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15"
        >
          <DoorOpen className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </aside>
    );
  }

  return (
    <aside className="rounded-md border border-white/10 bg-[#101418]/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
        <Lock className="h-4 w-4 text-orange-200" aria-hidden />
        Static login
      </div>
      <div className="grid gap-2">
        <input
          value={login.username}
          onChange={(event) => setLogin({ ...login, username: event.target.value })}
          className="min-h-11 rounded-md border border-white/10 bg-white/[0.08] px-3 text-sm text-white outline-none transition focus:border-teal-200"
          placeholder="Username"
        />
        <input
          value={login.password}
          onChange={(event) => setLogin({ ...login, password: event.target.value })}
          type="password"
          className="min-h-11 rounded-md border border-white/10 bg-white/[0.08] px-3 text-sm text-white outline-none transition focus:border-teal-200"
          placeholder="Password"
        />
        <button
          onClick={onLogin}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-200 px-4 text-sm font-black text-[#101418] transition hover:bg-teal-100"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Enter
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Admin: `{ADMIN_USERNAME}` / `{ADMIN_PASSWORD}`
      </p>
    </aside>
  );
}

function Leaderboard({ users }: { users: QuestUser[] }) {
  return (
    <section className="motion-card rounded-md border border-white/10 bg-[#101418]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <PanelTitle icon={<Crown className="h-5 w-5 text-yellow-200" aria-hidden />} title="Hall of Points" />
      <div className="mt-4 space-y-3">
        {users.map((user, index) => (
          <article key={user.id} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.06] p-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-yellow-200 text-sm font-black text-[#1a1508]">
              {index + 1}
            </div>
            <Avatar user={user} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">{user.displayName}</h3>
              <p className="text-xs text-slate-400">@{user.username}</p>
            </div>
            <p className="text-xl font-black text-teal-100">{user.points}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuestBoard({
  chores,
  users,
  activeUser,
  draftBids,
  setDraftBids,
  onBid,
  onClose,
}: {
  chores: QuestChore[];
  users: QuestUser[];
  activeUser: QuestUser | null;
  draftBids: Record<string, string>;
  setDraftBids: (value: Record<string, string>) => void;
  onBid: (choreId: string) => void;
  onClose: (choreId: string) => void;
}) {
  return (
    <section className="motion-card rounded-md border border-white/10 bg-[#101418]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <PanelTitle icon={<Gavel className="h-5 w-5 text-orange-200" aria-hidden />} title="Bidding Arena" />
      <div className="mt-4 grid gap-3">
        {chores.length === 0 ? <EmptyState label="No open chores. Admin can post a new one." /> : null}
        {chores.map((chore) => {
          const lowestBid = chore.bids.length ? Math.min(...chore.bids.map((bid) => bid.amount)) : null;
          const leader = chore.bids.find((bid) => bid.amount === lowestBid);
          const leaderName = users.find((user) => user.id === leader?.playerId)?.displayName;

          return (
            <article key={chore.id} className="rounded-md border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-teal-200 px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#101418]">
                      {chore.frequency}
                    </span>
                    <span className="rounded border border-white/10 px-2 py-1 text-xs font-bold text-slate-300">
                      Base {chore.basePoints}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black tracking-normal text-white">{chore.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{chore.description}</p>
                </div>
                <div className="min-w-44 rounded-md border border-orange-200/20 bg-orange-200/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-100">Current low</p>
                  <p className="mt-1 text-3xl font-black text-white">{lowestBid ?? "No bid"}</p>
                  <p className="text-xs text-slate-400">{leaderName ? `Held by ${leaderName}` : "Be the first"}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  value={draftBids[chore.id] ?? ""}
                  onChange={(event) => setDraftBids({ ...draftBids, [chore.id]: event.target.value })}
                  disabled={activeUser?.role !== "player"}
                  min="1"
                  inputMode="numeric"
                  type="number"
                  placeholder="Your bid"
                  className="min-h-11 rounded-md border border-white/10 bg-[#101418]/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  onClick={() => onBid(chore.id)}
                  disabled={activeUser?.role !== "player"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-orange-300 px-4 text-sm font-black text-[#21160b] transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Award className="h-4 w-4" aria-hidden />
                  Bid
                </button>
                <button
                  onClick={() => onClose(chore.id)}
                  disabled={activeUser?.role !== "admin"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Close
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdminConsole({
  newUser,
  setNewUser,
  newChore,
  setNewChore,
  users,
  onCreateUser,
  onCreateChore,
  onResetDemo,
}: {
  newUser: { displayName: string; username: string; password: string };
  setNewUser: (value: { displayName: string; username: string; password: string }) => void;
  newChore: { title: string; description: string; frequency: QuestChore["frequency"]; basePoints: string };
  setNewChore: (value: { title: string; description: string; frequency: QuestChore["frequency"]; basePoints: string }) => void;
  users: QuestUser[];
  onCreateUser: () => void;
  onCreateChore: () => void;
  onResetDemo: () => void;
}) {
  return (
    <section className="motion-card grid gap-5 rounded-md border border-teal-200/20 bg-teal-200/[0.07] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] lg:grid-cols-[1fr_1fr_0.85fr]">
      <div>
        <PanelTitle icon={<UserPlus className="h-5 w-5 text-teal-200" aria-hidden />} title="Create Player" />
        <div className="mt-4 grid gap-2">
          <input className="field" placeholder="Display name" value={newUser.displayName} onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })} />
          <input className="field" placeholder="Username" value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} />
          <input className="field" placeholder="First password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
          <button onClick={onCreateUser} className="action-button bg-teal-200 text-[#101418] hover:bg-teal-100">
            <KeyRound className="h-4 w-4" aria-hidden />
            Add login
          </button>
        </div>
      </div>
      <div>
        <PanelTitle icon={<Plus className="h-5 w-5 text-orange-200" aria-hidden />} title="Post Chore" />
        <div className="mt-4 grid gap-2">
          <input className="field" placeholder="Chore title" value={newChore.title} onChange={(event) => setNewChore({ ...newChore, title: event.target.value })} />
          <input className="field" placeholder="Description" value={newChore.description} onChange={(event) => setNewChore({ ...newChore, description: event.target.value })} />
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
            <select className="field" value={newChore.frequency} onChange={(event) => setNewChore({ ...newChore, frequency: event.target.value as QuestChore["frequency"] })}>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="one-off">one-off</option>
            </select>
            <input className="field" placeholder="Points" value={newChore.basePoints} onChange={(event) => setNewChore({ ...newChore, basePoints: event.target.value })} />
          </div>
          <button onClick={onCreateChore} className="action-button bg-orange-300 text-[#21160b] hover:bg-orange-200">
            <ClipboardList className="h-4 w-4" aria-hidden />
            Publish
          </button>
        </div>
      </div>
      <div>
        <PanelTitle icon={<Users className="h-5 w-5 text-yellow-200" aria-hidden />} title="Players" />
        <div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.06] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{user.displayName}</p>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
              <p className="text-sm font-black text-teal-100">{user.points}</p>
            </div>
          ))}
        </div>
        <button onClick={onResetDemo} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15">
          Reset demo
        </button>
      </div>
    </section>
  );
}

function QuestLane({
  title,
  icon,
  chores,
  users,
  empty,
  actionLabel,
  onAction,
  canAct,
}: {
  title: string;
  icon: React.ReactNode;
  chores: QuestChore[];
  users: QuestUser[];
  empty: string;
  actionLabel?: string;
  onAction?: (choreId: string) => void;
  canAct?: (chore: QuestChore) => boolean;
}) {
  return (
    <section className="motion-card rounded-md border border-white/10 bg-[#101418]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <PanelTitle icon={icon} title={title} />
      <div className="mt-4 space-y-3">
        {chores.length === 0 ? <EmptyState label={empty} /> : null}
        {chores.map((chore) => {
          const assignee = users.find((user) => user.id === chore.assignedTo);
          return (
            <article key={chore.id} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
              <h3 className="font-black text-white">{chore.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-300">{chore.description}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {assignee?.displayName ?? "Unassigned"} | {chore.finalPoints ?? chore.basePoints} pts
              </p>
              {actionLabel && onAction && canAct?.(chore) ? (
                <button onClick={() => onAction(chore.id)} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-200 px-3 text-sm font-black text-[#101418] transition hover:bg-teal-100">
                  {actionLabel === "Approve" ? <Check className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                  {actionLabel}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-black tracking-normal text-white">{title}</h2>
    </div>
  );
}

function Avatar({ user }: { user: QuestUser }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-[linear-gradient(145deg,#2dd4bf,#f59e0b)] text-sm font-black text-[#101418]">
      {user.displayName.slice(0, 1).toUpperCase()}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/15 bg-white/[0.035] p-4 text-sm text-slate-400">
      {label}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { createPlayerAction } from "@/app/actions";
import { usernameToEmail } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ActiveChore, ChoreWithBid, Profile } from "@/types/database";

type ChoreFrequency = "daily" | "weekly" | "one-off";

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [chores, setChores] = useState<ChoreWithBid[]>([]);
  const [activeChores, setActiveChores] = useState<ActiveChore[]>([]);
  const [pendingChores, setPendingChores] = useState<ActiveChore[]>([]);
  const [completedChores, setCompletedChores] = useState<ActiveChore[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [login, setLogin] = useState({ username: "admin", password: "" });
  const [newUser, setNewUser] = useState({ displayName: "", username: "", password: "" });
  const [newChore, setNewChore] = useState({
    title: "",
    description: "",
    frequency: "weekly" as ChoreFrequency,
    basePoints: "100",
  });
  const [draftBids, setDraftBids] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(
    isSupabaseConfigured
      ? "Sign in with a Supabase Auth username and password."
      : "Add Supabase environment variables to enable database-backed login.",
  );
  const [isPending, startTransition] = useTransition();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = currentProfile?.role === "admin";
  const isPlayer = currentProfile?.role === "player";

  const leaderboard = useMemo(
    () => profiles.filter((profile) => profile.role === "player").sort((a, b) => b.total_points - a.total_points),
    [profiles],
  );

  const loadData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const [
      { data: sessionData, error: sessionError },
      { data: profileRows, error: profilesError },
      { data: biddingRows, error: biddingError },
      { data: assignedRows, error: assignedError },
      { data: pendingRows, error: pendingError },
      { data: completedRows, error: completedError },
    ] = await Promise.all([
      supabase.auth.getSession(),
      supabase.from("profiles").select("*").order("total_points", { ascending: false }),
      supabase
        .from("chores")
        .select("*, bids(bid_amount, player_id, created_at)")
        .eq("status", "bidding_open")
        .order("created_at", { ascending: false }),
      supabase
        .from("chores")
        .select("*, profiles:assigned_to(display_name, avatar_url, username)")
        .eq("status", "assigned")
        .order("created_at", { ascending: false }),
      supabase
        .from("chores")
        .select("*, profiles:assigned_to(display_name, avatar_url, username)")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false }),
      supabase
        .from("chores")
        .select("*, profiles:assigned_to(display_name, avatar_url, username)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const firstError = sessionError ?? profilesError ?? biddingError ?? assignedError ?? pendingError ?? completedError;
    if (firstError) {
      setMessage(firstError.message);
      return;
    }

    const loadedProfiles = (profileRows ?? []) as Profile[];
    const authUserId = sessionData.session?.user.id;
    setProfiles(loadedProfiles);
    setCurrentProfile(loadedProfiles.find((profile) => profile.id === authUserId) ?? null);
    setChores((biddingRows ?? []) as ChoreWithBid[]);
    setActiveChores((assignedRows ?? []) as ActiveChore[]);
    setPendingChores((pendingRows ?? []) as ActiveChore[]);
    setCompletedChores((completedRows ?? []) as ActiveChore[]);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    void loadData();

    const channel = client
      .channel("chorequest-live-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => void loadData())
      .subscribe();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      void loadData();
    });

    return () => {
      void client.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, [loadData]);

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
  }, [currentProfile?.id]);

  async function handleLogin() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const email = usernameToEmail(login.username);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: login.password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setLogin((current) => ({ ...current, password: "" }));
    setMessage("Signed in.");
    await loadData();
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setCurrentProfile(null);
    setMessage("Signed out.");
  }

  function createUser() {
    const client = supabase;
    if (!client || !currentProfile || !isAdmin) {
      return;
    }

    startTransition(async () => {
      const { data } = await client.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setMessage("Your admin session expired. Sign in again.");
        return;
      }

      const result = await createPlayerAction({
        accessToken,
        displayName: newUser.displayName,
        username: newUser.username,
        password: newUser.password,
      });

      setMessage(result.message);
      if (result.ok) {
        setNewUser({ displayName: "", username: "", password: "" });
        await loadData();
      }
    });
  }

  async function createChore() {
    if (!supabase || !isAdmin) {
      return;
    }

    const basePoints = Number(newChore.basePoints);
    if (!newChore.title.trim() || !newChore.description.trim() || !Number.isFinite(basePoints) || basePoints <= 0) {
      setMessage("Enter a title, description, and positive point value.");
      return;
    }

    const { error } = await supabase.from("chores").insert({
      title: newChore.title.trim(),
      description: newChore.description.trim(),
      frequency: newChore.frequency,
      base_points: Math.floor(basePoints),
      status: "bidding_open",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewChore({ title: "", description: "", frequency: "weekly", basePoints: "100" });
    setMessage("New chore posted to the bidding board.");
    await loadData();
  }

  async function placeBid(choreId: string) {
    if (!supabase || !currentProfile || !isPlayer) {
      setMessage("Only players can bid on chores.");
      return;
    }

    const amount = Number(draftBids[choreId]);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a positive bid amount.");
      return;
    }

    const { error } = await supabase.from("bids").upsert(
      {
        chore_id: choreId,
        player_id: currentProfile.id,
        bid_amount: Math.floor(amount),
      },
      { onConflict: "chore_id,player_id" },
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setDraftBids((current) => ({ ...current, [choreId]: "" }));
    setMessage("Bid locked in. Lowest bid wins when admin closes the quest.");
    await loadData();
  }

  async function closeBidding(choreId: string) {
    if (!supabase || !isAdmin) {
      return;
    }

    const { error } = await supabase.rpc("close_chore_bidding", { chore_uuid: choreId });
    setMessage(error ? error.message : "Bidding closed and the lowest bidder was assigned.");
    await loadData();
  }

  async function submitForApproval(choreId: string) {
    if (!supabase || !currentProfile) {
      return;
    }

    const { error } = await supabase
      .from("chores")
      .update({ status: "pending_approval" })
      .eq("id", choreId)
      .eq("assigned_to", currentProfile.id);

    setMessage(error ? error.message : "Chore submitted. Another player can approve it.");
    await loadData();
  }

  async function approveChore(choreId: string) {
    if (!supabase || !isPlayer) {
      setMessage("Only another player can approve completed chores.");
      return;
    }

    const { error } = await supabase.rpc("approve_chore", { chore_uuid: choreId });
    setMessage(error ? error.message : "Approved. Points have been awarded.");
    await loadData();
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
            activeUser={currentProfile}
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
            chores={chores}
            users={profiles}
            activeUser={currentProfile}
            draftBids={draftBids}
            setDraftBids={setDraftBids}
            onBid={placeBid}
            onClose={closeBidding}
          />
        </section>

        {isAdmin ? (
          <AdminConsole
            isPending={isPending}
            newUser={newUser}
            setNewUser={setNewUser}
            newChore={newChore}
            setNewChore={setNewChore}
            users={leaderboard}
            onCreateUser={createUser}
            onCreateChore={createChore}
          />
        ) : null}

        {currentProfile ? (
          <section className="grid gap-5 lg:grid-cols-3">
            <QuestLane
              title="Active Quests"
              icon={<Swords className="h-5 w-5 text-teal-200" aria-hidden />}
              chores={activeChores.filter((chore) => isAdmin || chore.assigned_to === currentProfile.id)}
              empty="No active quests."
              actionLabel="Submit"
              onAction={submitForApproval}
              canAct={(chore) => isPlayer && chore.assigned_to === currentProfile.id}
            />
            <QuestLane
              title="Approval Gate"
              icon={<ClipboardCheck className="h-5 w-5 text-orange-200" aria-hidden />}
              chores={pendingChores.filter((chore) => isAdmin || chore.assigned_to !== currentProfile.id)}
              empty="No quests waiting."
              actionLabel="Approve"
              onAction={approveChore}
              canAct={(chore) => isPlayer && chore.assigned_to !== currentProfile.id}
            />
            <QuestLane
              title="Completed"
              icon={<Trophy className="h-5 w-5 text-yellow-200" aria-hidden />}
              chores={completedChores}
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
  activeUser: Profile | null;
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
            <p className="truncate text-sm font-black text-white">{activeUser.display_name ?? activeUser.username ?? "Player"}</p>
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
        Supabase login
      </div>
      <div className="grid gap-2">
        <input
          value={login.username}
          onChange={(event) => setLogin({ ...login, username: event.target.value })}
          className="min-h-11 rounded-md border border-white/10 bg-white/[0.08] px-3 text-sm text-white outline-none transition focus:border-teal-200"
          placeholder="Username or email"
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
        Usernames are mapped to `username@chorequest.local` for Supabase Auth.
      </p>
    </aside>
  );
}

function Leaderboard({ users }: { users: Profile[] }) {
  return (
    <section className="motion-card rounded-md border border-white/10 bg-[#101418]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <PanelTitle icon={<Crown className="h-5 w-5 text-yellow-200" aria-hidden />} title="Hall of Points" />
      <div className="mt-4 space-y-3">
        {users.length === 0 ? <EmptyState label="No players yet. Admin can create the first one." /> : null}
        {users.map((user, index) => (
          <article key={user.id} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.06] p-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-yellow-200 text-sm font-black text-[#1a1508]">
              {index + 1}
            </div>
            <Avatar user={user} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">{user.display_name ?? user.username ?? "Player"}</h3>
              <p className="text-xs text-slate-400">@{user.username ?? "player"}</p>
            </div>
            <p className="text-xl font-black text-teal-100">{user.total_points}</p>
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
  chores: ChoreWithBid[];
  users: Profile[];
  activeUser: Profile | null;
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
          const lowestBid = chore.bids.length ? Math.min(...chore.bids.map((bid) => bid.bid_amount)) : null;
          const leader = chore.bids.find((bid) => bid.bid_amount === lowestBid);
          const leaderName = users.find((user) => user.id === leader?.player_id)?.display_name;

          return (
            <article key={chore.id} className="rounded-md border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-teal-200 px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#101418]">
                      {chore.frequency}
                    </span>
                    <span className="rounded border border-white/10 px-2 py-1 text-xs font-bold text-slate-300">
                      Base {chore.base_points}
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
  isPending,
  newUser,
  setNewUser,
  newChore,
  setNewChore,
  users,
  onCreateUser,
  onCreateChore,
}: {
  isPending: boolean;
  newUser: { displayName: string; username: string; password: string };
  setNewUser: (value: { displayName: string; username: string; password: string }) => void;
  newChore: { title: string; description: string; frequency: ChoreFrequency; basePoints: string };
  setNewChore: (value: { title: string; description: string; frequency: ChoreFrequency; basePoints: string }) => void;
  users: Profile[];
  onCreateUser: () => void;
  onCreateChore: () => void;
}) {
  return (
    <section className="motion-card grid gap-5 rounded-md border border-teal-200/20 bg-teal-200/[0.07] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] lg:grid-cols-[1fr_1fr_0.85fr]">
      <div>
        <PanelTitle icon={<UserPlus className="h-5 w-5 text-teal-200" aria-hidden />} title="Create Player" />
        <div className="mt-4 grid gap-2">
          <input className="field" placeholder="Display name" value={newUser.displayName} onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })} />
          <input className="field" placeholder="Username" value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} />
          <input className="field" placeholder="First password" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
          <button disabled={isPending} onClick={onCreateUser} className="action-button bg-teal-200 text-[#101418] hover:bg-teal-100 disabled:opacity-50">
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
            <select className="field" value={newChore.frequency} onChange={(event) => setNewChore({ ...newChore, frequency: event.target.value as ChoreFrequency })}>
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
                <p className="truncate text-sm font-bold text-white">{user.display_name ?? user.username}</p>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
              <p className="text-sm font-black text-teal-100">{user.total_points}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuestLane({
  title,
  icon,
  chores,
  empty,
  actionLabel,
  onAction,
  canAct,
}: {
  title: string;
  icon: React.ReactNode;
  chores: ActiveChore[];
  empty: string;
  actionLabel?: string;
  onAction?: (choreId: string) => void;
  canAct?: (chore: ActiveChore) => boolean;
}) {
  return (
    <section className="motion-card rounded-md border border-white/10 bg-[#101418]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <PanelTitle icon={icon} title={title} />
      <div className="mt-4 space-y-3">
        {chores.length === 0 ? <EmptyState label={empty} /> : null}
        {chores.map((chore) => (
          <article key={chore.id} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
            <h3 className="font-black text-white">{chore.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-300">{chore.description}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {chore.profiles?.display_name ?? chore.profiles?.username ?? "Unassigned"} | {chore.final_points ?? chore.base_points} pts
            </p>
            {actionLabel && onAction && canAct?.(chore) ? (
              <button onClick={() => onAction(chore.id)} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-200 px-3 text-sm font-black text-[#101418] transition hover:bg-teal-100">
                {actionLabel === "Approve" ? <Check className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                {actionLabel}
              </button>
            ) : null}
          </article>
        ))}
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

function Avatar({ user }: { user: Pick<Profile, "display_name" | "username"> }) {
  const name = user.display_name ?? user.username ?? "P";
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-[linear-gradient(145deg,#2dd4bf,#f59e0b)] text-sm font-black text-[#101418]">
      {name.slice(0, 1).toUpperCase()}
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

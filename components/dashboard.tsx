"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Award,
  Check,
  ClipboardList,
  Hammer,
  Loader2,
  LogIn,
  Send,
  Trophy,
  UserRound,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ActiveChore, ChoreWithBid, Profile } from "@/types/database";

const demoProfiles: Profile[] = [
  {
    id: "demo-1",
    display_name: "Mika",
    avatar_url: null,
    total_points: 240,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    display_name: "Ari",
    avatar_url: null,
    total_points: 180,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    display_name: "Noah",
    avatar_url: null,
    total_points: 155,
    created_at: new Date().toISOString(),
  },
];

const demoChores: ChoreWithBid[] = [
  {
    id: "demo-chore-1",
    title: "Reset kitchen counters",
    description: "Clear dishes, wipe benches, and take compost out.",
    frequency: "daily",
    base_points: 80,
    status: "bidding_open",
    assigned_to: null,
    final_points: null,
    created_at: new Date().toISOString(),
    bids: [{ bid_amount: 45, player_id: "demo-2" }],
  },
  {
    id: "demo-chore-2",
    title: "Laundry sprint",
    description: "Wash, dry, fold, and return one full load.",
    frequency: "weekly",
    base_points: 120,
    status: "bidding_open",
    assigned_to: null,
    final_points: null,
    created_at: new Date().toISOString(),
    bids: [{ bid_amount: 90, player_id: "demo-1" }],
  },
];

const demoActive: ActiveChore[] = [
  {
    id: "demo-active-1",
    title: "Vacuum shared spaces",
    description: "Living room, hallway, and entry.",
    frequency: "weekly",
    base_points: 100,
    status: "assigned",
    assigned_to: "demo-1",
    final_points: 70,
    created_at: new Date().toISOString(),
    profiles: { display_name: "Mika", avatar_url: null },
  },
];

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [chores, setChores] = useState<ChoreWithBid[]>(demoChores);
  const [activeChores, setActiveChores] = useState<ActiveChore[]>(demoActive);
  const [pendingChores, setPendingChores] = useState<ActiveChore[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState("demo-1");
  const [authPlayerId, setAuthPlayerId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const currentPlayer = useMemo(
    () => profiles.find((profile) => profile.id === currentPlayerId) ?? profiles[0],
    [currentPlayerId, profiles],
  );

  const loadData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const [
      { data: profileRows, error: profilesError },
      { data: biddingRows, error: biddingError },
      { data: assignedRows, error: assignedError },
      { data: pendingRows, error: pendingError },
      { data: authData, error: authError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("total_points", { ascending: false }),
      supabase
        .from("chores")
        .select("*, bids(bid_amount, player_id)")
        .eq("status", "bidding_open")
        .order("created_at", { ascending: false }),
      supabase
        .from("chores")
        .select("*, profiles:assigned_to(display_name, avatar_url)")
        .eq("status", "assigned")
        .order("created_at", { ascending: false }),
      supabase
        .from("chores")
        .select("*, profiles:assigned_to(display_name, avatar_url)")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);

    const firstError = profilesError ?? biddingError ?? assignedError ?? pendingError ?? authError;
    if (firstError) {
      setMessage(firstError.message);
      return;
    }

    const loadedProfiles = (profileRows ?? []) as Profile[];
    const loadedAuthPlayerId = authData.user?.id ?? null;
    setAuthPlayerId(loadedAuthPlayerId);
    setProfiles(loadedProfiles);
    setChores((biddingRows ?? []) as ChoreWithBid[]);
    setActiveChores((assignedRows ?? []) as ActiveChore[]);
    setPendingChores((pendingRows ?? []) as ActiveChore[]);
    setCurrentPlayerId((current) => {
      if (loadedAuthPlayerId && loadedProfiles.some((profile) => profile.id === loadedAuthPlayerId)) {
        return loadedAuthPlayerId;
      }

      return loadedProfiles.some((profile) => profile.id === current) ? current : loadedProfiles[0]?.id ?? "";
    });
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

  async function signIn() {
    if (!supabase || !email.trim()) {
      return;
    }

    setBusyAction("sign-in");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : "Check your inbox for the sign-in link.");
    setBusyAction(null);
  }

  async function placeBid(choreId: string, bidAmount: number) {
    if (!supabase || !currentPlayerId || !Number.isFinite(bidAmount) || bidAmount <= 0) {
      return;
    }

    setBusyAction(`bid-${choreId}`);
    const { error } = await supabase.from("bids").insert({
      chore_id: choreId,
      player_id: currentPlayerId,
      bid_amount: Math.floor(bidAmount),
    });
    setMessage(error ? error.message : "Bid placed.");
    setBusyAction(null);
  }

  async function closeBidding(choreId: string) {
    if (!supabase) {
      return;
    }

    setBusyAction(`close-${choreId}`);
    const { error } = await supabase.rpc("close_chore_bidding", { chore_uuid: choreId });
    setMessage(error ? error.message : "Bidding closed.");
    setBusyAction(null);
  }

  async function submitForVerification(choreId: string) {
    if (!supabase) {
      return;
    }

    setBusyAction(`submit-${choreId}`);
    const { error } = await supabase
      .from("chores")
      .update({ status: "pending_approval" })
      .eq("id", choreId)
      .eq("assigned_to", currentPlayerId);
    setMessage(error ? error.message : "Chore submitted for verification.");
    setBusyAction(null);
  }

  async function approveChore(choreId: string) {
    if (!supabase) {
      return;
    }

    setBusyAction(`approve-${choreId}`);
    const { error } = await supabase.rpc("approve_chore", { chore_uuid: choreId });
    setMessage(error ? error.message : "Chore approved.");
    setBusyAction(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-glow sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint">ChoreQuest</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-white sm:text-4xl">
            Household chores, lowest bid wins.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlayerSelect
            disabled={Boolean(isSupabaseConfigured && authPlayerId)}
            profiles={profiles}
            value={currentPlayer?.id ?? ""}
            onChange={setCurrentPlayerId}
          />
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-ink/80 px-3 text-sm text-slate-200">
            <Award className="h-4 w-4 text-ember" aria-hidden />
            {currentPlayer?.total_points ?? 0} pts
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : (
        <section className="rounded-lg border border-white/10 bg-ink/70 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="player@email.com"
              className="min-h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-white outline-none transition focus:border-mint"
            />
            <button
              onClick={signIn}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-bold text-ink transition hover:bg-teal-300"
            >
              {busyAction === "sign-in" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
              Sign in
            </button>
          </div>
        </section>
      )}

      {message ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-200">{message}</div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.35fr]">
        <Leaderboard profiles={profiles} />
        <BiddingArena
          chores={chores}
          busyAction={busyAction}
          onPlaceBid={placeBid}
          onCloseBidding={closeBidding}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChorePanel
          title="Active Chores"
          icon={<Hammer className="h-5 w-5 text-mint" aria-hidden />}
          chores={activeChores.filter((chore) => !currentPlayerId || chore.assigned_to === currentPlayerId)}
          empty="No active chores assigned."
          actionLabel="Submit"
          actionIcon={<Send className="h-4 w-4" aria-hidden />}
          busyAction={busyAction}
          busyPrefix="submit"
          onAction={submitForVerification}
        />
        <ChorePanel
          title="Approval Queue"
          icon={<ClipboardList className="h-5 w-5 text-ember" aria-hidden />}
          chores={pendingChores.filter((chore) => chore.assigned_to !== currentPlayerId)}
          empty="Nothing is waiting for approval."
          actionLabel="Approve"
          actionIcon={<Check className="h-4 w-4" aria-hidden />}
          busyAction={busyAction}
          busyPrefix="approve"
          onAction={approveChore}
        />
      </section>
    </main>
  );
}

function SetupNotice() {
  return (
    <section className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
      Supabase is not configured yet. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` or Vercel to switch from demo data to live data.
    </section>
  );
}

function PlayerSelect({
  disabled,
  profiles,
  value,
  onChange,
}: {
  disabled?: boolean;
  profiles: Profile[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-ink/80 px-3 text-sm text-slate-200">
      <UserRound className="h-4 w-4 text-mint" aria-hidden />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="bg-transparent text-white outline-none disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label="Current player"
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id} className="bg-ink text-white">
            {profile.display_name ?? "Player"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Leaderboard({ profiles }: { profiles: Profile[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-glow">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-ember" aria-hidden />
        <h2 className="text-xl font-bold text-white">Leaderboard</h2>
      </div>
      <div className="space-y-3">
        {profiles.map((profile, index) => (
          <article key={profile.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink/70 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mint/15 text-sm font-bold text-mint">
              {index + 1}
            </div>
            <Avatar profile={profile} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-white">{profile.display_name ?? "Player"}</h3>
              <p className="text-xs text-slate-400">Current balance</p>
            </div>
            <p className="text-lg font-black text-white">{profile.total_points}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BiddingArena({
  chores,
  busyAction,
  onPlaceBid,
  onCloseBidding,
}: {
  chores: ChoreWithBid[];
  busyAction: string | null;
  onPlaceBid: (choreId: string, bidAmount: number) => void;
  onCloseBidding: (choreId: string) => void;
}) {
  const [draftBids, setDraftBids] = useState<Record<string, string>>({});

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-glow">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-mint" aria-hidden />
        <h2 className="text-xl font-bold text-white">Bidding Arena</h2>
      </div>
      <div className="grid gap-3">
        {chores.length === 0 ? <EmptyState label="No chores are open for bidding." /> : null}
        {chores.map((chore) => {
          const lowestBid = chore.bids.length > 0 ? Math.min(...chore.bids.map((bid) => bid.bid_amount)) : null;
          const draft = draftBids[chore.id] ?? "";

          return (
            <article key={chore.id} className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">{chore.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{chore.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-white/10 px-2 py-1 text-slate-200">{chore.frequency}</span>
                    <span className="rounded-md bg-ember/15 px-2 py-1 text-orange-200">Base {chore.base_points}</span>
                    <span className="rounded-md bg-mint/15 px-2 py-1 text-teal-100">
                      Lowest {lowestBid ?? "none"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onCloseBidding(chore.id)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm font-bold text-white transition hover:bg-white/[0.12]"
                >
                  {busyAction === `close-${chore.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                  Close
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={draft}
                  onChange={(event) => setDraftBids((current) => ({ ...current, [chore.id]: event.target.value }))}
                  min="1"
                  inputMode="numeric"
                  type="number"
                  placeholder="Bid points"
                  className="min-h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-white outline-none transition focus:border-mint"
                />
                <button
                  onClick={() => {
                    onPlaceBid(chore.id, Number(draft));
                    setDraftBids((current) => ({ ...current, [chore.id]: "" }));
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ember px-4 text-sm font-bold text-white transition hover:bg-orange-500"
                >
                  {busyAction === `bid-${chore.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Award className="h-4 w-4" aria-hidden />}
                  Bid
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ChorePanel({
  title,
  icon,
  chores,
  empty,
  actionLabel,
  actionIcon,
  busyAction,
  busyPrefix,
  onAction,
}: {
  title: string;
  icon: ReactNode;
  chores: ActiveChore[];
  empty: string;
  actionLabel: string;
  actionIcon: ReactNode;
  busyAction: string | null;
  busyPrefix: string;
  onAction: (choreId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-glow">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3">
        {chores.length === 0 ? <EmptyState label={empty} /> : null}
        {chores.map((chore) => (
          <article key={chore.id} className="rounded-lg border border-white/10 bg-ink/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">{chore.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{chore.description}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Assigned to {chore.profiles?.display_name ?? "player"} for {chore.final_points ?? chore.base_points} pts
                </p>
              </div>
              <button
                onClick={() => onAction(chore.id)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-mint px-3 text-sm font-bold text-ink transition hover:bg-teal-300"
              >
                {busyAction === `${busyPrefix}-${chore.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : actionIcon}
                {actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-sm font-bold text-white">
      {(profile.display_name ?? "P").slice(0, 1).toUpperCase()}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-400">
      {label}
    </div>
  );
}

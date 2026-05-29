import {
  Award,
  CheckCircle2,
  Gavel,
  Home,
  KeyRound,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

const adminSteps = [
  {
    title: "Log in as admin",
    text: "Use admin and ChoreQuest#2026 on the main page.",
    icon: <KeyRound className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Create players",
    text: "Add each player with a username and first password. They use those details on their first login.",
    icon: <UserPlus className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Post chores",
    text: "Create a title, description, frequency, and base point value. New chores open for bidding immediately.",
    icon: <ShieldCheck className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Close bidding",
    text: "When bids are in, close the chore. The lowest bid is assigned as the winning player and final point value.",
    icon: <Gavel className="h-5 w-5" aria-hidden />,
  },
];

const playerSteps = [
  {
    title: "Bid low",
    text: "Players enter the number of points they are willing to complete the chore for. Lower bids beat higher bids.",
    icon: <Award className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Finish assigned chores",
    text: "The winning player sees the chore in Active Quests and submits it when complete.",
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Approve someone else",
    text: "A different player approves the submitted chore. The assignee cannot approve their own work.",
    icon: <ShieldCheck className="h-5 w-5" aria-hidden />,
  },
];

export default function HowToPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(130deg,#151217_0%,#1b2630_42%,#261d13_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15"
        >
          <Home className="h-4 w-4" aria-hidden />
          Back to app
        </Link>

        <section className="mt-8 border-b border-white/10 pb-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-100">How ChoreQuest Works</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-normal sm:text-6xl">
            Post chores, bid for work, verify completion.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            This version uses static browser storage for a local household demo. It is fast to try, but it is not a secure authentication system.
          </p>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <GuidePanel title="Admin Flow" items={adminSteps} />
          <GuidePanel title="Player Flow" items={playerSteps} />
        </section>

        <section className="mt-5 rounded-md border border-orange-200/20 bg-orange-200/10 p-5">
          <h2 className="text-xl font-black">Default credentials</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
            <Credential label="Admin" value="admin / ChoreQuest#2026" />
            <Credential label="Demo player" value="mika / mika123" />
            <Credential label="Demo player" value="ari / ari123" />
          </div>
        </section>
      </div>
    </main>
  );
}

function GuidePanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; text: string; icon: React.ReactNode }>;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-[#101418]/75 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.title} className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-white/10 bg-white/[0.06] p-4">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-200 text-[#101418]">{item.icon}</div>
            <div>
              <h3 className="font-black">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-300">{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#101418]/70 p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-sm text-white">{value}</p>
    </div>
  );
}

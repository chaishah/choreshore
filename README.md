# ChoreQuest

A gamified chore bidding dashboard built with Next.js, Tailwind CSS, and Supabase.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Add your Supabase values to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Database

Run [supabase/migrations/001_chorequest_schema.sql](supabase/migrations/001_chorequest_schema.sql) in the Supabase SQL editor. It creates:

- `profiles`
- `chores`
- `bids`
- `close_chore_bidding(chore_uuid)`
- `approve_chore(chore_uuid)`

## Deploy

Create a Vercel project from this repository and set the same Supabase environment variables in the Vercel dashboard.

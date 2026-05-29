# ChoreQuest

A gamified chore bidding dashboard built with Next.js, Tailwind CSS, Anime.js, and Supabase.

The app now uses Supabase Auth password login, profile roles, row-level security, and a server-side admin action for creating player accounts.

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
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Database

Run these migrations in the Supabase SQL editor:

1. [supabase/migrations/001_chorequest_schema.sql](supabase/migrations/001_chorequest_schema.sql)
2. [supabase/migrations/002_roles_password_auth_policies.sql](supabase/migrations/002_roles_password_auth_policies.sql)

They create:

- `profiles`
- `chores`
- `bids`
- `profiles.role` for `admin` and `player`
- admin-only chore creation policies
- player-only bidding and approval policies
- `close_chore_bidding(chore_uuid)`
- `approve_chore(chore_uuid)`

## Bootstrap Admin

Supabase Auth users must be created through Auth, not raw table inserts.

1. In Supabase Dashboard, create an Auth user:

```text
email: admin@chorequest.local
password: choose-a-secure-password
email confirmed: true
```

2. Run this SQL after the user exists:

```sql
update public.profiles
set role = 'admin',
    username = 'admin',
    display_name = 'Quest Master'
where id = (
  select id
  from auth.users
  where email = 'admin@chorequest.local'
);
```

3. Log in to the app with:

```text
username: admin
password: the password you chose
```

The admin console can then create player usernames and first passwords. Usernames are mapped to Supabase Auth emails as `username@chorequest.local`.

## Deploy

Create a Vercel project from this repository and set the same Supabase environment variables in the Vercel dashboard. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only; never expose it with a `NEXT_PUBLIC_` prefix.

You are an expert full-stack developer specializing in Next.js (App Router), Tailwind CSS, and Supabase. Your task is to generate the code for a gamified, responsive web application called "ChoreQuest" that transforms household chores into a fun, point-based bidding competition. 

The application must be architected for an incredibly easy deployment on Vercel, utilizing Supabase (PostgreSQL) for authentication and cloud data storage.

---

### ## Database Schema & Architecture (Supabase)
Please provide the PostgreSQL schema creation SQL script along with the application code. The schema must support:

1. **profiles** (or players)
   - `id`: uuid (references auth.users, primary key)
   - `display_name`: text
   - `avatar_url`: text
   - `total_points`: integer (default 0)
   - `created_at`: timestamp

2. **chores**
   - `id`: uuid (primary key)
   - `title`: text
   - `description`: text
   - `frequency`: text (e.g., 'daily', 'weekly', 'one-off')
   - `base_points`: integer
   - `status`: text (e.g., 'unassigned', 'bidding_open', 'assigned', 'completed', 'pending_approval')
   - `assigned_to`: uuid (references profiles.id, nullable)
   - `final_points`: integer (the winning bid amount, nullable)
   - `created_at`: timestamp

3. **bids**
   - `id`: uuid (primary key)
   - `chore_id`: uuid (references chores.id, cascade on delete)
   - `player_id`: uuid (references profiles.id)
   - `bid_amount`: integer
   - `created_at`: timestamp

---

### ## Core Features Required

#### 1. Player Profiles & Leaderboard
- A dynamic leaderboard component that ranks players instantly based on `profiles.total_points`.
- Display player avatars, names, and current balances.

#### 2. The Chore Bidding Arena
- A view showing all chores where `status = 'bidding_open'`.
- Players can input a numeric bid. The UI should display the current lowest bid for that chore.
- An admin/creator mechanism to "Close Bidding". This function must:
  - Find the lowest bid in the `bids` table for that `chore_id`.
  - Update the chore's `status` to 'assigned', set `assigned_to` to the winning player's ID, and set `final_points` to their bid amount.

#### 3. Chore Execution & Approval
- An "Active Chores" panel for the logged-in player.
- A button to "Submit for Verification" which flips the status to `pending_approval`.
- An approval dashboard where *other* players can approve the chore. Upon approval, trigger a transaction or Supabase RPC function that increments the assignee's `total_points` by the chore's `final_points` and marks the chore as `completed`.

---

### ## Technical Stack & Vercel Deployment Constraints
- **Framework:** Next.js (App Router) using TypeScript.
- **Database Client:** `@supabase/supabase-js` or `@supabase/ssr`.
- **Environment Variables:** Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Read them via standard environment variables so they can be easily plugged into Vercel's deployment dashboard.
- **Styling:** Tailwind CSS. Clean, responsive, dark-mode-friendly gamified dashboard.
- **Strict Constraint:** Do not include any non-breaking space characters (`&nbsp;` or hidden Unicode spaces) anywhere in the text elements of the code.

Please provide a clean file structure, the database migration SQL, and the core code for the Supabase client initialization, the real-time Dashboard, and the Bidding Arena component.
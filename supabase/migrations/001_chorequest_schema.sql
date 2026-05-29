create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  total_points integer not null default 0 check (total_points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'one-off')),
  base_points integer not null check (base_points > 0),
  status text not null default 'bidding_open' check (status in ('unassigned', 'bidding_open', 'assigned', 'pending_approval', 'completed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  final_points integer check (final_points is null or final_points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  bid_amount integer not null check (bid_amount > 0),
  created_at timestamptz not null default now(),
  unique (chore_id, player_id)
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.close_chore_bidding(chore_uuid uuid)
returns public.chores
language plpgsql
security definer
set search_path = public
as $$
declare
  winning_bid public.bids%rowtype;
  updated_chore public.chores%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into winning_bid
  from public.bids
  where chore_id = chore_uuid
  order by bid_amount asc, created_at asc
  limit 1;

  if winning_bid.id is null then
    raise exception 'No bids found for chore';
  end if;

  update public.chores
  set status = 'assigned',
      assigned_to = winning_bid.player_id,
      final_points = winning_bid.bid_amount
  where id = chore_uuid
    and status = 'bidding_open'
  returning * into updated_chore;

  if updated_chore.id is null then
    raise exception 'Chore is not open for bidding';
  end if;

  return updated_chore;
end;
$$;

create or replace function public.approve_chore(chore_uuid uuid)
returns public.chores
language plpgsql
security definer
set search_path = public
as $$
declare
  target_chore public.chores%rowtype;
  updated_chore public.chores%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_chore
  from public.chores
  where id = chore_uuid
  for update;

  if target_chore.id is null then
    raise exception 'Chore not found';
  end if;

  if target_chore.status <> 'pending_approval' then
    raise exception 'Chore is not pending approval';
  end if;

  if target_chore.assigned_to = auth.uid() then
    raise exception 'Assignee cannot approve their own chore';
  end if;

  update public.profiles
  set total_points = total_points + coalesce(target_chore.final_points, target_chore.base_points)
  where id = target_chore.assigned_to;

  update public.chores
  set status = 'completed'
  where id = chore_uuid
  returning * into updated_chore;

  return updated_chore;
end;
$$;

alter table public.profiles enable row level security;
alter table public.chores enable row level security;
alter table public.bids enable row level security;

create policy "Profiles are readable by everyone"
  on public.profiles for select
  using (true);

create policy "Players can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Chores are readable by everyone"
  on public.chores for select
  using (true);

create policy "Authenticated players can create chores"
  on public.chores for insert
  with check (auth.uid() is not null);

create policy "Assignees can submit assigned chores"
  on public.chores for update
  using (auth.uid() = assigned_to and status = 'assigned')
  with check (auth.uid() = assigned_to and status = 'pending_approval');

create policy "Bids are readable by everyone"
  on public.bids for select
  using (true);

create policy "Authenticated players can bid on open chores"
  on public.bids for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1
      from public.chores
      where chores.id = chore_id
        and chores.status = 'bidding_open'
    )
  );

create policy "Players can update their own bids while bidding is open"
  on public.bids for update
  using (auth.uid() = player_id)
  with check (
    auth.uid() = player_id
    and exists (
      select 1
      from public.chores
      where chores.id = chore_id
        and chores.status = 'bidding_open'
    )
  );

insert into public.chores (title, description, frequency, base_points, status)
values
  ('Reset kitchen counters', 'Clear dishes, wipe benches, and take compost out.', 'daily', 80, 'bidding_open'),
  ('Laundry sprint', 'Wash, dry, fold, and return one full load.', 'weekly', 120, 'bidding_open'),
  ('Bathroom reset', 'Sink, mirror, toilet, and floor.', 'weekly', 140, 'bidding_open')
on conflict do nothing;

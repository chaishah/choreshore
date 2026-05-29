alter table public.profiles
  add column if not exists username text,
  add column if not exists role text not null default 'player' check (role in ('admin', 'player'));

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.is_admin(user_uuid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_uuid
      and role = 'admin'
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'player');

  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    case when requested_role = 'admin' then 'admin' else 'player' end
  )
  on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url;

  return new;
end;
$$;

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
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can close bidding';
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

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'player'
  ) then
    raise exception 'Only players can approve chores';
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

drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Players can update their own profile" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Chores are readable by everyone" on public.chores;
drop policy if exists "Authenticated players can create chores" on public.chores;
drop policy if exists "Admins can create chores" on public.chores;
drop policy if exists "Assignees can submit assigned chores" on public.chores;
drop policy if exists "Bids are readable by everyone" on public.bids;
drop policy if exists "Authenticated players can bid on open chores" on public.bids;
drop policy if exists "Players can update their own bids while bidding is open" on public.bids;

create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Chores are readable by authenticated users"
  on public.chores for select
  using (auth.uid() is not null);

create policy "Admins can create chores"
  on public.chores for insert
  with check (public.is_admin(auth.uid()));

create policy "Assignees can submit assigned chores"
  on public.chores for update
  using (auth.uid() = assigned_to and status = 'assigned')
  with check (auth.uid() = assigned_to and status = 'pending_approval');

create policy "Bids are readable by authenticated users"
  on public.bids for select
  using (auth.uid() is not null);

create policy "Players can bid on open chores"
  on public.bids for insert
  with check (
    auth.uid() = player_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'player'
    )
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
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'player'
    )
    and exists (
      select 1
      from public.chores
      where chores.id = chore_id
        and chores.status = 'bidding_open'
    )
  );

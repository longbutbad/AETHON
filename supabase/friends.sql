-- Friends. Run once in the Supabase SQL editor.
-- A friendship is a request from requester -> addressee that becomes 'accepted'.

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid references auth.users(id) on delete cascade,
  addressee_id  uuid references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- Either party can see the friendship.
drop policy if exists "View own friendships" on public.friendships;
create policy "View own friendships" on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- You can only send a request as yourself.
drop policy if exists "Send friend request" on public.friendships;
create policy "Send friend request" on public.friendships for insert
  with check (requester_id = auth.uid());

-- Only the addressee can accept (update) a request.
drop policy if exists "Respond to friend request" on public.friendships;
create policy "Respond to friend request" on public.friendships for update
  using (addressee_id = auth.uid());

-- Either party can remove / reject / cancel.
drop policy if exists "Remove friendship" on public.friendships;
create policy "Remove friendship" on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Communities (Discord-style servers). Run once in the Supabase SQL editor,
-- after setup.sql. Channels reuse the existing conversations/messages tables so
-- realtime chat works with no extra plumbing — a channel is just a group
-- conversation with a community_id.

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz default now(),
  primary key (community_id, user_id)
);

-- A channel = a group conversation tied to a community.
alter table public.conversations
  add column if not exists community_id uuid references public.communities(id) on delete cascade;

alter table public.communities       enable row level security;
alter table public.community_members enable row level security;

-- ── Helper (avoids RLS self-recursion) ───────────────────────────────────────
create or replace function public.is_community_member(p_community_id uuid, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community_id and user_id = p_user_id
  );
$$;

-- ── Policies ─────────────────────────────────────────────────────────────────
-- Anyone signed in can browse communities (for discovery / joining).
drop policy if exists "Authenticated can view communities" on public.communities;
create policy "Authenticated can view communities"
  on public.communities for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can create communities" on public.communities;
create policy "Users can create communities"
  on public.communities for insert
  with check (created_by = auth.uid());

drop policy if exists "Members can view community membership" on public.community_members;
create policy "Members can view community membership"
  on public.community_members for select
  using (public.is_community_member(community_id, auth.uid()));

drop policy if exists "Join community as self" on public.community_members;
create policy "Join community as self"
  on public.community_members for insert
  with check (user_id = auth.uid());

-- ── RPC: create a community + its #general channel + owner membership ────────
create or replace function public.create_community(p_name text, p_icon text default null)
returns uuid language plpgsql security definer as $$
declare
  c_id    uuid;
  conv_id uuid;
begin
  insert into public.communities (name, icon, created_by)
    values (p_name, p_icon, auth.uid()) returning id into c_id;

  insert into public.community_members (community_id, user_id, role)
    values (c_id, auth.uid(), 'owner');

  insert into public.conversations (type, name, created_by, community_id)
    values ('group', 'general', auth.uid(), c_id) returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id)
    values (conv_id, auth.uid());

  return c_id;
end;
$$;

-- ── RPC: join an existing community (member + all its channels) ──────────────
create or replace function public.join_community(p_community_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.community_members (community_id, user_id)
    values (p_community_id, auth.uid())
    on conflict do nothing;

  insert into public.conversation_members (conversation_id, user_id)
    select c.id, auth.uid()
    from public.conversations c
    where c.community_id = p_community_id
    on conflict do nothing;
end;
$$;

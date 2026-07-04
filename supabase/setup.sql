-- Aethon — full Supabase schema. Run this once in the SQL Editor, top to bottom.

-- ── Profiles table ─────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  username    text unique,
  dob         date,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Messaging needs everyone searchable by username, so profiles are readable
-- by any signed-in user rather than just their owner.
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- ── Avatars storage bucket ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Conversations ────────────────────────────────────────────────────────────
-- type='dm' today; type='group' is already supported by this schema for later —
-- a group is just a conversation with more than 2 members and a name.
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'dm' check (type in ('dm','group')),
  name        text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  joined_at       timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id       uuid references auth.users(id) on delete cascade,
  content         text not null,
  created_at      timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Security-definer helper: avoids infinite RLS self-recursion when
-- conversation_members' own policy needs to check conversation_members.
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$;

create policy "Members can view their conversations"
  on public.conversations for select
  using (public.is_conversation_member(id, auth.uid()));

create policy "Users can create conversations"
  on public.conversations for insert
  with check (created_by = auth.uid());

create policy "Members can view conversation membership"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Join as self or add members as conversation creator"
  on public.conversation_members for insert
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

create policy "Members can view messages in their conversations"
  on public.messages for select
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Members can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

-- ── Find-or-create a DM so two users never end up with duplicate threads ────
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  conv_id uuid;
begin
  select c.id into conv_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = auth.uid()
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = other_user_id
  where c.type = 'dm'
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type, created_by) values ('dm', auth.uid()) returning id into conv_id;
  insert into public.conversation_members (conversation_id, user_id) values (conv_id, auth.uid()), (conv_id, other_user_id);
  return conv_id;
end;
$$;

-- ── Realtime: broadcast new messages to subscribers ─────────────────────────
alter publication supabase_realtime add table public.messages;

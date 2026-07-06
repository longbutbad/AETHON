-- Shared Listening Rooms. Run once in the Supabase SQL editor (after setup.sql).
-- Each room has synced playback state + a queue; chat reuses the conversations/
-- messages tables via a linked conversation.

create table if not exists public.listening_rooms (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  created_by          uuid references auth.users(id) on delete set null,
  conversation_id     uuid references public.conversations(id) on delete set null,
  current_video_id    text,
  current_title       text,
  is_playing          boolean not null default false,
  position            numeric not null default 0,        -- seconds into current video
  position_updated_at timestamptz default now(),
  created_at          timestamptz default now()
);

create table if not exists public.room_queue (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references public.listening_rooms(id) on delete cascade,
  video_id    text not null,
  title       text,
  thumbnail   text,
  added_by    uuid references auth.users(id) on delete set null,
  sort_order  double precision not null default extract(epoch from now()),
  created_at  timestamptz default now()
);

create index if not exists room_queue_room_idx on public.room_queue (room_id, sort_order);

alter table public.listening_rooms enable row level security;
alter table public.room_queue      enable row level security;

-- Rooms: any signed-in user can browse and drive playback (simple, DJ-booth model).
drop policy if exists "view rooms" on public.listening_rooms;
create policy "view rooms" on public.listening_rooms for select
  using (auth.role() = 'authenticated');
drop policy if exists "update room state" on public.listening_rooms;
create policy "update room state" on public.listening_rooms for update
  using (auth.role() = 'authenticated');

-- Queue: view all; add as yourself; anyone can remove/reorder.
drop policy if exists "view queue" on public.room_queue;
create policy "view queue" on public.room_queue for select
  using (auth.role() = 'authenticated');
drop policy if exists "add to queue" on public.room_queue;
create policy "add to queue" on public.room_queue for insert
  with check (added_by = auth.uid());
drop policy if exists "remove from queue" on public.room_queue;
create policy "remove from queue" on public.room_queue for delete
  using (auth.role() = 'authenticated');
drop policy if exists "reorder queue" on public.room_queue;
create policy "reorder queue" on public.room_queue for update
  using (auth.role() = 'authenticated');

-- Create a room + its chat conversation, join the creator.
create or replace function public.create_listening_room(p_name text)
returns uuid language plpgsql security definer as $$
declare
  conv_id uuid;
  room_id uuid;
begin
  insert into public.conversations (type, name, created_by)
    values ('group', p_name, auth.uid()) returning id into conv_id;
  insert into public.conversation_members (conversation_id, user_id)
    values (conv_id, auth.uid());
  insert into public.listening_rooms (name, created_by, conversation_id)
    values (p_name, auth.uid(), conv_id) returning id into room_id;
  return room_id;
end;
$$;

alter publication supabase_realtime add table public.listening_rooms;
alter publication supabase_realtime add table public.room_queue;

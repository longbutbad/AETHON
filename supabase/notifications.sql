-- Notifications. Run once in the Supabase SQL editor, after friends.sql.
-- Rows are created by SECURITY DEFINER triggers (friend request / accepted),
-- so users only ever read/update/delete their own.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- recipient
  type        text not null,
  actor_id    uuid references auth.users(id) on delete set null, -- who caused it
  body        text not null,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "View own notifications" on public.notifications;
create policy "View own notifications" on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Update own notifications" on public.notifications;
create policy "Update own notifications" on public.notifications for update
  using (user_id = auth.uid());

drop policy if exists "Delete own notifications" on public.notifications;
create policy "Delete own notifications" on public.notifications for delete
  using (user_id = auth.uid());

-- Display name of a profile, for notification text.
create or replace function public.display_name_of(p_id uuid)
returns text language sql stable as $$
  select coalesce(
    nullif(trim(concat(first_name, ' ', last_name)), ''),
    '@' || username,
    'Someone'
  )
  from public.profiles where id = p_id;
$$;

-- Friend request received.
create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer as $$
begin
  if NEW.status = 'pending' then
    insert into public.notifications (user_id, type, actor_id, body, link)
    values (
      NEW.addressee_id, 'friend_request', NEW.requester_id,
      public.display_name_of(NEW.requester_id) || ' sent you a friend request',
      '/friends'
    );
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_friend_request on public.friendships;
create trigger trg_friend_request after insert on public.friendships
  for each row execute function public.notify_friend_request();

-- Friend request accepted.
create or replace function public.notify_friend_accept()
returns trigger language plpgsql security definer as $$
begin
  if NEW.status = 'accepted' and OLD.status is distinct from 'accepted' then
    insert into public.notifications (user_id, type, actor_id, body, link)
    values (
      NEW.requester_id, 'friend_accept', NEW.addressee_id,
      public.display_name_of(NEW.addressee_id) || ' accepted your friend request',
      '/friends'
    );
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_friend_accept on public.friendships;
create trigger trg_friend_accept after update on public.friendships
  for each row execute function public.notify_friend_accept();

alter publication supabase_realtime add table public.notifications;

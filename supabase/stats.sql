-- XP + random daily quests. Run once in the Supabase SQL editor.
-- Each day the user gets a random quest from quest_catalog; doing the matching
-- action bumps progress, and completing it awards XP. Level = xp / 1000 + 1.

create table if not exists public.quest_catalog (
  id          text primary key,
  title       text not null,
  description text not null,
  action      text not null,   -- 'message' | 'friend' | 'game' | 'win'
  target      int  not null,
  xp          int  not null
);

insert into public.quest_catalog (id, title, description, action, target, xp) values
  ('msg3',    'Chatterbox',   'Send 3 messages',              'message', 3, 250),
  ('msg5',    'On a roll',    'Send 5 messages',              'message', 5, 400),
  ('friend1', 'Make a friend','Add 1 friend',                 'friend',  1, 300),
  ('game1',   'Game time',    'Play a game',                  'game',    1, 200),
  ('win1',    'Winner',       'Win a game of Tic-Tac-Toe',    'win',     1, 350)
on conflict (id) do nothing;

create table if not exists public.user_quests (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  xp          int  not null default 0,
  quest_date  date,
  quest_id    text,
  progress    int  not null default 0,
  completed   boolean not null default false
);

alter table public.quest_catalog enable row level security;
alter table public.user_quests   enable row level security;

drop policy if exists "Anyone can read quests" on public.quest_catalog;
create policy "Anyone can read quests" on public.quest_catalog for select
  using (auth.role() = 'authenticated');

drop policy if exists "Read own quest state" on public.user_quests;
create policy "Read own quest state" on public.user_quests for select
  using (user_id = auth.uid());

-- Ensure a row exists and today's quest is rolled (random, stable within the day).
create or replace function public.ensure_daily(u uuid)
returns public.user_quests language plpgsql security definer as $$
declare
  st public.user_quests;
  q  public.quest_catalog;
begin
  select * into st from public.user_quests where user_id = u;
  if st.user_id is null then
    insert into public.user_quests (user_id) values (u) returning * into st;
  end if;
  if st.quest_date is distinct from current_date then
    select * into q from public.quest_catalog order by random() limit 1;
    update public.user_quests
      set quest_date = current_date, quest_id = q.id, progress = 0, completed = false
      where user_id = u
      returning * into st;
  end if;
  return st;
end;
$$;

create or replace function public.daily_state()
returns json language plpgsql security definer as $$
declare
  st public.user_quests;
  q  public.quest_catalog;
begin
  st := public.ensure_daily(auth.uid());
  select * into q from public.quest_catalog where id = st.quest_id;
  return json_build_object(
    'xp', st.xp, 'quest_id', st.quest_id, 'title', q.title,
    'description', q.description, 'target', q.target,
    'progress', st.progress, 'xp_reward', q.xp, 'completed', st.completed
  );
end;
$$;

create or replace function public.quest_progress(p_action text)
returns json language plpgsql security definer as $$
declare
  u  uuid := auth.uid();
  st public.user_quests;
  q  public.quest_catalog;
begin
  st := public.ensure_daily(u);
  select * into q from public.quest_catalog where id = st.quest_id;
  if not st.completed and q.action = p_action then
    update public.user_quests
      set progress = least(progress + 1, q.target)
      where user_id = u returning * into st;
    if st.progress >= q.target then
      update public.user_quests
        set completed = true, xp = xp + q.xp
        where user_id = u returning * into st;
    end if;
  end if;
  return json_build_object(
    'xp', st.xp, 'quest_id', st.quest_id, 'title', q.title,
    'description', q.description, 'target', q.target,
    'progress', st.progress, 'xp_reward', q.xp, 'completed', st.completed
  );
end;
$$;

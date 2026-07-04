-- Shared "general-chat" channel that every operator posts in.
-- Run this once in the Supabase SQL editor (after setup.sql).
--
-- It's a normal group conversation with a fixed UUID so the app can reference it
-- (see src/lib/constants.ts). created_by is left null because it's system-owned;
-- users self-join via the existing "Join as self" RLS policy on
-- conversation_members, so no extra policies are needed.

insert into public.conversations (id, type, name, created_by)
values ('00000000-0000-0000-0000-0000000000a1', 'group', 'general-chat', null)
on conflict (id) do nothing;

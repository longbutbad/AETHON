"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayName, initials, type Profile } from "@/lib/profile";
import ChatThread from "@/components/app/ChatThread";

type Conv = { id: string; other: Profile | null };

export default function Messages({ me }: { me: Profile }) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Conv | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", me.id);
    const memberConvIds = (memberships ?? []).map((m) => m.conversation_id as string);
    if (!memberConvIds.length) {
      setConversations([]);
      return;
    }

    // Keep only true 1:1 DMs (exclude the shared channel and community channels).
    const { data: convRows } = await supabase
      .from("conversations")
      .select("id, type")
      .in("id", memberConvIds);
    const convIds = (convRows ?? [])
      .filter((c) => c.type === "dm")
      .map((c) => c.id as string);
    if (!convIds.length) {
      setConversations([]);
      return;
    }

    const { data: members } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", me.id);

    const otherIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, avatar_url")
      .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
    const pMap: Record<string, Profile> = {};
    (profs ?? []).forEach((p) => (pMap[p.id] = p as Profile));

    setConversations(
      convIds.map((cid) => {
        const m = (members ?? []).find((x) => x.conversation_id === cid);
        return { id: cid, other: m ? pMap[m.user_id as string] ?? null : null };
      }),
    );
  }, [supabase, me.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const search = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, avatar_url")
        .ilike("username", `%${q.trim()}%`)
        .neq("id", me.id)
        .limit(8);
      setResults((data as Profile[]) ?? []);
    }, 250);
  };

  const startDm = async (other: Profile) => {
    const { data, error } = await supabase.rpc("get_or_create_dm", {
      other_user_id: other.id,
    });
    if (error) {
      console.error(error.message);
      return;
    }
    setQuery("");
    setResults([]);
    setActive({ id: data as string, other });
    loadConversations();
  };

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {/* Conversation list — full width on mobile, hidden there once a chat is open */}
      <div
        className={
          "w-full shrink-0 flex-col rounded-xl border border-white/5 bg-white/[0.02] md:flex md:w-[280px] " +
          (active ? "hidden md:flex" : "flex")
        }
      >
        <div className="border-b border-white/5 p-3">
          <div className="mb-2 font-display text-sm font-bold tracking-[1px] text-gray-100">
            MESSAGES
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search a username…"
              className="w-full rounded-lg border border-white/5 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-violet/40"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length > 0 ? (
            <>
              <div className="px-2 py-1 text-[10px] font-bold tracking-[1.5px] text-gray-600">
                SEARCH RESULTS
              </div>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startDm(p)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                >
                  <Avatar p={p} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-gray-200">
                      {displayName(p)}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">@{p.username}</div>
                  </div>
                </button>
              ))}
            </>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] leading-relaxed text-gray-600">
              No conversations yet. Search a username above to start one.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/5 " +
                  (active?.id === c.id ? "bg-white/5" : "")
                }
              >
                <Avatar p={c.other} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-gray-200">
                    {c.other ? displayName(c.other) : "Operator"}
                  </div>
                  <div className="truncate text-[11px] text-gray-500">
                    @{c.other?.username ?? "—"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat pane — full width on mobile when a chat is open, else hidden there */}
      <div
        className={
          "min-h-0 flex-1 flex-col " + (active ? "flex" : "hidden md:flex")
        }
      >
        {active ? (
          <>
            <button
              onClick={() => setActive(null)}
              className="mb-2 flex items-center gap-1 self-start text-sm font-semibold text-violet-light md:hidden"
            >
              ‹ Back
            </button>
            <div className="min-h-0 flex-1">
              <ChatThread
                key={active.id}
                me={me}
                conversationId={active.id}
                title={active.other ? displayName(active.other) : "Operator"}
                subtitle={active.other?.username ? `@${active.other.username}` : undefined}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-center text-sm text-gray-600">
            <div>
              <div className="mb-2 text-3xl">✉</div>
              Pick a conversation, or search a username to start a new one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ p }: { p: Profile | null }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep">
      {p?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-white">{initials(p)}</span>
      )}
    </div>
  );
}

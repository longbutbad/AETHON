"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayName, initials, type Profile } from "@/lib/profile";
import { bumpQuest } from "@/lib/quests";

type Msg = {
  id?: string;
  sender_id: string;
  content: string;
  created_at?: string;
};

const NAME_COLORS = ["#a78bfa", "#67e8f9", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
function colorFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

function fmtTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * A single realtime conversation: loads its messages, subscribes for new ones,
 * and sends. Works for both the shared channel (selfJoin) and 1:1 DMs.
 */
export default function ChatThread({
  me,
  conversationId,
  title,
  subtitle,
  titlePrefix = "",
  selfJoin = false,
}: {
  me: Profile;
  conversationId: string;
  title: string;
  subtitle?: string;
  titlePrefix?: string;
  selfJoin?: boolean;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({ [me.id]: me });
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const profilesRef = useRef(profiles);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const fetchProfiles = useCallback(
    async (ids: string[]) => {
      const missing = [...new Set(ids)].filter((id) => !profilesRef.current[id]);
      if (!missing.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, avatar_url")
        .in("id", missing);
      if (data?.length) {
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data) next[p.id] = p as Profile;
          return next;
        });
      }
    },
    [supabase],
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setMessages([]);

    (async () => {
      if (selfJoin) {
        await supabase
          .from("conversation_members")
          .upsert(
            { conversation_id: conversationId, user_id: me.id },
            { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
          );
      }

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const msgs = (data as Msg[]) ?? [];
      await fetchProfiles(msgs.map((m) => m.sender_id));
      setMessages(msgs);
      scrollToBottom();

      // Unique topic per mount so StrictMode's double-invoke can't collide with a
      // not-yet-removed channel of the same name.
      const topic = `conv-${conversationId}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const m = payload.new as Msg;
            if (m.sender_id === me.id) return;
            await fetchProfiles([m.sender_id]);
            setMessages((prev) => [...prev, m]);
            scrollToBottom();
          },
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, me.id, selfJoin]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    setMessages((prev) => [
      ...prev,
      { sender_id: me.id, content, created_at: new Date().toISOString() },
    ]);
    scrollToBottom();
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: me.id, content });
    if (error) console.error(error.message);
    else bumpQuest("message");
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-white/5 bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        {titlePrefix && <span className="text-lg text-gray-500">{titlePrefix}</span>}
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-100">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-600">{subtitle}</div>}
        </div>
        <div className="flex gap-3 text-gray-500">
          <span>📌</span>
          <span>👥</span>
          <span>⌕</span>
          <span>⋯</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="pt-10 text-center text-sm text-gray-600">
            No messages yet — say something 👋
          </div>
        )}
        {messages.map((m, i) => {
          const p = profiles[m.sender_id];
          return (
            <div key={m.id ?? `tmp-${i}`} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep">
                {p?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-white">{initials(p ?? null)}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold" style={{ color: colorFor(m.sender_id) }}>
                    {p ? displayName(p) : "Operator"}
                  </span>
                  <span className="text-[10px] text-gray-600">{fmtTime(m.created_at)}</span>
                </div>
                <div className="text-[14px] leading-relaxed text-gray-300">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <span className="text-lg text-gray-500">＋</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${titlePrefix}${title}`}
            className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-600"
          />
          <button
            onClick={send}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan text-white"
            aria-label="Send"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

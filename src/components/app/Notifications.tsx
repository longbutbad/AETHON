"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ICON: Record<string, string> = {
  friend_request: "👤",
  friend_accept: "✅",
};

export default function Notifications({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, body, link, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data as Notification[]) ?? []);
      setLoading(false);

      // Mark everything read on view, then refresh so the badge clears.
      if ((data ?? []).some((n) => !n.read)) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", userId)
          .eq("read", false);
        router.refresh();
      }

      const topic = `notif-${userId}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => setItems((prev) => [payload.new as Notification, ...prev]),
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-600">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-gray-600">
        <div className="mb-2 text-3xl">🔔</div>
        You&apos;re all caught up. Friend requests and activity show up here.
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-xl border border-white/5 bg-white/[0.02] p-2">
      {items.map((n) => {
        const inner = (
          <div className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet/15 text-base">
              {ICON[n.type] ?? "🔔"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-gray-200">{n.body}</div>
              <div className="text-[11px] text-gray-600">{timeAgo(n.created_at)}</div>
            </div>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-violet" />}
          </div>
        );
        return n.link ? (
          <Link key={n.id} href={n.link}>
            {inner}
          </Link>
        ) : (
          <div key={n.id}>{inner}</div>
        );
      })}
    </div>
  );
}

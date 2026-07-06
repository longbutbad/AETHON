"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { displayName, initials, type Profile } from "@/lib/profile";
import { extractVideoId, thumbnailUrl } from "@/lib/youtube";
import ChatThread from "@/components/app/ChatThread";

/* ── Minimal YouTube IFrame API typings ─────────────────────────────────────── */
type YTPlayer = {
  loadVideoById: (o: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (o: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    el: string | HTMLElement,
    opts: {
      videoId?: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};
type YTWindow = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

let ytReady: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    w.onYouTubeIframeAPIReady = () => resolve((window as YTWindow).YT!);
  });
  return ytReady;
}

/* ── Types ───────────────────────────────────────────────────────────────────── */
export type Room = {
  id: string;
  name: string;
  conversation_id: string | null;
  current_video_id: string | null;
  current_title: string | null;
  is_playing: boolean;
  position: number;
  position_updated_at: string | null;
};
type QueueItem = {
  id: string;
  video_id: string;
  title: string | null;
  thumbnail: string | null;
  added_by: string | null;
  sort_order: number;
};
type Member = { id: string; name: string; avatar: string | null };

type Control =
  | { action: "load"; videoId: string; title: string | null }
  | { action: "play"; position: number; at: number }
  | { action: "pause"; position: number };

export default function ListeningRoom({ room, me }: { room: Room; me: Profile }) {
  const supabase = createClient();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Member>>({
    [me.id]: { id: me.id, name: displayName(me), avatar: me.avatar_url },
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [current, setCurrent] = useState<{ id: string; title: string | null } | null>(
    room.current_video_id ? { id: room.current_video_id, title: room.current_title } : null,
  );
  const [isPlaying, setIsPlaying] = useState(room.is_playing);
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const applyingRemote = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  const membersRef = useRef<Member[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const isHost = useCallback(() => {
    const ids = membersRef.current.map((m) => m.id);
    if (!ids.length) return true;
    return [...ids].sort()[0] === me.id;
  }, [me.id]);

  const updateRoom = useCallback(
    (fields: Partial<Room>) =>
      supabase.from("listening_rooms").update(fields).eq("id", room.id),
    [supabase, room.id],
  );

  const sendControl = useCallback((payload: Control) => {
    channelRef.current?.send({ type: "broadcast", event: "control", payload });
  }, []);

  const guardRemote = () => {
    applyingRemote.current = true;
    setTimeout(() => (applyingRemote.current = false), 700);
  };

  /* ── Queue loading ───────────────────────────────────────────────────────── */
  const loadQueue = useCallback(async () => {
    const { data } = await supabase
      .from("room_queue")
      .select("id, video_id, title, thumbnail, added_by, sort_order")
      .eq("room_id", room.id)
      .order("sort_order", { ascending: true });
    const items = (data as QueueItem[]) ?? [];
    setQueue(items);
    const need = [...new Set(items.map((i) => i.added_by).filter(Boolean))] as string[];
    const missing = need.filter((id) => !profiles[id]);
    if (missing.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", missing);
      if (profs?.length) {
        setProfiles((p) => {
          const n = { ...p };
          for (const pr of profs)
            n[pr.id] = {
              id: pr.id,
              name: displayName(pr as Profile),
              avatar: (pr as Profile).avatar_url,
            };
          return n;
        });
      }
    }
  }, [supabase, room.id, profiles]);

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Player ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let destroyed = false;
    loadYT().then((YT) => {
      if (destroyed) return;
      playerRef.current = new YT.Player(`yt-${room.id}`, {
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            // Sync a fresh joiner to the room's current playback state.
            if (room.current_video_id) {
              const base = Number(room.position) || 0;
              const elapsed = room.is_playing
                ? (Date.now() - new Date(room.position_updated_at ?? Date.now()).getTime()) / 1000
                : 0;
              const start = Math.max(0, base + elapsed);
              guardRemote();
              if (room.is_playing) {
                playerRef.current?.loadVideoById({ videoId: room.current_video_id, startSeconds: start });
              } else {
                playerRef.current?.cueVideoById({ videoId: room.current_video_id, startSeconds: start });
              }
            }
          },
          onStateChange: (e) => {
            const player = playerRef.current;
            if (!player) return;
            if (e.data === 0) {
              // ENDED — the host advances the queue for everyone.
              if (isHost()) skipNext();
              return;
            }
            if (applyingRemote.current) return;
            if (e.data === 1) {
              const pos = player.getCurrentTime();
              setIsPlaying(true);
              sendControl({ action: "play", position: pos, at: Date.now() });
              updateRoom({ is_playing: true, position: pos, position_updated_at: new Date().toISOString() });
            } else if (e.data === 2) {
              const pos = player.getCurrentTime();
              setIsPlaying(false);
              sendControl({ action: "pause", position: pos });
              updateRoom({ is_playing: false, position: pos, position_updated_at: new Date().toISOString() });
            }
          },
        },
      });
    });
    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  /* ── Realtime channel: presence + control + queue changes ────────────────── */
  useEffect(() => {
    const channel = supabase.channel(`room-${room.id}`, {
      config: { presence: { key: me.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ id: string; name: string; avatar: string | null }>();
        const list: Member[] = [];
        for (const key in state) {
          const entry = state[key][0];
          if (entry) list.push({ id: entry.id, name: entry.name, avatar: entry.avatar });
        }
        setMembers(list);
      })
      .on("broadcast", { event: "control" }, ({ payload }) => {
        const c = payload as Control;
        const player = playerRef.current;
        if (!player) return;
        guardRemote();
        if (c.action === "load") {
          setCurrent({ id: c.videoId, title: c.title });
          setIsPlaying(true);
          player.loadVideoById({ videoId: c.videoId, startSeconds: 0 });
        } else if (c.action === "play") {
          const elapsed = (Date.now() - c.at) / 1000;
          player.seekTo(c.position + elapsed, true);
          player.playVideo();
          setIsPlaying(true);
        } else if (c.action === "pause") {
          player.seekTo(c.position, true);
          player.pauseVideo();
          setIsPlaying(false);
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_queue", filter: `room_id=eq.${room.id}` },
        () => loadQueue(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: me.id, name: displayName(me), avatar: me.avatar_url });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, me.id]);

  /* ── Actions ─────────────────────────────────────────────────────────────── */
  const playItem = useCallback(
    async (item: QueueItem) => {
      setCurrent({ id: item.video_id, title: item.title });
      setIsPlaying(true);
      guardRemote();
      playerRef.current?.loadVideoById({ videoId: item.video_id, startSeconds: 0 });
      sendControl({ action: "load", videoId: item.video_id, title: item.title });
      await updateRoom({
        current_video_id: item.video_id,
        current_title: item.title,
        is_playing: true,
        position: 0,
        position_updated_at: new Date().toISOString(),
      });
      await supabase.from("room_queue").delete().eq("id", item.id);
    },
    [supabase, sendControl, updateRoom],
  );

  const skipNext = useCallback(() => {
    const next = queueRef.current[0];
    if (next) playItem(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playItem]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || !current) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  };

  const addToQueue = async () => {
    const id = extractVideoId(link);
    if (!id) {
      alert("That doesn't look like a YouTube link.");
      return;
    }
    setAdding(true);
    setLink("");
    let title: string | null = null;
    let thumb: string | null = thumbnailUrl(id);
    try {
      const res = await fetch(`/api/yt?id=${id}`);
      const meta = await res.json();
      title = meta.title ?? null;
      thumb = meta.thumbnail ?? thumb;
    } catch {
      /* metadata is best-effort */
    }
    await supabase.from("room_queue").insert({
      room_id: room.id,
      video_id: id,
      title,
      thumbnail: thumb,
      added_by: me.id,
      sort_order: Date.now(),
    });
    setAdding(false);
    // If nothing is playing, start it immediately.
    if (!current) {
      const { data } = await supabase
        .from("room_queue")
        .select("id, video_id, title, thumbnail, added_by, sort_order")
        .eq("room_id", room.id)
        .order("sort_order", { ascending: true })
        .limit(1);
      const first = (data as QueueItem[])?.[0];
      if (first) playItem(first);
    }
  };

  const removeItem = (id: string) => supabase.from("room_queue").delete().eq("id", id);

  const move = async (index: number, dir: -1 | 1) => {
    const a = queue[index];
    const b = queue[index + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("room_queue").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("room_queue").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    loadQueue();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Player + queue */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        <div className="overflow-hidden rounded-xl border border-white/5 bg-black">
          <div className="aspect-video w-full">
            <div id={`yt-${room.id}`} className="h-full w-full" />
          </div>
        </div>

        {/* Now playing + transport */}
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <button
            onClick={togglePlay}
            disabled={!current}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-white disabled:opacity-40"
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            onClick={skipNext}
            disabled={!queue.length}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
            title="Skip"
          >
            ⏭
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-100">
              {current?.title ?? "Nothing playing"}
            </div>
            <div className="text-[11px] text-gray-500">
              {current ? (isPlaying ? "Now playing" : "Paused") : "Add a track below"}
            </div>
          </div>
        </div>

        {/* Add to queue */}
        <div className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addToQueue()}
            placeholder="Paste a YouTube link…"
            className="flex-1 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-violet/40"
          />
          <button
            onClick={addToQueue}
            disabled={adding}
            className="rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {adding ? "…" : "Add"}
          </button>
        </div>

        {/* Queue */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
          <div className="px-2 py-1 text-[10px] font-bold tracking-[1.5px] text-gray-600">
            QUEUE · {queue.length}
          </div>
          {queue.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-gray-600">
              Queue is empty.
            </div>
          ) : (
            queue.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail ?? thumbnailUrl(item.video_id)}
                  alt=""
                  className="h-9 w-14 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-gray-200">
                    {item.title ?? item.video_id}
                  </div>
                  <div className="truncate text-[10px] text-gray-600">
                    added by {item.added_by ? profiles[item.added_by]?.name ?? "someone" : "someone"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-gray-500">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 disabled:opacity-30" title="Up">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === queue.length - 1} className="px-1 disabled:opacity-30" title="Down">↓</button>
                  <button onClick={() => playItem(item)} className="px-1 text-emerald-400" title="Play now">▶</button>
                  <button onClick={() => removeItem(item.id)} className="px-1 text-red-400" title="Remove">✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Now listening + chat */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-bold tracking-[1.5px] text-gray-600">
            NOW LISTENING · {members.length}
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 rounded-full bg-white/5 py-1 pl-1 pr-2.5">
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep text-[9px] font-bold text-white">
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials({ first_name: m.name, last_name: null })
                  )}
                </span>
                <span className="text-[11px] text-gray-300">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {room.conversation_id && (
          <div className="h-[440px]">
            <ChatThread
              me={me}
              conversationId={room.conversation_id}
              title="Room chat"
              titlePrefix="#"
              selfJoin
            />
          </div>
        )}
      </div>
    </div>
  );
}

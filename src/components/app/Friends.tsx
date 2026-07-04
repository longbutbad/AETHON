"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { displayName, initials, type Profile } from "@/lib/profile";

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

type Incoming = { friendshipId: string; profile: Profile };

export default function Friends({ me }: { me: Profile }) {
  const supabase = createClient();
  const router = useRouter();

  const [friends, setFriends] = useState<Profile[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [pendingOut, setPendingOut] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async () => {
    const { data: fs } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`);
    const rows = (fs as Friendship[]) ?? [];

    // Collect every counterpart id we need a profile for.
    const ids = new Set<string>();
    rows.forEach((r) => {
      ids.add(r.requester_id === me.id ? r.addressee_id : r.requester_id);
    });
    const pMap: Record<string, Profile> = {};
    if (ids.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, avatar_url")
        .in("id", [...ids]);
      (profs ?? []).forEach((p) => (pMap[p.id] = p as Profile));
    }

    setFriends(
      rows
        .filter((r) => r.status === "accepted")
        .map((r) => pMap[r.requester_id === me.id ? r.addressee_id : r.requester_id])
        .filter(Boolean),
    );
    setIncoming(
      rows
        .filter((r) => r.status === "pending" && r.addressee_id === me.id)
        .map((r) => ({ friendshipId: r.id, profile: pMap[r.requester_id] }))
        .filter((x) => x.profile),
    );
    setPendingOut(
      new Set(
        rows
          .filter((r) => r.status === "pending" && r.requester_id === me.id)
          .map((r) => r.addressee_id),
      ),
    );
  }, [supabase, me.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  const addFriend = async (other: Profile) => {
    setPendingOut((s) => new Set(s).add(other.id));
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: me.id, addressee_id: other.id });
    if (error && error.code !== "23505") console.error(error.message);
    loadAll();
  };

  const accept = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadAll();
  };

  const remove = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadAll();
  };

  const message = async (otherId: string) => {
    const { error } = await supabase.rpc("get_or_create_dm", { other_user_id: otherId });
    if (error) {
      console.error(error.message);
      return;
    }
    router.push("/messages");
  };

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Add friends */}
      <div>
        <h2 className="mb-2 font-display text-sm font-bold tracking-[1.5px] text-gray-300">
          ADD FRIEND
        </h2>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search a username…"
            className="w-full rounded-lg border border-white/5 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-violet/40"
          />
        </div>
        {results.length > 0 && (
          <div className="mt-2 space-y-1 rounded-xl border border-white/5 bg-white/[0.02] p-2">
            {results.map((p) => (
              <Row key={p.id} p={p}>
                {friendIds.has(p.id) ? (
                  <Tag>Friends</Tag>
                ) : pendingOut.has(p.id) ? (
                  <Tag>Requested</Tag>
                ) : (
                  <Btn onClick={() => addFriend(p)}>Add</Btn>
                )}
              </Row>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-sm font-bold tracking-[1.5px] text-gray-300">
            FRIEND REQUESTS · {incoming.length}
          </h2>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/[0.02] p-2">
            {incoming.map(({ friendshipId, profile }) => (
              <Row key={friendshipId} p={profile}>
                <Btn onClick={() => accept(friendshipId)}>Accept</Btn>
                <Btn variant="ghost" onClick={() => remove(friendshipId)}>
                  Ignore
                </Btn>
              </Row>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <h2 className="mb-2 font-display text-sm font-bold tracking-[1.5px] text-gray-300">
          FRIENDS · {friends.length}
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-gray-600">
            No friends yet. Search a username above to add someone.
          </div>
        ) : (
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/[0.02] p-2">
            {friends.map((p) => (
              <Row key={p.id} p={p}>
                <Btn onClick={() => message(p.id)}>Message</Btn>
              </Row>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ p, children }: { p: Profile; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep">
        {p?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-white">{initials(p)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-gray-200">{displayName(p)}</div>
        <div className="truncate text-[11px] text-gray-500">@{p.username}</div>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-lg px-3 py-1.5 text-[12px] font-bold " +
        (variant === "solid"
          ? "bg-gradient-to-br from-violet to-cyan text-white"
          : "border border-white/10 text-gray-400 hover:bg-white/5")
      }
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-gray-500">
      {children}
    </span>
  );
}

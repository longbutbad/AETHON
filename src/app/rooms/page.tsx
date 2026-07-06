import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import CreateRoomModal from "@/components/app/CreateRoomModal";

type Room = {
  id: string;
  name: string;
  current_title: string | null;
  is_playing: boolean;
};

export default async function RoomsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile?.username) redirect("/setup");

  const { data: rooms } = await supabase
    .from("listening_rooms")
    .select("id, name, current_title, is_playing")
    .order("created_at", { ascending: false });
  const list = (rooms as Room[]) ?? [];

  return (
    <AppShell profile={profile} active="Rooms">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[1px] text-gray-50">
            Listening Rooms
          </h1>
          <p className="text-sm text-gray-500">Queue YouTube and vibe together in sync.</p>
        </div>
        <CreateRoomModal />
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-gray-500">
          No rooms yet. Hit <span className="text-violet-light">+ Create Room</span> to start one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <Link
              key={r.id}
              href={`/rooms/${r.id}`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet/15 text-2xl">
                  🎵
                </span>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-gray-100">
                    {r.name}
                  </div>
                  <div className="truncate text-[11px] text-gray-500">
                    {r.current_title ? (
                      <>
                        <span className={r.is_playing ? "text-emerald-400" : "text-gray-500"}>
                          {r.is_playing ? "▶ " : "❚❚ "}
                        </span>
                        {r.current_title}
                      </>
                    ) : (
                      "Empty — add the first track"
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

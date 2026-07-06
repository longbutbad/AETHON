import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import ListeningRoom, { type Room } from "@/components/app/ListeningRoom";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: room } = await supabase
    .from("listening_rooms")
    .select(
      "id, name, conversation_id, current_video_id, current_title, is_playing, position, position_updated_at",
    )
    .eq("id", id)
    .maybeSingle<Room>();
  if (!room) notFound();

  return (
    <AppShell profile={profile} active="Rooms">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/rooms" className="text-sm font-semibold text-violet-light">
          ‹ Rooms
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet/15 text-lg">
          🎵
        </span>
        <h1 className="font-display text-xl font-bold tracking-[1px] text-gray-50">{room.name}</h1>
      </div>
      <ListeningRoom room={room} me={profile} />
    </AppShell>
  );
}

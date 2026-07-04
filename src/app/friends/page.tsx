import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import Friends from "@/components/app/Friends";

export default async function FriendsPage() {
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

  return (
    <AppShell profile={profile} active="Friends">
      <h1 className="mb-5 font-display text-2xl font-bold tracking-[1px] text-gray-50">
        Friends
      </h1>
      <Friends me={profile} />
    </AppShell>
  );
}

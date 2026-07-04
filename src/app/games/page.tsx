import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import GamesHub from "@/components/app/GamesHub";

export default async function GamesPage() {
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
    <AppShell profile={profile} active="Games">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-[1px] text-gray-50">Games</h1>
        <p className="text-sm text-gray-500">Quick activities to pass the time.</p>
      </div>
      <GamesHub />
    </AppShell>
  );
}

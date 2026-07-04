import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import { GENERAL_CHANNEL_ID } from "@/lib/constants";
import AppShell from "@/components/app/AppShell";
import HomeHeader from "@/components/app/HomeHeader";
import ChatThread from "@/components/app/ChatThread";

export default async function DashboardPage() {
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
    <AppShell profile={profile} active="Home" showRightbar>
      <HomeHeader profile={profile} />
      <div className="mt-6 h-[460px] shrink-0">
        <ChatThread
          me={profile}
          conversationId={GENERAL_CHANNEL_ID}
          title="general-chat"
          subtitle="General discussion about anything and everything."
          titlePrefix="#"
          selfJoin
        />
      </div>
    </AppShell>
  );
}

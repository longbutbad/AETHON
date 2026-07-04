import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import ChatThread from "@/components/app/ChatThread";
import JoinCommunityButton from "@/components/app/JoinCommunityButton";
import CommunityIcon from "@/components/app/CommunityIcon";

export default async function CommunityPage({
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

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, icon")
    .eq("id", id)
    .maybeSingle();
  if (!community) notFound();

  // Non-members can't see channels (RLS) — gate behind a Join screen.
  const { data: membership } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <AppShell profile={profile} active="Communities">
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm text-center">
            <CommunityIcon
              icon={community.icon}
              className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-violet/15"
              emojiClass="text-4xl"
            />
            <h1 className="mb-1 font-display text-2xl font-bold tracking-[1px] text-gray-50">
              {community.name}
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Join this community to see its channels and chat.
            </p>
            <JoinCommunityButton communityId={id} label="Join Community" />
          </div>
        </div>
      </AppShell>
    );
  }

  // Members: load the community's channels (group conversations).
  const { data: channels } = await supabase
    .from("conversations")
    .select("id, name")
    .eq("community_id", id)
    .order("created_at", { ascending: true });
  const channel = channels?.[0];

  return (
    <AppShell profile={profile} active="Communities">
      <div className="mb-4 flex items-center gap-3">
        <CommunityIcon
          icon={community.icon}
          className="h-10 w-10 rounded-xl bg-violet/15"
          emojiClass="text-xl"
        />
        <h1 className="font-display text-xl font-bold tracking-[1px] text-gray-50">
          {community.name}
        </h1>
      </div>

      <div className="min-h-0 flex-1">
        {channel ? (
          <ChatThread
            me={profile}
            conversationId={channel.id}
            title={channel.name ?? "general"}
            subtitle={`${community.name} community channel`}
            titlePrefix="#"
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] text-sm text-gray-600">
            This community has no channels yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}

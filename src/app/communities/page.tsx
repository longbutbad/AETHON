import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";
import CreateCommunityModal from "@/components/app/CreateCommunityModal";
import JoinCommunityButton from "@/components/app/JoinCommunityButton";
import CommunityIcon from "@/components/app/CommunityIcon";

type CommunityRow = { id: string; name: string; icon: string | null };

export default async function CommunitiesPage() {
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

  const { data: all } = await supabase
    .from("communities")
    .select("id, name, icon")
    .order("created_at", { ascending: false });
  const communities = (all as CommunityRow[]) ?? [];

  const { data: mine } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", user.id);
  const memberIds = new Set((mine ?? []).map((m) => m.community_id as string));

  return (
    <AppShell profile={profile} active="Communities">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[1px] text-gray-50">
            Communities
          </h1>
          <p className="text-sm text-gray-500">Create your own server or join others.</p>
        </div>
        <CreateCommunityModal variant="full" />
      </div>

      {communities.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-gray-500">
          No communities exist yet. Be the first — hit{" "}
          <span className="text-violet-light">+ Create Community</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => {
            const joined = memberIds.has(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <CommunityIcon
                  icon={c.icon}
                  className="h-12 w-12 rounded-xl bg-violet/15"
                  emojiClass="text-2xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold text-gray-100">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {joined ? "Joined" : "Community"}
                  </div>
                </div>
                {joined ? (
                  <Link
                    href={`/communities/${c.id}`}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-bold text-gray-300 hover:bg-white/5"
                  >
                    Open
                  </Link>
                ) : (
                  <JoinCommunityButton communityId={c.id} className="!px-3 !py-1.5 !text-[12px]" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

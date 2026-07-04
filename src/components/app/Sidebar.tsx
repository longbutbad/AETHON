import Link from "next/link";
import { displayName, initials, type Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import CreateCommunityModal from "@/components/app/CreateCommunityModal";
import CommunityIcon from "@/components/app/CommunityIcon";

const NAV = [
  { label: "Home", icon: "⌂", href: "/dashboard" },
  { label: "Friends", icon: "👥", href: "/friends" },
  { label: "Communities", icon: "🛡", href: "/communities" },
  { label: "Messages", icon: "✉", href: "/messages" },
  { label: "Games", icon: "🎮", href: "/games" },
  { label: "Notifications", icon: "🔔", href: "/notifications" },
];

type CommunityRow = { id: string; name: string; icon: string | null };

export default async function Sidebar({
  profile,
  active = "Home",
  unread = 0,
}: {
  profile: Profile;
  active?: string;
  unread?: number;
}) {
  const code = "#AET-" + profile.id.slice(0, 4).toUpperCase();

  // The communities this operator belongs to — one round trip via an embedded join.
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("community_members")
    .select("communities(id, name, icon)")
    .eq("user_id", profile.id);
  const communities: CommunityRow[] = (rows ?? []).flatMap((r) => {
    const c = r.communities as unknown;
    if (!c) return [];
    return Array.isArray(c) ? (c as CommunityRow[]) : [c as CommunityRow];
  });

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#07060f]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan font-display text-sm font-bold text-white">
          Æ
        </span>
        <span
          className="font-display text-lg font-bold tracking-[4px] text-white"
          style={{ textShadow: "0 0 16px rgba(139,92,246,0.6)" }}
        >
          AETHON
        </span>
      </div>

      {/* Profile card */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-2.5">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-deep to-cyan-deep">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-sm font-bold text-white">{initials(profile)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold text-gray-100">
            {displayName(profile)}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span>{code}</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-1">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={
              "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition " +
              (item.label === active
                ? "bg-violet/15 font-semibold text-violet-light"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200")
            }
          >
            <span className="w-4 text-center text-[15px]">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.label === "Notifications" && unread > 0 && (
              <span className="rounded-full bg-violet px-1.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Your communities */}
      <div className="mt-3 flex items-center justify-between px-5 pb-1">
        <span className="font-display text-[10px] font-bold tracking-[1.5px] text-gray-600">
          YOUR COMMUNITIES
        </span>
        <CreateCommunityModal variant="plus" />
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        {communities.length === 0 ? (
          <Link
            href="/communities"
            className="block rounded-lg px-2 py-2 text-[12px] leading-relaxed text-gray-600 hover:bg-white/5"
          >
            No communities yet. Create one with + or browse to join.
          </Link>
        ) : (
          communities.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.id}`}
              className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5"
            >
              <CommunityIcon
                icon={c.icon}
                className="h-8 w-8 rounded-lg bg-violet/15"
                emojiClass="text-sm"
              />
              <span className="truncate text-[13px] font-semibold text-gray-300">{c.name}</span>
            </Link>
          ))
        )}
      </div>

      {/* Pro card */}
      <div className="m-3 rounded-xl border border-violet/20 bg-gradient-to-br from-violet/15 to-cyan/10 p-3">
        <div className="font-display text-sm font-bold tracking-[1px] text-white">AETHON PRO</div>
        <div className="mb-2 text-[11px] text-gray-400">Upgrade your experience</div>
        <Link
          href="/soon"
          className="inline-block rounded-md bg-violet px-3 py-1 text-[11px] font-bold text-white transition hover:bg-violet-deep"
        >
          Go Premium
        </Link>
      </div>

      <div className="border-t border-white/5 px-5 py-2.5">
        <SignOutButton />
      </div>
    </aside>
  );
}

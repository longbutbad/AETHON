import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Profile } from "@/lib/profile";
import AppShell from "@/components/app/AppShell";

export default async function SoonPage() {
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
    <AppShell profile={profile} active="">
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">🛠️</div>
          <h1 className="mb-2 font-display text-2xl font-bold tracking-[2px] text-gray-100">
            COMING SOON
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">
            This feature isn&apos;t built yet. Friends, communities, voice calls and
            events are on the roadmap — for now, head to Messages to chat in realtime.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/messages"
              className="rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white"
            >
              Open Messages
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/5"
            >
              Back Home
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

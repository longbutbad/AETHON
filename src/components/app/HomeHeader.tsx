import { type Profile, displayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { levelInfo, type DailyState } from "@/lib/quests";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export default async function HomeHeader({ profile }: { profile: Profile }) {
  const name = displayName(profile);

  // Real XP + today's random quest. Falls back gracefully if stats.sql isn't run.
  const supabase = await createClient();
  const { data } = await supabase.rpc("daily_state");
  const quest = (data as DailyState | null) ?? null;
  const xp = quest?.xp ?? 0;
  const { level, intoLevel, rank, needed } = levelInfo(xp);

  const qTarget = quest?.target ?? 3;
  const qProgress = quest?.progress ?? 0;

  return (
    <div>
      {/* Welcome + hero */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {name.split(" ")[0]}! <span className="align-middle">👋</span>
          </h1>
          <p className="mt-1 text-gray-500">Your adventure continues.</p>
        </div>
        <div className="relative hidden h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet/20 to-cyan/10 sm:flex">
          <span className="text-5xl opacity-80">🛡️</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Daily quest */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="text-sm font-bold text-gray-200">Daily Quest</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">
            {quest ? `${quest.title} — ${quest.description}` : "Send 3 messages"}
          </p>
          <ProgressBar pct={(qProgress / qTarget) * 100} />
          <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
            <span>
              {qProgress} / {qTarget}
            </span>
            <span className={quest?.completed ? "text-emerald-400" : "text-violet-light"}>
              {quest?.completed ? "✓ Claimed" : `+${quest?.xp_reward ?? 250} XP`}
            </span>
          </div>
        </div>

        {/* Tournament (still cosmetic) */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-bold text-gray-200">Tournament</span>
          </div>
          <p className="text-[11px] text-gray-500">Aethon Cup #12</p>
          <p className="mt-3 text-[11px] text-gray-400">No tournament scheduled yet</p>
        </div>

        {/* Level */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-bold text-gray-200">Level {level}</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">{rank}</p>
          <ProgressBar pct={(intoLevel / needed) * 100} />
          <div className="mt-1.5 text-[10px] text-gray-500">
            {intoLevel.toLocaleString()} / {needed.toLocaleString()} XP
          </div>
        </div>
      </div>
    </div>
  );
}

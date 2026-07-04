import { type Profile, displayName } from "@/lib/profile";

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HomeHeader({ profile }: { profile: Profile }) {
  const name = displayName(profile);

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
          <span className="absolute right-3 top-3 text-right">
            <span className="block font-display text-lg font-bold text-emerald-400">47,291</span>
            <span className="text-[10px] text-gray-400">● Online</span>
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span className="text-sm font-bold text-gray-200">Daily Quest</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">Send 3 messages in any community</p>
          <ProgressBar pct={66} />
          <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
            <span>2 / 3</span>
            <span className="text-violet-light">XP 250</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="text-sm font-bold text-gray-200">Tournament</span>
          </div>
          <p className="text-[11px] text-gray-500">Aethon Cup #12</p>
          <p className="mt-3 text-[11px] text-gray-400">
            Starts in <span className="text-amber-400">02:15:47</span>
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-bold text-gray-200">Level 24</span>
          </div>
          <p className="mb-3 text-[11px] text-gray-500">Nova Traveler</p>
          <ProgressBar pct={64} />
          <div className="mt-1.5 text-[10px] text-gray-500">3,240 / 5,000 XP</div>
        </div>
      </div>
    </div>
  );
}

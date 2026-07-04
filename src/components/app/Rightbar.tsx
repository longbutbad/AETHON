const ACTIVE = [
  { name: "LunarWolf", status: "Playing VALORANT", color: "#8b5cf6", glyph: "✷" },
  { name: "CyberDrake", status: "In a Voice Channel", color: "#06b6d4", glyph: "🎧" },
  { name: "StellarKat", status: "Watching Stream", color: "#ec4899", glyph: "🖥" },
  { name: "Ghosty", status: "Playing Minecraft", color: "#6abf69", glyph: "▣" },
  { name: "Zenix", status: "AFK", color: "#f59e0b", glyph: "☾" },
];

const EVENTS = [
  { title: "Aethon Cup #12", sub: "Tournament", when: "Today · 1:00 PM", glyph: "🏆" },
  { title: "Community Night", sub: "Chill Lounge", when: "Today · 8:00 PM", glyph: "💬" },
  { title: "Giveaway", sub: "Aethon Esports", when: "Tomorrow · 6:00 PM", glyph: "🎁" },
];

const QUICK = [
  { label: "Create Server", glyph: "🌐" },
  { label: "Start Call", glyph: "📞" },
  { label: "Create Event", glyph: "📅" },
];

import Link from "next/link";

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-200">{title}</span>
        {action && (
          <Link href="/soon" className="cursor-pointer text-[11px] font-semibold text-violet-light">
            {action}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Rightbar() {
  return (
    <aside className="hidden h-full w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/5 bg-[#07060f] p-3 xl:flex">
      <Panel title="Active Now">
        <div className="flex flex-col gap-2.5">
          {ACTIVE.map((u) => (
            <div key={u.name} className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm"
                style={{ background: u.color + "22", color: u.color }}
              >
                {u.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-gray-200">{u.name}</div>
                <div className="truncate text-[11px] text-gray-500">{u.status}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Upcoming Events" action="See All">
        <div className="flex flex-col gap-2.5">
          {EVENTS.map((e) => (
            <div key={e.title} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/15 text-sm">
                {e.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-gray-200">{e.title}</div>
                <div className="truncate text-[11px] text-gray-500">{e.sub}</div>
                <div className="text-[10px] text-gray-600">{e.when}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Quick Create">
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.label}
              href="/soon"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] py-3 text-center hover:bg-white/5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/15 text-sm">
                {q.glyph}
              </span>
              <span className="text-[10px] font-semibold text-gray-400">{q.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

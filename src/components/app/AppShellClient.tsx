"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { initials, type Profile } from "@/lib/profile";

/**
 * Responsive app chrome. On desktop the sidebar is a static column and the right
 * rail shows; on mobile the sidebar becomes an off-canvas drawer toggled by the
 * hamburger, and the right rail is hidden.
 */
export default function AppShellClient({
  profile,
  unread = 0,
  sidebar,
  rightbar,
  children,
}: {
  profile: Profile;
  unread?: number;
  sidebar: ReactNode;
  rightbar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-void text-gray-200">
      {/* Sidebar: static on md+, off-canvas drawer on mobile */}
      <div
        className={
          "fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-200 md:static md:z-auto md:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {sidebar}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-3 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-300 hover:bg-white/5 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="relative mx-auto w-full max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              ⌕
            </span>
            <input
              placeholder="Search Aethon"
              className="w-full rounded-lg border border-white/5 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-violet/40"
            />
          </div>

          <Link
            href="/notifications"
            className="relative hidden text-lg text-gray-500 hover:text-gray-300 sm:block"
            aria-label="Notifications"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet/30 bg-gradient-to-br from-violet-deep to-cyan-deep"
            aria-label="Settings"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{initials(profile)}</span>
            )}
          </Link>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </main>

      {rightbar}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/login");
  };

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className={
        "font-display text-[11px] font-bold tracking-[2px] text-red-400/80 transition hover:text-red-400 disabled:opacity-50 " +
        className
      }
    >
      {busy ? "…" : "SIGN OUT"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinCommunityButton({
  communityId,
  className = "",
  label = "Join",
}: {
  communityId: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const join = async () => {
    setBusy(true);
    const { error } = await createClient().rpc("join_community", {
      p_community_id: communityId,
    });
    if (error) {
      setBusy(false);
      console.error(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <button
      onClick={join}
      disabled={busy}
      className={
        "rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white disabled:opacity-60 " +
        className
      }
    >
      {busy ? "Joining…" : label}
    </button>
  );
}

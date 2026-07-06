"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateRoomModal() {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const create = async () => {
    setErr("");
    if (!name.trim()) {
      setErr("Give your room a name");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_listening_room", {
      p_name: name.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    setName("");
    router.push(`/rooms/${data as string}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white"
      >
        + Create Room
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0a16] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 font-display text-xl font-bold tracking-[1px] text-gray-50">
              Create a Listening Room
            </h2>
            <p className="mb-4 text-[12px] text-gray-500">
              Queue YouTube tracks and listen together in sync.
            </p>
            {err && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
                {err}
              </div>
            )}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Late Night Lofi"
              className="mb-5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-violet/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={busy}
                className="rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

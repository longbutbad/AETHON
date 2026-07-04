"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CommunityIcon from "@/components/app/CommunityIcon";

const ICONS = ["🛡", "🎮", "⚔️", "🚀", "🔥", "👾", "🏆", "🎧", "🐉", "🌌", "🎯", "💎"];

export default function CreateCommunityModal({
  variant = "plus",
}: {
  variant?: "plus" | "full";
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // `icon` holds either an emoji or an uploaded image URL.
  const [icon, setIcon] = useState<string>(ICONS[0]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setErr("Session expired — sign in again");
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/community-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      setErr(upErr.message);
      return;
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    setIcon(url);
    setUploading(false);
  };

  const create = async () => {
    setErr("");
    if (!name.trim()) {
      setErr("Give your community a name");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_community", {
      p_name: name.trim(),
      p_icon: icon,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    setName("");
    setIcon(ICONS[0]);
    router.push(`/communities/${data as string}`);
    router.refresh();
  };

  return (
    <>
      {variant === "plus" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Create community"
          className="text-gray-500 transition hover:text-gray-200"
        >
          +
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-gradient-to-br from-violet to-cyan px-4 py-2 text-sm font-bold text-white"
        >
          + Create Community
        </button>
      )}

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
              Create a Community
            </h2>
            <p className="mb-4 text-[12px] text-gray-500">
              Your community starts with a #general channel.
            </p>

            {err && (
              <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
                {err}
              </div>
            )}

            {/* Preview + upload */}
            <div className="mb-4 flex items-center gap-4">
              <CommunityIcon
                icon={icon}
                className="h-16 w-16 rounded-2xl border border-white/10 bg-violet/15"
                emojiClass="text-3xl"
              />
              <div>
                <label className="inline-block cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-gray-200 hover:bg-white/5">
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUpload}
                    disabled={uploading}
                  />
                </label>
                <p className="mt-1 text-[10px] text-gray-600">PNG / JPG, square looks best.</p>
              </div>
            </div>

            <label className="mb-1 block text-[11px] font-bold tracking-[1.5px] text-violet-700">
              OR PICK AN EMOJI
            </label>
            <div className="mb-4 grid grid-cols-6 gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={
                    "flex h-9 items-center justify-center rounded-lg border text-lg transition " +
                    (icon === i
                      ? "border-violet bg-violet/15"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5")
                  }
                >
                  {i}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-[11px] font-bold tracking-[1.5px] text-violet-700">
              NAME
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Valorant Squad"
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
                disabled={busy || uploading}
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

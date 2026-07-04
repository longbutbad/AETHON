"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/profile";
import { Alert, Field, NeonButton } from "@/components/ui";

/**
 * First-run profile setup shown right after signup: avatar, name, username,
 * then a confirm button that saves and drops the user into the app.
 */
export default function SetupProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial?: Profile | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(
    [initial?.first_name, initial?.last_name].filter(Boolean).join(" "),
  );
  const [username, setUsername] = useState(initial?.username ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial?.avatar_url ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const confirm = async () => {
    setErr("");
    if (!name.trim() || !username.trim()) {
      setErr("Name and username are required");
      return;
    }

    setBusy(true);

    // Split the single Name field into first / last for the profiles table.
    const parts = name.trim().split(/\s+/);
    const firstName = parts.shift() ?? "";
    const lastName = parts.length ? parts.join(" ") : null;

    let avatarUrl: string | undefined;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (upErr) {
        setBusy(false);
        setErr(upErr.message);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error: dbErr } = await supabase.from("profiles").upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      username: username.trim(),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    });

    setBusy(false);
    if (dbErr) {
      // 23505 = unique_violation on the username column
      if (dbErr.code === "23505") {
        setErr("That username is already taken — try another.");
      } else {
        setErr(dbErr.message);
      }
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div>
      <label className="mx-auto mb-2 mt-1 block h-20 w-20 cursor-pointer">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-violet/30 bg-[#08061a]">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl text-[#2d2b4e]">◢</span>
          )}
          <span className="absolute bottom-0 right-0 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-void bg-gradient-to-br from-violet to-cyan text-[11px] text-white">
            +
          </span>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
      </label>
      <p className="mb-4 text-center font-display text-[10px] font-bold tracking-[2px] text-violet">
        TAP TO SET AVATAR
      </p>

      <Alert kind="error">{err}</Alert>

      <Field
        label="Name"
        placeholder="Jordan Reyes"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Username"
        placeholder="nighthawk"
        value={username}
        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
      />

      <NeonButton busy={busy} onClick={confirm}>
        CONFIRM INFORMATION
      </NeonButton>
    </div>
  );
}

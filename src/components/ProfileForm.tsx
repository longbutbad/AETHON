"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDob, parseDob, type Profile } from "@/lib/profile";
import { Alert, Field, NeonButton } from "@/components/ui";

/**
 * Edit/create the signed-in user's profile. Handles avatar upload to the
 * `avatars` storage bucket and upserts the `profiles` row. Used by both the
 * signup flow and the settings screen.
 */
export default function ProfileForm({
  userId,
  email,
  initial,
  submitLabel,
  onSaved,
}: {
  userId: string;
  email?: string | null;
  initial?: Profile | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const supabase = createClient();

  const [name, setName] = useState(
    [initial?.first_name, initial?.last_name].filter(Boolean).join(" "),
  );
  const [username, setUsername] = useState(initial?.username ?? "");
  const [dob, setDob] = useState(formatDob(initial?.dob ?? null));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial?.avatar_url ?? null,
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const save = async () => {
    setErr("");
    setOk("");
    if (!name.trim() || !username.trim()) {
      setErr("Display name and username are required");
      return;
    }
    const dobIso = dob.trim() ? parseDob(dob) : null;
    if (dob.trim() && !dobIso) {
      setErr("Date of birth must be DD / MM / YYYY");
      return;
    }

    setBusy(true);

    // Store the single display name across first/last so displayName() works.
    const parts = name.trim().split(/\s+/);
    const firstName = parts.shift() ?? "";
    const lastName = parts.length ? parts.join(" ") : null;

    let avatarUrl = initial?.avatar_url ?? undefined;

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
      dob: dobIso,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    });

    setBusy(false);
    if (dbErr) {
      setErr(dbErr.message);
      return;
    }
    setOk("Saved");
    onSaved?.();
  };

  return (
    <div>
      <label className="mx-auto mb-3 mt-1.5 block h-20 w-20 cursor-pointer">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-violet/30 bg-[#08061a]">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl text-[#2d2b4e]">◢</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickAvatar}
        />
      </label>
      <p className="mb-3 text-center font-display text-[10px] font-bold tracking-[2px] text-violet">
        TAP TO SET AVATAR
      </p>

      <Alert kind="error">{err}</Alert>
      <Alert kind="ok">{ok}</Alert>

      <Field
        label="Display name"
        placeholder="Jordan Reyes"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Field
        label="Username"
        placeholder="nighthawk"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Field
        label="Date of birth"
        placeholder="DD / MM / YYYY"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
      />

      {email !== undefined && (
        <Field label="Email" value={email ?? ""} disabled readOnly />
      )}

      <NeonButton busy={busy} onClick={save}>
        {submitLabel}
      </NeonButton>
    </div>
  );
}

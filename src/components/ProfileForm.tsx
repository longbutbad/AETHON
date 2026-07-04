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

  const [first, setFirst] = useState(initial?.first_name ?? "");
  const [last, setLast] = useState(initial?.last_name ?? "");
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
    if (!first.trim() || !username.trim()) {
      setErr("First name and username are required");
      return;
    }
    const dobIso = dob.trim() ? parseDob(dob) : null;
    if (dob.trim() && !dobIso) {
      setErr("Date of birth must be DD / MM / YYYY");
      return;
    }

    setBusy(true);
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
      first_name: first.trim(),
      last_name: last.trim() || null,
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

      <div className="flex gap-2">
        <div className="flex-1">
          <Field
            label="First"
            placeholder="Jordan"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Field
            label="Last"
            placeholder="Reyes"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
        </div>
      </div>

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

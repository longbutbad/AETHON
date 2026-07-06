"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NeonShell from "@/components/NeonShell";
import { Alert, Field, NeonButton, TopBar, Wordmark } from "@/components/ui";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // After the email link → /auth/callback exchanged the code, there's a
    // (recovery) session. Confirm it so we know updateUser will work.
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setReady(true);
    });
  }, [supabase]);

  const save = async () => {
    setErr("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1200);
  };

  return (
    <NeonShell>
      <TopBar />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="mb-4 mt-2 flex flex-col items-center">
          <Wordmark />
          <span className="mt-0.5 font-display text-[9px] tracking-[3px] text-cyan/60">
            NEW PASSWORD
          </span>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-gray-600">Checking your reset link…</p>
        ) : done ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h1 className="font-display text-xl font-bold tracking-[2px] text-gray-50">
              PASSWORD UPDATED
            </h1>
            <p className="mt-1 text-[12px] text-gray-500">Signing you in…</p>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <h1 className="mb-1 font-display text-xl font-bold tracking-[2px] text-gray-50">
              LINK EXPIRED
            </h1>
            <p className="text-[12px] leading-relaxed text-gray-500">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <p className="mt-5 text-[11px] text-gray-700">
              <Link href="/forgot-password" className="text-violet hover:text-violet-light">
                Send a new reset link
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-0.5 font-display text-xl font-bold tracking-[2px] text-gray-50">
              SET NEW PASSWORD
            </h1>
            <p className="mb-3 text-[11px] text-gray-600">Choose a new password for your account.</p>

            <Alert kind="error">{err}</Alert>

            <Field
              label="New password"
              type={showPw ? "text" : "password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-xs text-gray-600"
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              }
            />
            <Field
              label="Confirm password"
              type={showPw ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <NeonButton busy={busy} onClick={save}>
              UPDATE PASSWORD
            </NeonButton>
          </>
        )}
      </div>
    </NeonShell>
  );
}

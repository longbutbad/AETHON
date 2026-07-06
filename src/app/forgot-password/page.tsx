"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NeonShell from "@/components/NeonShell";
import { Alert, Field, NeonButton, TopBar, Wordmark } from "@/components/ui";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const sendReset = async () => {
    setErr("");
    if (!email.trim()) {
      setErr("Enter your email address");
      return;
    }
    setBusy(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <NeonShell>
      <TopBar />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="mb-4 mt-2 flex flex-col items-center">
          <Wordmark />
          <span className="mt-0.5 font-display text-[9px] tracking-[3px] text-cyan/60">
            RESET ACCESS
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">📧</div>
            <h1 className="mb-1 font-display text-xl font-bold tracking-[2px] text-gray-50">
              CHECK YOUR INBOX
            </h1>
            <p className="text-[12px] leading-relaxed text-gray-500">
              If an account exists for <span className="text-violet-light">{email}</span>, a
              password-reset link is on its way. Open it to set a new password.
            </p>
            <p className="mt-5 text-[11px] text-gray-700">
              <Link href="/login" className="text-violet hover:text-violet-light">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-0.5 font-display text-xl font-bold tracking-[2px] text-gray-50">
              FORGOT PASSWORD
            </h1>
            <p className="mb-3 text-[11px] text-gray-600">
              We&apos;ll email you a link to reset it.
            </p>

            <Alert kind="error">{err}</Alert>

            <Field
              label="Email"
              type="email"
              placeholder="operator@aethon.net"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReset()}
            />
            <NeonButton busy={busy} onClick={sendReset}>
              SEND RESET LINK
            </NeonButton>

            <p className="mt-3 text-center text-[11px] text-gray-700">
              <Link href="/login" className="text-violet hover:text-violet-light">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </NeonShell>
  );
}

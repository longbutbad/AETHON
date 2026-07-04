"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NeonShell from "@/components/NeonShell";
import { Alert, Field, NeonButton, TopBar, Wordmark } from "@/components/ui";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const signUp = async () => {
    setErr("");
    setInfo("");
    if (!email.trim() || !password) {
      setErr("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already registered") || m.includes("already exists")) {
        setErr("This email already has an account — head to Sign In instead.");
      } else {
        setErr(error.message);
      }
      return;
    }

    // If "Confirm email" is OFF in Supabase, signUp returns a live session and
    // we can go straight to profile setup. If it's ON, there's no session yet.
    if (data.session) {
      router.replace("/setup");
      router.refresh();
    } else {
      setInfo("Account created. You can now sign in.");
    }
  };

  return (
    <NeonShell>
      <TopBar />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="mb-4 mt-2 flex flex-col items-center">
          <span>
            <Wordmark />
          </span>
          <span className="mt-0.5 font-display text-[9px] tracking-[3px] text-cyan/60">
            ENLIST · NEW OPERATOR
          </span>
        </div>

        <h1 className="mb-0.5 font-display text-xl font-bold tracking-[2px] text-gray-50">
          CREATE ACCOUNT
        </h1>
        <p className="mb-3 text-[11px] text-gray-600">
          Sign up with your email and a password.
        </p>

        <Alert kind="error">{err}</Alert>
        <Alert kind="ok">{info}</Alert>

        <Field
          label="Email"
          type="email"
          placeholder="operator@aethon.net"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
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
          onKeyDown={(e) => e.key === "Enter" && signUp()}
        />

        <NeonButton busy={busy} onClick={signUp}>
          CREATE ACCOUNT
        </NeonButton>

        <p className="mt-3 text-center text-[11px] text-gray-700">
          Already enlisted?{" "}
          <Link href="/login" className="font-display font-bold tracking-[1px] text-violet">
            SIGN IN
          </Link>
        </p>
      </div>
    </NeonShell>
  );
}

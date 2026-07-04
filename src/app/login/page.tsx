"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NeonShell from "@/components/NeonShell";
import { Alert, Field, NeonButton, TopBar, Wordmark } from "@/components/ui";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const signIn = async () => {
    setErr("");
    if (!email.trim() || !password) {
      setErr("Enter your email and password");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      const m = error.message.toLowerCase();
      if (m.includes("invalid login credentials")) {
        setErr(
          "Wrong email or password. If you just signed up, use that exact password — or create a new account.",
        );
      } else if (m.includes("email not confirmed")) {
        setErr("Email not confirmed yet — check your inbox.");
      } else {
        setErr(error.message);
      }
      return;
    }

    // Send users who haven't finished profile setup to /setup first.
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .single();
    router.replace(profile?.username ? "/dashboard" : "/setup");
    router.refresh();
  };

  return (
    <NeonShell>
      <TopBar />

      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <div className="mb-4 mt-2 flex flex-col items-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-violet/25 bg-[rgba(6,4,18,0.9)] shadow-[0_0_24px_rgba(139,92,246,0.5)]">
            <span className="font-display text-2xl font-bold text-white">Æ</span>
          </div>
          <span className="mt-1.5">
            <Wordmark />
          </span>
          <span className="mt-0.5 font-display text-[9px] tracking-[3px] text-cyan/60">
            OPERATOR ACCESS
          </span>
        </div>

        <h1 className="mb-0.5 font-display text-xl font-bold tracking-[2px] text-gray-50">
          SIGN IN
        </h1>
        <p className="mb-3 text-[11px] text-gray-600">
          Enter your email and password to continue.
        </p>

        <Alert kind="error">{err}</Alert>

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
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
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

        <NeonButton busy={busy} onClick={signIn}>
          SIGN IN
        </NeonButton>

        <p className="mt-3 text-center text-[11px] text-gray-700">
          Need an account?{" "}
          <Link href="/signup" className="font-display font-bold tracking-[1px] text-violet">
            ENLIST
          </Link>
        </p>
      </div>
    </NeonShell>
  );
}

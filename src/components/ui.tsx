"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/* ── Brand ──────────────────────────────────────────────────────────────── */

export function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <span
      className={
        "font-display font-bold tracking-[5px] text-white " +
        (size === "lg" ? "text-lg" : "text-base tracking-[4px]")
      }
      style={{ textShadow: "0 0 16px rgba(139,92,246,0.7),0 0 24px rgba(6,182,212,0.4)" }}
    >
      AETHON
    </span>
  );
}

export function TopBar({
  onBack,
  tag = "v0.1.0",
}: {
  onBack?: () => void;
  tag?: string;
}) {
  return (
    <div className="flex items-center justify-between px-[18px] pb-1.5 pt-4">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-violet/30 bg-violet/10 text-violet-light transition hover:bg-violet/20"
        >
          <span className="text-lg leading-none">‹</span>
        </button>
      ) : (
        <span className="h-[30px] w-[30px]" />
      )}
      <Wordmark size="sm" />
      <span className="font-display text-[9px] tracking-[2px] text-cyan/60">{tag}</span>
    </div>
  );
}

/* ── Stepper ────────────────────────────────────────────────────────────── */

export function Stepper({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex gap-1 px-[18px] py-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={
            "h-0.5 flex-1 overflow-hidden rounded-[1px] transition-all " +
            (i === active
              ? "bg-gradient-to-r from-violet to-cyan shadow-[0_0_8px_rgba(139,92,246,0.6)]"
              : i < active
                ? "bg-cyan/50"
                : "bg-violet/15")
          }
        />
      ))}
    </div>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────── */

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block font-display text-[10px] font-semibold uppercase tracking-[2.5px] text-violet-700">
      {children}
    </span>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
};

export function Field({ label, icon, rightSlot, className, ...props }: FieldProps) {
  return (
    <div className="mb-[11px]">
      {label && <Label>{label}</Label>}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-sm text-violet-deep">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={
            "w-full rounded-[10px] border border-violet/20 bg-[#08061a] py-[11px] pr-[13px] text-[13px] text-gray-200 transition placeholder:text-[#1f1d35] focus:border-violet focus:shadow-[0_0_0_2px_rgba(139,92,246,0.12)] disabled:opacity-60 " +
            (icon ? "pl-9 " : "pl-[13px] ") +
            (rightSlot ? "pr-10 " : "") +
            (className ?? "")
          }
        />
        {rightSlot && (
          <span className="absolute right-[11px] top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
    </div>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
};

export function NeonButton({ busy, children, disabled, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={
        "clip-edge group relative mt-1 w-full overflow-hidden rounded-[10px] bg-gradient-to-br from-violet-deep to-cyan-deep py-[13px] font-display text-sm font-bold uppercase tracking-[3px] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition hover:shadow-[0_0_32px_rgba(139,92,246,0.55)] disabled:cursor-not-allowed disabled:opacity-55 " +
        (className ?? "")
      }
    >
      {busy ? "PROCESSING…" : children}
    </button>
  );
}

/* ── Alerts ─────────────────────────────────────────────────────────────── */

export function Alert({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  if (!children) return null;
  const styles =
    kind === "error"
      ? "border-red-500/20 bg-red-500/[0.08] text-red-400"
      : "border-green-500/20 bg-green-500/[0.08] text-green-300";
  return (
    <div
      className={
        "mb-2 rounded-lg border px-3 py-2 text-center font-display text-[11px] tracking-[0.5px] " +
        styles
      }
    >
      {kind === "error" ? "⚠ " : ""}
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="mx-auto mb-[18px] mt-1 h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-violet/15 border-t-violet" />
  );
}

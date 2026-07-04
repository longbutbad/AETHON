import type { ReactNode } from "react";
import BackgroundCanvas from "./BackgroundCanvas";

/**
 * Full-screen neon scene with the HUD frame and the centered "device" card —
 * the visual chrome shared by every page in the prototype.
 */
export default function NeonShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void p-5">
      <BackgroundCanvas />

      {/* HUD readouts */}
      <div className="absolute left-3 top-3 z-30 font-display text-[9px] leading-[1.8] tracking-[2px] text-violet/40">
        SYS://AETHON.NET
        <br />
        NODE_07 · SECURE
        <br />
        LAT 51.50 · LON 0.12
      </div>
      <div className="absolute right-3 top-3 z-30 text-right font-display text-[9px] leading-[1.8] tracking-[2px] text-cyan/40">
        LINK ESTABLISHED
        <br />
        ENCRYPTION AES-256
        <br />
        PING 12MS
      </div>
      <div className="absolute bottom-3 left-3 z-30 font-display text-[9px] tracking-[2px] text-violet/30">
        © AETHON DYNAMICS
      </div>
      <div className="absolute bottom-3 right-3 z-30 font-display text-[9px] tracking-[2px] text-cyan/30">
        BUILD 0.1.0
      </div>

      {/* Corner brackets */}
      <span className="absolute left-2 top-2 z-30 h-4 w-4 border-l border-t border-violet/50" />
      <span className="absolute right-2 top-2 z-30 h-4 w-4 border-r border-t border-cyan/50" />
      <span className="absolute bottom-2 left-2 z-30 h-4 w-4 border-b border-l border-violet/50" />
      <span className="absolute bottom-2 right-2 z-30 h-4 w-4 border-b border-r border-cyan/50" />

      {/* Device card */}
      <div className="neon-frame relative z-20 flex min-h-[660px] w-full max-w-[355px] flex-col overflow-hidden rounded-[28px] border border-violet/20 bg-[rgba(6,4,18,0.94)]">
        {children}
      </div>
    </div>
  );
}

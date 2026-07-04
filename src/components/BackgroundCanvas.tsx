"use client";

import { useEffect, useRef } from "react";

type Pt = {
  x: number;
  y: number;
  s: number;
  vx: number;
  vy: number;
  col: string;
  a: number;
};

/**
 * Animated particle / grid background, ported from the prototype's canvas#bgc.
 * Absolutely positioned to fill its nearest positioned ancestor.
 */
export default function BackgroundCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;

    let W = 0;
    let H = 0;
    let pts: Pt[] = [];
    let tt = 0;
    let raf = 0;

    const makePt = (): Pt => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() * 1.1 + 0.2,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      col: Math.random() > 0.5 ? "rgba(139,92,246," : "rgba(6,182,212,",
      a: Math.random() * 0.45 + 0.05,
    });

    const init = () => {
      W = cv.width = cv.offsetWidth;
      H = cv.height = cv.offsetHeight;
      pts = Array.from({ length: 70 }, makePt);
    };

    const draw = () => {
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = "#03030a";
      cx.fillRect(0, 0, W, H);

      cx.strokeStyle = "rgba(139,92,246,0.04)";
      cx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 48) {
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, H);
        cx.stroke();
      }
      for (let y = 0; y < H; y += 48) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(W, y);
        cx.stroke();
      }

      tt += 0.003;
      const g1 = cx.createRadialGradient(
        W * 0.85 + Math.sin(tt) * 30,
        H * 0.1,
        0,
        W * 0.85,
        H * 0.1,
        220,
      );
      g1.addColorStop(0, "rgba(139,92,246,0.2)");
      g1.addColorStop(1, "transparent");
      cx.fillStyle = g1;
      cx.fillRect(0, 0, W, H);

      const g2 = cx.createRadialGradient(
        W * 0.08 + Math.cos(tt * 0.7) * 20,
        H * 0.9,
        0,
        W * 0.08,
        H * 0.9,
        180,
      );
      g2.addColorStop(0, "rgba(6,182,212,0.15)");
      g2.addColorStop(1, "transparent");
      cx.fillStyle = g2;
      cx.fillRect(0, 0, W, H);

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        cx.beginPath();
        cx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        cx.fillStyle = p.col + p.a + ")";
        cx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />
  );
}

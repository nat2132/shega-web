"use client";

import { useEffect, useRef } from "react";
import { useMousePosition } from "@/hooks/useMousePosition";

interface Orb {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  phase: number;
  color: string;
  opacity: number;
}

const orbs: Orb[] = [
  { x: 15, y: 20, size: 600, speedX: 0.08, speedY: 0.06, phase: 0, color: "var(--accent)", opacity: 0.04 },
  { x: 70, y: 50, size: 500, speedX: -0.05, speedY: 0.09, phase: 1.5, color: "var(--accent)", opacity: 0.025 },
  { x: 40, y: 75, size: 400, speedX: 0.06, speedY: -0.04, phase: 3, color: "#ffffff", opacity: 0.03 },
  { x: 85, y: 30, size: 350, speedX: -0.07, speedY: -0.05, phase: 4.5, color: "var(--accent)", opacity: 0.02 },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function SceneOrbs() {
  const { normalizedX, normalizedY } = useMousePosition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    let running = true;

    const draw = (time: number) => {
      if (!running) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseOffsetX = normalizedX * 30;
      const mouseOffsetY = normalizedY * 30;
      const baseTime = time / 1000;
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0071e3";

      for (const orb of orbs) {
        const x = (orb.x / 100) * canvas.width + Math.sin(baseTime * orb.speedX + orb.phase) * 80 + mouseOffsetX * 0.3;
        const y = (orb.y / 100) * canvas.height + Math.cos(baseTime * orb.speedY + orb.phase) * 60 + mouseOffsetY * 0.3;
        const r = orb.size;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);

        if (orb.color === "var(--accent)") {
          gradient.addColorStop(0, hexToRgba(accent, orb.opacity + 0.01));
          gradient.addColorStop(0.5, hexToRgba(accent, orb.opacity * 0.5));
        } else {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${orb.opacity + 0.01})`);
          gradient.addColorStop(0.5, `rgba(255, 255, 255, ${orb.opacity * 0.3})`);
        }
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
    };
  }, [normalizedX, normalizedY]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ mixBlendMode: "normal" }}
      aria-hidden="true"
    />
  );
}

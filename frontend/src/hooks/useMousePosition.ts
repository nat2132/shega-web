"use client";

import { useState, useEffect, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMousePosition(): MousePosition {
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setPos({
          x: e.clientX,
          y: e.clientY,
          normalizedX: (e.clientX / window.innerWidth - 0.5) * 2,
          normalizedY: (e.clientY / window.innerHeight - 0.5) * 2,
        });
      });
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handler);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return pos;
}

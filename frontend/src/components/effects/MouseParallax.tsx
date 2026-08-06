"use client";

import { useRef, type ReactNode } from "react";
import { useMousePosition } from "@/hooks/useMousePosition";

interface MouseParallaxProps {
  children: ReactNode;
  factor?: number;
  className?: string;
}

export function MouseParallax({ children, factor = 0.03, className }: MouseParallaxProps) {
  const { normalizedX, normalizedY } = useMousePosition();
  const ref = useRef<HTMLDivElement>(null);

  const x = normalizedX * factor * 100;
  const y = normalizedY * factor * 100;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: "transform 0.15s ease-out",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

interface TiltedCardProps {
  children: ReactNode;
  className?: string;
  containerHeight?: string;
  containerWidth?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  glare?: boolean;
}

export default function TiltedCard({
  children,
  className = "",
  containerHeight = "100%",
  containerWidth = "100%",
  scaleOnHover = 1.02,
  rotateAmplitude = 8,
  glare = true,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);

  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    if (glare) {
      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;
      setGlareX(gx);
      setGlareY(gy);
    }
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
  }

  function handleMouseLeave() {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth,
        perspective: "1000px",
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-[inherit]"
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d",
        }}
      >
        {children}

        {glare && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

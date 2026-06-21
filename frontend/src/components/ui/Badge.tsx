"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  default:
    "bg-white/5 text-gray-300 border-white/10",
  success:
    "bg-green-500/10 text-green-400 border-green-500/20",
  warning:
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger:
    "bg-red-500/10 text-red-400 border-red-500/20",
  info:
    "bg-sky-500/10 text-sky-400 border-sky-500/20",
  premium:
    "bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-transparent bg-clip-text bg-[length:200%_200%] animate-gradient border-indigo-500/20 [&>span]:bg-linear-to-r [&>span]:from-indigo-400 [&>span]:via-purple-400 [&>span]:to-pink-400 [&>span]:bg-clip-text [&>span]:text-transparent",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px] leading-4",
  md: "px-2.5 py-1 text-xs",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  children: ReactNode;
}

function Badge({
  variant = "default",
  size = "md",
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium backdrop-blur-xs",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps };

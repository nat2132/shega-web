"use client";

import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

interface LoadingSpinnerProps {
  size?: keyof typeof sizeStyles;
  fullScreen?: boolean;
  className?: string;
}

function LoadingSpinner({
  size = "md",
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-white/20 border-t-indigo-400 border-r-purple-400",
        sizeStyles[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export { LoadingSpinner };
export type { LoadingSpinnerProps };

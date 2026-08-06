"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hoverable?: boolean;
  glow?: boolean;
}

function GlassCard({
  children,
  className,
  hoverable = false,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-2xl backdrop-blur-xl border transition-all duration-300",
        "glass-inner-highlight glass",
        glow && "shadow-[0_0_60px_-12px_rgba(0,0,0,0.1)]",
        hoverable && "cursor-pointer hover:shadow-[0_12px_48px_-8px_rgba(0,0,0,0.12)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface FeatureCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  icon: LucideIcon;
  title: string;
  description: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  ...props
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative rounded-2xl glass p-6 transition-all duration-300 cursor-default glass-shine glass-inner-highlight hover:shadow-[0_12px_48px_-8px_rgba(0,0,0,0.12)] hover:border-white/[0.12]",
        className
      )}
      {...props}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] backdrop-blur-sm text-foreground border border-white/[0.06] transition-all duration-300 group-hover:bg-white/[0.1] group-hover:border-white/[0.12] group-hover:shadow-[0_0_24px_rgba(255,255,255,0.04)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </motion.div>
  );
}

interface StatCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  label: string;
  value: string | number;
  trend?: "up" | "down";
  trendValue?: string;
  icon: LucideIcon;
}

function StatCard({
  label,
  value,
  trend,
  trendValue,
  icon: Icon,
  className,
  ...props
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-2xl glass p-5 transition-all duration-300 glass-inner-highlight hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              {trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className={cn("text-xs font-medium", trend === "up" ? "text-green-400" : "text-red-400")}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06] text-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export { GlassCard, FeatureCard, StatCard };
export type { GlassCardProps, FeatureCardProps, StatCardProps };

"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hoverable?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

function GlassCard({
  children,
  className,
  hoverable = false,
  gradient = false,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-2xl backdrop-blur-xl border transition-all duration-300",
        gradient
          ? "bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/5 border-indigo-500/15"
          : "bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]",
        glow && "shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]",
        hoverable && "cursor-pointer",
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
  iconColor?: string;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  iconColor,
  className,
  ...props
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-6 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_-8px_rgba(99,102,241,0.15)] cursor-default",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm",
          iconColor
            ? `bg-${iconColor}/10 text-${iconColor}`
            : "bg-indigo-500/10 text-indigo-400"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-400">{description}</p>
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
        "rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.12)]",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              {trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" ? "text-green-400" : "text-red-400"
                )}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export { GlassCard, FeatureCard, StatCard };
export type { GlassCardProps, FeatureCardProps, StatCardProps };

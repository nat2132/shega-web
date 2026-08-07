"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  ShieldCheck,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import api from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

interface StatCardData {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgClass: string;
}

interface RecentActivity {
  id: number;
  action: string;
  resource: string;
  time?: string;
  admin?: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardMetrics>("/admin/dashboard/")
      .then(({ data }) => setMetrics(data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  const statCards: StatCardData[] = [
    { label: "Total Customers", value: metrics?.totalBusinesses ?? metrics?.total_customers ?? 0, icon: Users, iconBgClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { label: "Active Licenses", value: metrics?.activeSubscriptions ?? metrics?.active_licenses ?? 0, icon: ShieldCheck, iconBgClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { label: "Pending Payments", value: metrics?.pendingPayments ?? metrics?.pending_payments ?? 0, icon: Clock, iconBgClass: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { label: "Monthly Revenue", value: formatCurrency(metrics?.monthlyRevenue ?? metrics?.monthly_revenue ?? 0), icon: DollarSign, iconBgClass: "bg-green-500/10 text-green-400 border-green-500/20" },
  ];

  const basic = metrics?.basicSubscribers ?? 0;
  const premium = metrics?.premiumSubscribers ?? 0;
  const expired = metrics?.expiredSubscriptions ?? 0;
  const recentActivity = (metrics?.recentActivity ?? []) as unknown as RecentActivity[];

  const activityIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    approve_payment: CheckCircle2,
    request_payment_info: Clock,
    create_business: Users,
    default: Activity,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-fg-2 text-lg font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-surface text-sm text-fg-2 hover:bg-surface-elevated transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Shega admin overview</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:border-border-soft"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", s.iconBgClass)}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted">{s.label}</p>
            </div>
            <p className="text-2xl font-bold tracking-tight truncate">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl backdrop-blur-xl bg-surface border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity className="h-4 w-4 text-accent" /> Recent Activity
            </h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted">No recent activity</p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide p-2">
              {recentActivity.map((a) => {
                const Icon = activityIcon[a.action] ?? Activity;
                return (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted border border-accent/10">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg-2">{formatAction(a.action)}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {a.resource}
                        {a.time ? ` · ${formatRelativeTime(a.time)}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl backdrop-blur-xl bg-surface border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-sm font-semibold text-fg">Subscription Overview</h3>
          </div>
          <div className="p-6 space-y-4">
            <OverviewRow label="Basic Users" value={basic} tone="text-accent" />
            <OverviewRow label="Premium Users" value={premium} tone="text-emerald-400" />
            <OverviewRow label="Expired Licenses" value={expired} tone="text-red-400" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OverviewRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn("text-lg font-bold", tone)}>{value}</span>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    approve_payment: "Payment approved",
    reject_payment: "Payment rejected",
    request_payment_info: "Additional info requested",
    create_business: "Customer registered",
    suspend_business: "Business suspended",
    activate_business: "Business activated",
    create_license: "License created",
    extend_subscription: "Subscription extended",
    renew_subscription: "Subscription renewed",
  };
  return map[action] || action.replace(/_/g, " ");
}
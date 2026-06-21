"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Key,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { DashboardMetrics, User, Payment, License } from "@/lib/types";
import { StatCard } from "@/components/ui/Card";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function RevenueLineChart({ data }: { data: { date: string; amount: number }[] }) {
  if (!data || data.length < 2) return null;
  const w = 400, h = 160;
  const max = Math.max(...data.map((d) => d.amount));
  const min = Math.min(...data.map((d) => d.amount));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.amount - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  });
  const fillPoints = `${points.join(" ")} ${w},${h + 10} 0,${h + 10}`;
  return (
    <svg viewBox={`0 0 ${w} ${h + 10}`} className="w-full h-40">
      <defs>
        <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(156,163,175,0.3)" />
          <stop offset="100%" stopColor="rgba(156,163,175,0)" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#revGrad)" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
        <g key={i}>
          <text x={(i / (data.length - 1)) * w} y={h + 20} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {formatDate(data[i].date, { month: "short", day: "numeric" })}
          </text>
        </g>
      ))}
    </svg>
  );
}

function LicenseBarChart({ data }: { data: Record<string, number> }) {
  if (!data || !Object.keys(data).length) return null;
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v));
  const w = 400, h = 140;
  const barW = Math.min(50, (w - 40) / entries.length - 8);
  return (
    <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full h-40">
      {entries.map(([key, value], i) => {
        const x = 20 + i * ((w - 40) / entries.length);
        const barH = (value / max) * (h - 20);
        return (
          <g key={key}>
            <rect
              x={x}
              y={h - barH}
              width={barW}
              height={barH}
              rx={4}
              className="fill-gray-400/70"
            />
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" className="fill-gray-500 text-[9px]">
              {key.slice(0, 6)}
            </text>
            <text x={x + barW / 2} y={h - barH - 6} textAnchor="middle" className="fill-gray-400 text-[10px] font-medium">
              {value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TableCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden", className)}>
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<User[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [metricsRes, custRes, payRes, licRes] = await Promise.all([
          api.get<DashboardMetrics>("/admin/dashboard/"),
          api.get<{ results: User[] }>("/admin/customers/", { params: { page: 1, page_size: 10 } }),
          api.get<{ results: Payment[] }>("/admin/payments/", { params: { status: "pending" } }),
          api.get<{ results: License[] }>("/admin/licenses/", { params: { expiring_soon: true } }),
        ]);
        setMetrics(metricsRes.data);
        setRecentCustomers(custRes.data.results);
        setPendingPayments(payRes.data.results);
        setExpiringLicenses(licRes.data.results);
      } catch {
        /* ignore */
      }
    }
    load();
  }, []);

  const stats = [
    { label: "Total Customers", value: metrics?.total_customers ?? 0, icon: Users, trend: "up" as const, trendValue: `${metrics?.recent_registrations ?? 0} new` },
    { label: "Active Licenses", value: metrics?.active_licenses ?? 0, icon: Key, trend: "up" as const, trendValue: "12% this month" },
    { label: "Expired Licenses", value: metrics?.license_status_distribution?.expired ?? 0, icon: AlertTriangle, trend: "down" as const, trendValue: "8% decrease" },
    { label: "Revenue (ETB)", value: formatCurrency(metrics?.total_revenue ?? 0), icon: DollarSign, trend: "up" as const, trendValue: `${formatCurrency(metrics?.monthly_revenue ?? 0)} this month` },
    { label: "Renewals Due", value: metrics?.expiring_soon ?? 0, icon: RefreshCw, trend: "down" as const, trendValue: "Due this month" },
    { label: "Activations", value: metrics?.pending_payments ?? 0, icon: Activity, trend: "up" as const, trendValue: "Pending approval" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your license management platform</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} trend={s.trend} trendValue={s.trendValue} />
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Revenue Trend</h3>
              <p className="text-xs text-gray-500">Last 12 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-xs font-medium">+18.2%</span>
            </div>
          </div>
          <RevenueLineChart data={metrics?.revenue_chart ?? []} />
        </div>
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">License Distribution</h3>
              <p className="text-xs text-gray-500">By status</p>
            </div>
          </div>
          <LicenseBarChart data={metrics?.license_status_distribution ?? {}} />
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <TableCard title="Recent Customers">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.slice(0, 10).map((c, i) => (
                  <tr key={c.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-gray-200">{c.full_name}</td>
                    <td className="px-5 py-3 text-gray-400">{c.email}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.is_active ? "bg-white/[0.06] text-gray-300" : "bg-white/[0.03] text-gray-500")}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentCustomers.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-500">No recent customers</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
        <TableCard title="Pending Payments">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-gray-200">{p.customer?.full_name || "N/A"}</td>
                    <td className="px-5 py-3 text-gray-300">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-gray-300">
                        Pending
                      </span>
                    </td>
                  </tr>
                ))}
                {pendingPayments.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-500">No pending payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
        <TableCard title="Expiring This Month">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">License Key</th>
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {expiringLicenses.map((l) => (
                  <tr key={l.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="font-mono text-xs text-gray-200 px-5 py-3">{l.license_key}</td>
                    <td className="px-5 py-3 text-gray-400">{l.customer?.full_name || "N/A"}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(l.expiry_date)}</td>
                  </tr>
                ))}
                {expiringLicenses.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-500">None expiring soon</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      </motion.div>
    </motion.div>
  );
}

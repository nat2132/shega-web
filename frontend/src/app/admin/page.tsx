"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Clock,
  Key,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  XCircle,
  FileCheck,
  Ban,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatCurrency, formatRelativeTime, cn } from "@/lib/utils";
import type { DashboardMetrics, Payment, License, User } from "@/lib/types";
import api from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface StatCardData {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
  bgClass: string;
  iconBgClass: string;
}

const statCards: StatCardData[] = [
  { label: "Total Users", value: 0, icon: Users, trend: "up", trendValue: "Registered users", bgClass: "bg-gradient-to-br from-indigo-500/5 to-indigo-600/10", iconBgClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { label: "Total Businesses", value: 0, icon: Building2, trend: "up", trendValue: "Registered businesses", bgClass: "bg-gradient-to-br from-blue-500/5 to-blue-600/10", iconBgClass: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { label: "Active Subscriptions", value: 0, icon: Key, trend: "up", trendValue: "Live licenses", bgClass: "bg-gradient-to-br from-emerald-500/5 to-emerald-600/10", iconBgClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { label: "Pending Payments", value: 0, icon: Clock, trend: "up", trendValue: "Needs review", bgClass: "bg-gradient-to-br from-amber-500/5 to-amber-600/10", iconBgClass: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "Expired Licenses", value: 0, icon: AlertTriangle, trend: "down", trendValue: "Needs renewal", bgClass: "bg-gradient-to-br from-red-500/5 to-red-600/10", iconBgClass: "bg-red-500/10 text-red-400 border-red-500/20" },
  { label: "Total Revenue", value: "ETB 0", icon: DollarSign, trend: "up", trendValue: "All-time revenue", bgClass: "bg-gradient-to-br from-green-500/5 to-green-600/10", iconBgClass: "bg-green-500/10 text-green-400 border-green-500/20" },
];

function AreaChart({ data, color = "rgba(99,102,241,0.3)", stroke = "#818cf8" }: { data: { date: string; amount: number }[]; color?: string; stroke?: string }) {
  if (!data || data.length < 2) return <div className="flex h-40 items-center justify-center text-sm text-gray-500">Insufficient data</div>;
  const w = 400; const h = 160; const pad = 10;
  const max = Math.max(...data.map(d => d.amount)); const min = Math.min(...data.map(d => d.amount));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((d.amount - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const fillPoints = `${points.join(" ")} ${pad + (data.length - 1) / (data.length - 1) * (w - 2 * pad)},${h} ${pad},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <defs><linearGradient id={`grad-${color.replace(/[^a-z0-9]/g, "")}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} /><stop offset="100%" stopColor={`${color.replace("0.3", "0")}`} /></linearGradient></defs>
      <polygon points={fillPoints} fill={`url(#grad-${color.replace(/[^a-z0-9]/g, "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={pad + (i / (data.length - 1)) * (w - 2 * pad)} y={h - 2} textAnchor="middle" className="fill-gray-500 text-[9px]">
          {formatDate(data[i].date, { month: "short", day: "numeric", hideTime: true })}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ data, color = "rgba(99,102,241,0.5)" }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data || data.length === 0) return <div className="flex h-40 items-center justify-center text-sm text-gray-500">No data</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2 py-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 text-xs text-gray-400 truncate text-right">{d.label}</span>
          <div className="flex-1 h-5 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
          <span className="w-12 text-xs text-gray-300 font-medium">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function computePieSlices(data: { label: string; value: number; color: string }[], total: number) {
  const cx = 80; const cy = 80; const r = 60;
  let cumulative = 0;
  return data.map(d => {
    const startAngle = (cumulative / total) * 360;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad); const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad); const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { path, color: d.color, label: d.label, value: d.value, pct: ((d.value / total) * 100).toFixed(0) };
  });
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const slices = computePieSlices(data, total);
  const cx = 80; const cy = 80;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
        {slices.map((s, i) => <motion.path key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15 }} d={s.path} fill={s.color} style={{ transformOrigin: `${cx}px ${cy}px` }} />)}
        <circle cx={cx} cy={cy} r={28} className="fill-[#0a0a0f]" />
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-gray-400">{s.label}</span>
            <span className="text-gray-300 font-medium">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}

interface ActivityItem {
  id: number;
  type: 'payment' | 'registration' | 'renewal' | 'approval' | 'rejection' | 'suspension';
  description: string;
  timestamp: string;
  actor: string;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'payment': return CreditCard;
    case 'registration': return UserPlus;
    case 'renewal': return RefreshCw;
    case 'approval': return FileCheck;
    case 'rejection': return XCircle;
    case 'suspension': return Ban;
  }
}

function getCustomerName(c: number | User | undefined): string {
  if (typeof c === 'object' && c) return c.full_name || c.business_name || 'N/A';
  return 'N/A';
}

function getActivityColor(type: ActivityItem['type']) {
  switch (type) {
    case 'payment': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'registration': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'renewal': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'approval': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'rejection': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'suspension': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<User[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<License[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, custRes, payRes] = await Promise.all([
          api.get<DashboardMetrics>("/admin/dashboard/"),
          api.get<{ results: User[] }>("/admin/businesses/", { params: { page: 1, page_size: 5 } }),
          api.get<{ results: Payment[] }>("/admin/payments/", { params: { status: "pending" } }),
        ]);
        setMetrics(metricsRes.data);
        setRecentCustomers(custRes.data.results);
        setPendingPayments(payRes.data.results);
        setExpiringLicenses((metricsRes.data.expiringSoon ?? []) as License[]);
        setActivities([
          { id: 1, type: 'registration', description: 'Abeba Trading PLC registered', timestamp: new Date().toISOString(), actor: 'System' },
          { id: 2, type: 'payment', description: 'ETB 5,000 payment from ethio-import', timestamp: new Date(Date.now() - 900000).toISOString(), actor: 'System' },
          { id: 3, type: 'renewal', description: 'License LIC-2024-0891 renewed for 1 year', timestamp: new Date(Date.now() - 1800000).toISOString(), actor: 'Admin' },
          { id: 4, type: 'approval', description: 'Payment #1024 approved - Basic plan', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'Admin' },
          { id: 5, type: 'rejection', description: 'Payment #1023 rejected - invalid receipt', timestamp: new Date(Date.now() - 7200000).toISOString(), actor: 'Admin' },
          { id: 6, type: 'registration', description: 'Sheger Construction joined', timestamp: new Date(Date.now() - 10800000).toISOString(), actor: 'System' },
          { id: 7, type: 'suspension', description: 'LIC-2023-0456 suspended - payment overdue', timestamp: new Date(Date.now() - 14400000).toISOString(), actor: 'System' },
        ]);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getStatValue(i: number): string | number {
    switch (i) {
      case 0: return metrics?.total_customers ?? 0;
      case 1: return metrics?.totalBusinesses ?? metrics?.total_customers ?? 0;
      case 2: return metrics?.activeSubscriptions ?? metrics?.active_licenses ?? 0;
      case 3: return metrics?.pendingPayments ?? metrics?.pending_payments ?? 0;
      case 4: return metrics?.expiredSubscriptions ?? metrics?.license_status_distribution?.expired ?? 0;
      case 5: return formatCurrency(metrics?.total_revenue ?? metrics?.monthlyRevenue ?? metrics?.monthly_revenue ?? 0);
      default: return 0;
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">Failed to load dashboard</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] text-sm text-gray-300 hover:bg-white/[0.1] transition-all">
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
        <p className="mt-1 text-sm text-gray-500">Real-time overview of your SHEGA platform</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {statCards.map((s, i) => {
          const val = getStatValue(i);
          return (
            <motion.div
              key={s.label}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn("rounded-2xl border border-white/[0.06] p-4 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]", s.bgClass)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", s.iconBgClass)}>
                  {(() => { const Icon = s.icon; return <Icon className="h-4 w-4" />; })()}

                </div>
                {s.trend && (
                  <div className={cn("flex items-center gap-0.5 text-xs font-medium", s.trend === "up" ? "text-emerald-400" : "text-red-400")}>
                    {s.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight truncate">{val}</p>
              <p className="text-xs text-gray-500 mt-1 truncate">{s.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <ChartCard title="Revenue Trend" subtitle="Last 12 months">
          <AreaChart data={metrics?.revenueTrend ?? metrics?.revenue_chart ?? []} />
        </ChartCard>
        <ChartCard title="Subscription Growth" subtitle="New subscriptions over time">
          <AreaChart
            data={(metrics?.revenueTrend ?? metrics?.revenue_chart ?? []).map((d) => ({ date: d.date, amount: Math.round(d.amount / 500) }))}
            color="rgba(16,185,129,0.3)"
            stroke="#34d399"
          />
        </ChartCard>
        <ChartCard title="Trial Conversion Rate" subtitle="Free to paid conversion">
          <BarChart
            data={[
              { label: "Signed Up", value: 240 },
              { label: "Started Trial", value: 180 },
              { label: "Active Trial", value: 120 },
              { label: "Converted", value: 72 },
              { label: "Churned", value: 48 },
            ]}
            color="rgba(139,92,246,0.5)"
          />
        </ChartCard>
        <ChartCard title="Mobile vs Desktop" subtitle="Platform distribution">
          <PieChart
            data={[
              { label: "Mobile", value: 68, color: "#6366f1" },
              { label: "Desktop", value: 32, color: "#22d3ee" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Subscription Distribution" subtitle="By plan type">
          <BarChart
            data={[
              { label: "Basic Monthly", value: 145 },
              { label: "Basic Quarterly", value: 82 },
              { label: "Premium Monthly", value: 63 },
              { label: "Premium Quarterly", value: 41 },
              { label: "Lifetime", value: 12 },
            ]}
            color="rgba(245,158,11,0.5)"
          />
        </ChartCard>
        <ChartCard title="Expiring This Month" subtitle="Licenses nearing expiry">
          {expiringLicenses.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-500">No licenses expiring this month</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
              {expiringLicenses.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                  <div>
                    <p className="text-xs font-mono text-gray-300">{l.license_key}</p>
                    <p className="text-[10px] text-gray-500">{getCustomerName(l.customer)}</p>
                  </div>
                  <span className="text-[10px] text-red-400 font-medium">{formatDate(l.expiry_date, { hideTime: true })}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <TableCard title="Recent Registrations">
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
                {recentCustomers.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-gray-200">{c.full_name || c.business_name || "—"}</td>
                    <td className="px-5 py-3 text-gray-400">{c.email}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", c.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.03] text-gray-500")}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentCustomers.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-500">No recent registrations</td></tr>
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
                    <td className="px-5 py-3 text-gray-200">{getCustomerName(p.customer)}</td>
                    <td className="px-5 py-3 text-gray-300">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-xs font-medium">Pending</span>
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

        <TableCard title="Recent Activity">
          <div className="max-h-[260px] overflow-y-auto scrollbar-hide">
            {activities.map((act) => {
              const Icon = getActivityIcon(act.type);
              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 px-5 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", getActivityColor(act.type))}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{act.description}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatRelativeTime(act.timestamp)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TableCard>
      </motion.div>
    </motion.div>
  );
}

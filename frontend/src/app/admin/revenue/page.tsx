"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowUpRight,
  Smartphone,
  Monitor,
  Gem,
  Crown,
  CreditCard,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { RevenueMetrics } from "@/lib/types";
import api from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

function LineChart({ data, height = 160, color = "#818cf8", gradientColor = "rgba(99,102,241,0.3)" }: {
  data: { date: string; amount: number }[];
  height?: number;
  color?: string;
  gradientColor?: string;
}) {
  if (!data || data.length < 2) return <div className="flex items-center justify-center h-40 text-sm text-gray-500">Insufficient data</div>;
  const w = 400; const h = height; const pad = 10;
  const max = Math.max(...data.map(d => d.amount)); const min = Math.min(...data.map(d => d.amount));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((d.amount - min) / range) * (h - 2 * pad);
    return { x, y, ...d };
  });
  const linePoints = points.map(p => `${p.x},${p.y}`).join(" ");
  const fillPoints = `${points[0].x},${h} ${linePoints} ${points[points.length - 1].x},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs><linearGradient id="rev-chart-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={gradientColor} /><stop offset="100%" stopColor={`${gradientColor.replace("0.3", "0")}`} /></linearGradient></defs>
      <polygon points={fillPoints} fill="url(#rev-chart-grad)" />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={points[i]?.x || 0} y={h - 2} textAnchor="middle" className="fill-gray-500 text-[9px]">
          {formatDate(data[i].date, { month: "short", day: "numeric", hideTime: true })}
        </text>
      ))}
    </svg>
  );
}

function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-gray-500 text-center py-8">No data</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-3 py-4">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        const width = 40 + (pct / 100) * 50;
        return (
          <div key={d.stage} className="flex items-center gap-4">
            <span className="w-28 text-xs text-gray-400 text-right">{d.stage}</span>
            <div className="flex-1 flex justify-center">
              <div className="relative h-8 rounded-lg transition-all duration-700 flex items-center justify-center bg-gradient-to-r from-indigo-500/40 to-purple-500/40 border border-indigo-500/20"
                style={{ width: `${width}%` }}>
                <span className="text-xs font-semibold text-gray-200">{d.count.toLocaleString()}</span>
              </div>
            </div>
            <span className="w-12 text-xs text-gray-500">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({ data }: { data: { label: string; value: number; icon?: React.ComponentType<{ className?: string }> }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ["rgba(99,102,241,0.5)", "rgba(16,185,129,0.5)", "rgba(245,158,11,0.5)", "rgba(236,72,153,0.5)", "rgba(20,184,166,0.5)"];
  return (
    <div className="space-y-3 py-2">
      {data.map((d, i) => (
        <div key={d.label} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {d.icon ? (() => { const Icon = d.icon; return <Icon className="h-3.5 w-3.5 text-gray-400" />; })() : null}
              <span className="text-xs text-gray-400">{d.label}</span>
            </div>
            <span className="text-xs text-gray-200 font-medium">{formatCurrency(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="h-full rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RevenuePage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<RevenueMetrics>("/admin/revenue/");
        setMetrics(data);
      } catch {
        setError("Failed to load revenue data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Management</h1>
          <p className="mt-1 text-sm text-gray-500">Track earnings, growth, and financial metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={FileText}>CSV</Button>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet}>Excel</Button>
          <Button variant="secondary" size="sm" icon={Printer}>PDF</Button>
          <Button size="sm" icon={Download}>Export All</Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Daily Revenue", value: metrics?.daily ?? 0, trend: "up", pct: "+12.5%", icon: DollarSign, bg: "bg-gradient-to-br from-emerald-500/5 to-emerald-600/10", iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
          { label: "Weekly Revenue", value: metrics?.weekly ?? 0, trend: "up", pct: "+8.3%", icon: TrendingUp, bg: "bg-gradient-to-br from-blue-500/5 to-blue-600/10", iconBg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
          { label: "Monthly Revenue", value: metrics?.monthly ?? 0, trend: "up", pct: "+18.2%", icon: DollarSign, bg: "bg-gradient-to-br from-violet-500/5 to-violet-600/10", iconBg: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
          { label: "Annual Revenue", value: metrics?.annual ?? 0, trend: "up", pct: "+42.1%", icon: TrendingUp, bg: "bg-gradient-to-br from-amber-500/5 to-amber-600/10", iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
        ].map((s) => (
          <motion.div key={s.label} whileHover={{ y: -2 }} className={cn("rounded-2xl border border-white/[0.06] p-5 transition-all", s.bg)}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">{s.label}</span>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", s.iconBg)}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(s.value)}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {s.trend === "up" ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
              <span className={cn("text-xs font-medium", s.trend === "up" ? "text-emerald-400" : "text-red-400")}>{s.pct}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Revenue Growth</h3>
            <p className="text-xs text-gray-500 mt-0.5">Monthly revenue trend</p>
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : <LineChart data={metrics?.growth_chart ?? []} />}
        </div>
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Subscription Revenue</h3>
            <p className="text-xs text-gray-500 mt-0.5">Recurring revenue over time</p>
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : <LineChart data={metrics?.subscription_chart ?? []} color="#34d399" gradientColor="rgba(16,185,129,0.3)" />}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Premium Conversion Funnel</h3>
            <p className="text-xs text-gray-500 mt-0.5">Free trial to paid conversion</p>
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : (
            <FunnelChart data={metrics?.premium_conversion ?? [
              { stage: "Sign Ups", count: 1240 },
              { stage: "Trial Started", count: 892 },
              { stage: "Active Trial", count: 645 },
              { stage: "Converted", count: 312 },
              { stage: "Churned", count: 180 },
            ]} />
          )}
        </div>

        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Revenue by Platform</h3>
            <p className="text-xs text-gray-500 mt-0.5">Mobile vs Desktop breakdown</p>
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : (
            <HorizontalBar
              data={(metrics?.by_platform ?? [
                { platform: "Mobile", amount: 245000 },
                { platform: "Desktop", amount: 118000 },
              ]).map(d => ({ label: d.platform, value: d.amount, icon: d.platform === "Mobile" ? Smartphone : Monitor }))}
            />
          )}
        </div>

        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Revenue by Plan</h3>
            <p className="text-xs text-gray-500 mt-0.5">Basic vs Premium distribution</p>
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : (
            <HorizontalBar
              data={(metrics?.by_plan ?? [
                { plan: "Basic", amount: 198000 },
                { plan: "Premium", amount: 165000 },
              ]).map(d => ({ label: d.plan, value: d.amount, icon: d.plan === "Basic" ? Gem : Crown }))}
            />
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Revenue by Payment Method</h3>
              <p className="text-xs text-gray-500 mt-0.5">Transaction method breakdown</p>
            </div>
            <CreditCard className="h-4 w-4 text-gray-500" />
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : (
            <HorizontalBar
              data={(metrics?.by_payment_method ?? [
                { method: "Telebirr", amount: 185000 },
                { method: "CBEBirr", amount: 96000 },
                { method: "Bank Transfer", amount: 52000 },
                { method: "Cash", amount: 18000 },
              ]).map(d => ({ label: d.method, value: d.amount, icon: CreditCard }))}
            />
          )}
        </div>

        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Renewal Revenue</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recurring renewal income</p>
            </div>
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </div>
          {loading ? <LoadingSpinner size="lg" className="mx-auto" /> : (
            <HorizontalBar
              data={(metrics?.renewal_revenue ?? [
                { period: "This Month", amount: 72000 },
                { period: "Last Month", amount: 65000 },
                { period: "2 Months Ago", amount: 58000 },
                { period: "3 Months Ago", amount: 51000 },
              ]).map(d => ({ label: d.period, value: d.amount }))}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

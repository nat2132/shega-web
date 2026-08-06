"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  Shield,
  Award,
  Users,
  Clock,
  BarChart3,
  Zap,
  DollarSign,
  Repeat,
  UserPlus,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/Card";

interface AnalyticsData {
  most_active_businesses: { name: string; sessions: number }[];
  avg_session_time: number;
  most_used_features: { feature: string; count: number }[];
  premium_feature_usage: number;
  upgrade_rate: number;
  downgrade_rate: number;
  retention_rate: number;
  churn_rate: number;
  arpu: number;
  mrr: number;
  clv: number;
  trial_conversion_rate: number;
  revenue_trend: { date: string; amount: number }[];
}

function MiniSparkline({ data, color = "#818cf8" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ProgressBar({ value, max = 100, color = "bg-indigo-400" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full", color)}
      />
    </div>
  );
}

function MiniBarChart({ data }: { data: { feature: string; count: number }[] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="space-y-1.5 mt-2">
      {data.slice(0, 5).map((d) => (
        <div key={d.feature} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-20 truncate">{d.feature}</span>
          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="h-full rounded-full bg-indigo-400/60"
            />
          </div>
          <span className="text-xs text-gray-300 w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const { data: res } = await api.get<AnalyticsData>("/admin/analytics/");
      setData(res);
      setError(null);
    } catch {
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Avg Session Time",
      value: data?.avg_session_time ? `${Math.round(data.avg_session_time / 60)}m` : "—",
      icon: Clock,
      trend: "up" as const,
      trendValue: "Active",
      sparkline: null,
    },
    {
      label: "Premium Feature Usage",
      value: data?.premium_feature_usage ? `${data.premium_feature_usage}%` : "—",
      icon: Star,
      trend: "up" as const,
      trendValue: "Adoption",
      sparkline: null,
    },
    {
      label: "Upgrade Rate",
      value: data?.upgrade_rate ? `${data.upgrade_rate}%` : "—",
      icon: TrendingUp,
      trend: data?.upgrade_rate && data.upgrade_rate > 0 ? "up" as const : "down" as const,
      trendValue: `${data?.upgrade_rate || 0}%`,
      sparkline: null,
    },
    {
      label: "Downgrade Rate",
      value: data?.downgrade_rate ? `${data.downgrade_rate}%` : "—",
      icon: TrendingDown,
      trend: "down" as const,
      trendValue: `${data?.downgrade_rate || 0}%`,
      sparkline: null,
    },
    {
      label: "Retention Rate",
      value: data?.retention_rate ? `${data.retention_rate}%` : "—",
      icon: Shield,
      trend: "up" as const,
      trendValue: `${data?.retention_rate || 0}%`,
      sparkline: data?.revenue_trend?.map((d) => d.amount) || [],
    },
    {
      label: "Churn Rate",
      value: data?.churn_rate ? `${data.churn_rate}%` : "—",
      icon: Activity,
      trend: "down" as const,
      trendValue: `${data?.churn_rate || 0}%`,
      sparkline: null,
    },
    {
      label: "Avg Revenue / User (ARPU)",
      value: data?.arpu ? formatCurrency(data.arpu) : "—",
      icon: DollarSign,
      trend: "up" as const,
      trendValue: "Per user",
      sparkline: null,
    },
    {
      label: "Monthly Recurring Revenue",
      value: data?.mrr ? formatCurrency(data.mrr) : "—",
      icon: Repeat,
      trend: "up" as const,
      trendValue: "MRR",
      sparkline: null,
    },
    {
      label: "Customer Lifetime Value",
      value: data?.clv ? formatCurrency(data.clv) : "—",
      icon: Award,
      trend: "up" as const,
      trendValue: "LTV",
      sparkline: null,
    },
    {
      label: "Trial Conversion Rate",
      value: data?.trial_conversion_rate ? `${data.trial_conversion_rate}%` : "—",
      icon: UserPlus,
      trend: "up" as const,
      trendValue: `${data?.trial_conversion_rate || 0}%`,
      sparkline: null,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Key metrics and insights</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {metricCards.map((c) => (
          <GlassCard key={c.label} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-gray-300">
                <c.icon className="h-4 w-4" />
              </div>
              {c.sparkline && <MiniSparkline data={c.sparkline} />}
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{c.label}</p>
            <p className="text-lg font-bold text-gray-100">{c.value}</p>
            {c.trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {c.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={cn("text-[10px] font-medium", c.trend === "up" ? "text-green-400" : "text-red-400")}>
                  {c.trendValue}
                </span>
              </div>
            )}
          </GlassCard>
        ))}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Most Active Businesses</h3>
              <p className="text-xs text-gray-500">By session count</p>
            </div>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="space-y-2">
            {data?.most_active_businesses && data.most_active_businesses.length > 0 ? (
              data.most_active_businesses.slice(0, 10).map((b, i) => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                    <span className="text-gray-200 truncate">{b.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{b.sessions} sessions</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No data</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Most Used Features</h3>
              <p className="text-xs text-gray-500">Usage distribution</p>
            </div>
            <BarChart3 className="h-4 w-4 text-gray-500" />
          </div>
          <MiniBarChart data={data?.most_used_features || []} />
          {(!data?.most_used_features || data.most_used_features.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">No data</p>
          )}
        </GlassCard>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-semibold text-gray-100">Upgrade Rate</h3>
          </div>
          <p className="text-3xl font-bold text-green-400 mb-2">{data?.upgrade_rate || 0}%</p>
          <ProgressBar value={data?.upgrade_rate || 0} color="bg-green-400" />
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-gray-100">Churn Rate</h3>
          </div>
          <p className="text-3xl font-bold text-red-400 mb-2">{data?.churn_rate || 0}%</p>
          <ProgressBar value={data?.churn_rate || 0} color="bg-red-400" />
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-100">Trial Conversion</h3>
          </div>
          <p className="text-3xl font-bold text-indigo-400 mb-2">{data?.trial_conversion_rate || 0}%</p>
          <ProgressBar value={data?.trial_conversion_rate || 0} color="bg-indigo-400" />
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  CreditCard,
  FileBarChart,
  Beaker,
  RefreshCw,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/Card";
import toast from "react-hot-toast";

interface ReportDefinition {
  key: string;
  title: string;
  description: string;
  icon: typeof FileText;
  endpoint: string;
  previewData: Record<string, unknown>[];
  previewColumns: { key: string; label: string }[];
}

const reportDefinitions: ReportDefinition[] = [
  {
    key: "revenue",
    title: "Revenue Report",
    description: "View revenue breakdown by period, plan, and payment method",
    icon: TrendingUp,
    endpoint: "/admin/reports/revenue/",
    previewColumns: [
      { key: "period", label: "Period" },
      { key: "revenue", label: "Revenue" },
      { key: "transactions", label: "Transactions" },
      { key: "growth", label: "Growth" },
    ],
    previewData: [
      { period: "Jan 2026", revenue: formatCurrency(125000), transactions: 340, growth: "+12%" },
      { period: "Feb 2026", revenue: formatCurrency(132000), transactions: 365, growth: "+5.6%" },
      { period: "Mar 2026", revenue: formatCurrency(148000), transactions: 402, growth: "+12.1%" },
      { period: "Apr 2026", revenue: formatCurrency(141000), transactions: 388, growth: "-4.7%" },
      { period: "May 2026", revenue: formatCurrency(156000), transactions: 420, growth: "+10.6%" },
    ],
  },
  {
    key: "businesses",
    title: "Businesses Report",
    description: "Business registration trends, active vs inactive breakdown",
    icon: Users,
    endpoint: "/admin/reports/businesses/",
    previewColumns: [
      { key: "period", label: "Period" },
      { key: "new_registrations", label: "New" },
      { key: "active", label: "Active" },
      { key: "inactive", label: "Inactive" },
      { key: "total", label: "Total" },
    ],
    previewData: [
      { period: "Jan 2026", new_registrations: 45, active: 1200, inactive: 180, total: 1380 },
      { period: "Feb 2026", new_registrations: 52, active: 1220, inactive: 175, total: 1395 },
      { period: "Mar 2026", new_registrations: 61, active: 1250, inactive: 170, total: 1420 },
      { period: "Apr 2026", new_registrations: 48, active: 1270, inactive: 165, total: 1435 },
      { period: "May 2026", new_registrations: 55, active: 1295, inactive: 160, total: 1455 },
    ],
  },
  {
    key: "subscriptions",
    title: "Subscriptions Report",
    description: "Subscription distribution by plan type and platform",
    icon: FileBarChart,
    endpoint: "/admin/reports/subscriptions/",
    previewColumns: [
      { key: "plan", label: "Plan" },
      { key: "mobile", label: "Mobile" },
      { key: "desktop", label: "Desktop" },
      { key: "total", label: "Total" },
      { key: "revenue", label: "Revenue" },
    ],
    previewData: [
      { plan: "Basic", mobile: 450, desktop: 280, total: 730, revenue: formatCurrency(145000) },
      { plan: "Premium", mobile: 320, desktop: 195, total: 515, revenue: formatCurrency(257000) },
      { plan: "Trial", mobile: 180, desktop: 95, total: 275, revenue: "—" },
    ],
  },
  {
    key: "payments",
    title: "Payments Report",
    description: "Payment success rates, method distribution, and failures",
    icon: CreditCard,
    endpoint: "/admin/reports/payments/",
    previewColumns: [
      { key: "method", label: "Method" },
      { key: "successful", label: "Successful" },
      { key: "failed", label: "Failed" },
      { key: "total_amount", label: "Total Amount" },
      { key: "success_rate", label: "Success Rate" },
    ],
    previewData: [
      { method: "Telebirr", successful: 1200, failed: 45, total_amount: formatCurrency(240000), success_rate: "96.4%" },
      { method: "Chapa", successful: 850, failed: 28, total_amount: formatCurrency(170000), success_rate: "96.8%" },
      { method: "Bank Transfer", successful: 320, failed: 12, total_amount: formatCurrency(64000), success_rate: "96.4%" },
    ],
  },
  {
    key: "trials",
    title: "Trials Report",
    description: "Trial signups, conversions, and drop-off analysis",
    icon: Beaker,
    endpoint: "/admin/reports/trials/",
    previewColumns: [
      { key: "period", label: "Period" },
      { key: "signups", label: "Signups" },
      { key: "converted", label: "Converted" },
      { key: "expired", label: "Expired" },
      { key: "conversion_rate", label: "Rate" },
    ],
    previewData: [
      { period: "Jan 2026", signups: 180, converted: 72, expired: 108, conversion_rate: "40%" },
      { period: "Feb 2026", signups: 195, converted: 82, expired: 113, conversion_rate: "42%" },
      { period: "Mar 2026", signups: 210, converted: 95, expired: 115, conversion_rate: "45%" },
      { period: "Apr 2026", signups: 188, converted: 75, expired: 113, conversion_rate: "40%" },
      { period: "May 2026", signups: 220, converted: 99, expired: 121, conversion_rate: "45%" },
    ],
  },
  {
    key: "renewals",
    title: "Renewals Report",
    description: "License renewal rates, due soon counts, and expiry trends",
    icon: RefreshCw,
    endpoint: "/admin/reports/renewals/",
    previewColumns: [
      { key: "period", label: "Period" },
      { key: "due", label: "Due" },
      { key: "renewed", label: "Renewed" },
      { key: "lapsed", label: "Lapsed" },
      { key: "renewal_rate", label: "Rate" },
    ],
    previewData: [
      { period: "Jan 2026", due: 230, renewed: 198, lapsed: 32, renewal_rate: "86%" },
      { period: "Feb 2026", due: 245, renewed: 210, lapsed: 35, renewal_rate: "86%" },
      { period: "Mar 2026", due: 260, renewed: 228, lapsed: 32, renewal_rate: "88%" },
      { period: "Apr 2026", due: 240, renewed: 204, lapsed: 36, renewal_rate: "85%" },
      { period: "May 2026", due: 275, renewed: 245, lapsed: 30, renewal_rate: "89%" },
    ],
  },
];

function MiniChartLine() {
  return (
    <svg width="200" height="40" className="w-full h-10">
      <polyline
        points="0,35 20,28 40,30 60,18 80,22 100,10 120,15 140,8 160,12 180,5 200,10"
        fill="none"
        stroke="rgba(129,140,248,0.4)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points="0,35 20,28 40,30 60,18 80,22 100,10 120,15 140,8 160,12 180,5 200,10 200,40 0,40"
        fill="url(#chartGrad)"
      />
      <defs>
        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(129,140,248,0.15)" />
          <stop offset="100%" stopColor="rgba(129,140,248,0)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate(report: ReportDefinition) {
    setGenerating(true);
    try {
      await api.get(report.endpoint);
      setSelectedReport(report);
      toast.success(`${report.title} generated`);
    } catch {
      toast.error(`Failed to generate ${report.title}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport(report: ReportDefinition, format: "csv" | "excel" | "pdf") {
    try {
      const response = await api.get(report.endpoint, {
        params: { export: format },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.key}-report.${format === "excel" ? "xlsx" : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${report.title} exported as ${format.toUpperCase()}`);
    } catch {
      toast.error(`Failed to export ${report.title}`);
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and export system reports</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportDefinitions.map((report) => (
          <GlassCard key={report.key} hoverable className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-gray-300">
                <report.icon className="h-5 w-5" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleExport(report, "csv")}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                  title="Export CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-100 mb-1">{report.title}</h3>
            <p className="text-xs text-gray-500 mb-3">{report.description}</p>
            <MiniChartLine />
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => handleGenerate(report)}
                isLoading={generating}
              >
                Generate
              </Button>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleExport(report, "csv")}>
                  CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleExport(report, "excel")}>
                  Excel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleExport(report, "pdf")}>
                  PDF
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedReport && (
          <motion.div
            key={selectedReport.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <selectedReport.icon className="h-5 w-5 text-gray-300" />
                <h2 className="text-base font-semibold text-gray-100">
                  {selectedReport.title} — Preview
                </h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                    {selectedReport.previewColumns.map((col) => (
                      <th key={col.key} className="px-5 py-3 text-left font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.previewData.map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                      {selectedReport.previewColumns.map((col) => (
                        <td key={col.key} className="px-5 py-3 text-gray-300">
                          {row[col.key] as string}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
              <Button size="sm" variant="ghost" onClick={() => handleExport(selectedReport, "csv")}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleExport(selectedReport, "excel")}>
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleExport(selectedReport, "pdf")}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

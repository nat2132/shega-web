"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  Play,
  CalendarPlus,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  XCircle,
  PauseCircle,
  RotateCcw,
  FileText,
  Smartphone,
  Monitor,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Subscription, PaginatedResponse } from "@/lib/types";
import api from "@/lib/api";

const statusColors: Record<string, "success" | "warning" | "danger" | "default" | "info" | "premium"> = {
  active: "success",
  expired: "danger",
  suspended: "warning",
  cancelled: "default",
  pending: "info",
};

const planBadge: Record<string, "default" | "premium"> = {
  Basic: "default",
  Premium: "premium",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const rowItem = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState<Subscription | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionMenu, setActionMenu] = useState<number | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const stats = {
    active: subscriptions.filter(s => s.status === "active").length,
    expired: subscriptions.filter(s => s.status === "expired").length,
    suspended: subscriptions.filter(s => s.status === "suspended").length,
    basic: subscriptions.filter(s => s.plan === "Basic").length,
    premium: subscriptions.filter(s => s.plan === "Premium").length,
  };

  useEffect(() => {
    loadSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, planFilter, statusFilter, platformFilter]);

  async function loadSubscriptions() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (planFilter) params.plan = planFilter;
      if (statusFilter) params.status = statusFilter;
      if (platformFilter) params.platform = platformFilter;
      const { data } = await api.get<PaginatedResponse<Subscription>>("/admin/subscriptions/", { params });
      setSubscriptions(data.results);
      setTotal(data.count);
    } catch {
      setError("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, action: string, extra?: Record<string, unknown>) {
    setActionLoading(id);
    try {
      await api.post(`/admin/subscriptions/${id}/${action}/`, extra || {});
      setActionMenu(null);
      setExtendModal(null);
      loadSubscriptions();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtend() {
    if (!extendModal) return;
    setActionLoading(extendModal.id);
    try {
      await api.post(`/admin/subscriptions/${extendModal.id}/extend/`, { days: extendDays });
      setExtendModal(null);
      loadSubscriptions();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  function getNewExpiry(sub: Subscription): string {
    const current = sub.expiry_date ? new Date(sub.expiry_date) : new Date();
    const extended = new Date(current.getTime() + extendDays * 86400000);
    return formatDate(extended, { hideTime: true });
  }

  if (error && subscriptions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">{error}</p>
          <Button onClick={loadSubscriptions} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all active and past subscriptions</p>
        </div>
      </motion.div>

      <motion.div variants={rowItem} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: total, color: "text-gray-100" },
          { label: "Active", value: stats.active, color: "text-emerald-400" },
          { label: "Expired", value: stats.expired, color: "text-red-400" },
          { label: "Basic", value: stats.basic, color: "text-teal-400" },
          { label: "Premium", value: stats.premium, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn("text-xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={rowItem} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by key or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadSubscriptions()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Plans</option>
          <option value="Basic">Basic</option>
          <option value="Premium">Premium</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
        <select value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Platforms</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
      </motion.div>

      <motion.div variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Business</th>
                <th className="px-5 py-4 text-left font-medium">License Key</th>
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Plan</th>
                <th className="px-5 py-4 text-left font-medium">Billing</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Start</th>
                <th className="px-5 py-4 text-left font-medium">Expiry</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center"><LoadingSpinner size="lg" className="mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading subscriptions...</p></td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-sm text-gray-500">No subscriptions found</td></tr>
              ) : (
                subscriptions.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    variants={rowItem}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] relative"
                  >
                    <td className="px-5 py-4 text-gray-200 font-medium">{s.business_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-300">{s.license_key}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {s.platform === "mobile" ? <Smartphone className="h-3.5 w-3.5 text-gray-400" /> : <Monitor className="h-3.5 w-3.5 text-gray-400" />}
                        <span className="text-xs text-gray-500 capitalize">{s.platform}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={planBadge[s.plan] || "default"} size="sm">{s.plan}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 capitalize">{s.billing}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusColors[s.status] || "default"} size="sm">{s.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(s.start_date, { hideTime: true })}</td>
                    <td className="px-5 py-4">
                      <span className={cn("text-xs", new Date(s.expiry_date) < new Date() ? "text-red-400" : "text-gray-500")}>
                        {formatDate(s.expiry_date, { hideTime: true })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {s.status === "pending" && (
                          <button onClick={() => handleAction(s.id, "activate")} disabled={actionLoading === s.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-emerald-400 transition-all disabled:opacity-30" title="Activate">
                            {actionLoading === s.id ? <LoadingSpinner size="sm" /> : <Play className="h-4 w-4" />}
                          </button>
                        )}
                        {s.status !== "expired" && s.status !== "cancelled" && (
                          <button onClick={() => setExtendModal(s)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-cyan-400 transition-all" title="Extend">
                            <CalendarPlus className="h-4 w-4" />
                          </button>
                        )}
                        {s.status === "expired" && (
                          <button onClick={() => handleAction(s.id, "renew")} disabled={actionLoading === s.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-emerald-400 transition-all disabled:opacity-30" title="Renew">
                            {actionLoading === s.id ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                          </button>
                        )}
                        <div className="relative">
                          <button onClick={() => setActionMenu(actionMenu === s.id ? null : s.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="More">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                          </button>
                          <AnimatePresence>
                            {actionMenu === s.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#0a0a0f] backdrop-blur-2xl shadow-xl overflow-hidden"
                              >
                                <div className="py-1">
                                  <button onClick={() => { handleAction(s.id, "upgrade"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                    <ArrowUp className="h-3.5 w-3.5" /> Upgrade
                                  </button>
                                  <button onClick={() => { handleAction(s.id, "downgrade"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                    <ArrowDown className="h-3.5 w-3.5" /> Downgrade
                                  </button>
                                  {s.status === "active" && (
                                    <button onClick={() => { handleAction(s.id, "suspend"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                      <PauseCircle className="h-3.5 w-3.5" /> Suspend
                                    </button>
                                  )}
                                  {s.status === "suspended" && (
                                    <button onClick={() => { handleAction(s.id, "restore"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                                    </button>
                                  )}
                                  {s.status !== "cancelled" && (
                                    <button onClick={() => { handleAction(s.id, "cancel"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-white/[0.06] transition-colors">
                                      <XCircle className="h-3.5 w-3.5" /> Cancel
                                    </button>
                                  )}
                                  {(s.status === "expired" || s.status === "cancelled") && (
                                    <button onClick={() => { handleAction(s.id, "expire"); setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-amber-400 hover:bg-white/[0.06] transition-colors">
                                      <AlertTriangle className="h-3.5 w-3.5" /> Mark Expired
                                    </button>
                                  )}
                                  <button onClick={() => { setActionMenu(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                    <FileText className="h-3.5 w-3.5" /> Add Notes
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} total)</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {extendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <CalendarPlus className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Extend Subscription</h3>
                    <p className="text-xs text-gray-500">{extendModal.business_name}</p>
                  </div>
                </div>
                <button onClick={() => setExtendModal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">License Key</span>
                    <span className="text-gray-200 font-mono text-xs">{extendModal.license_key}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Expiry</span>
                    <span className="text-gray-200">{formatDate(extendModal.expiry_date, { hideTime: true })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current Plan</span>
                    <span className="text-gray-200">{extendModal.plan}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Days to Extend</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExtendDays(Math.max(1, extendDays - 30))} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">−30</button>
                    <button onClick={() => setExtendDays(Math.max(1, extendDays - 7))} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">−7</button>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={extendDays}
                      onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-10 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 text-center outline-none focus:border-white/[0.15]"
                    />
                    <button onClick={() => setExtendDays(Math.min(3650, extendDays + 7))} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">+7</button>
                    <button onClick={() => setExtendDays(Math.min(3650, extendDays + 30))} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">+30</button>
                  </div>
                </div>

                <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3">
                  <p className="text-xs text-gray-500">New Expiry Date Preview:</p>
                  <p className="text-sm text-cyan-400 font-semibold mt-0.5">{getNewExpiry(extendModal)}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">+{extendDays} days from current expiry</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setExtendModal(null)}>Cancel</Button>
                  <Button onClick={handleExtend} isLoading={actionLoading === extendModal.id} icon={CalendarPlus}>
                    Extend {extendDays} Days
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

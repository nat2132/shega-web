"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CalendarPlus,
  RotateCcw,
  Crown,
  XCircle,
  Smartphone,
  Monitor,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Clock,
  Timer,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Trial, PaginatedResponse } from "@/lib/types";
import api from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const rowItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extendModal, setExtendModal] = useState<Trial | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [convertModal, setConvertModal] = useState<Trial | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("Basic");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const activeTrials = trials.filter(t => t.status === "active").length;
  const expiringSoon = trials.filter(t => t.days_remaining <= 3 && t.days_remaining > 0).length;

  useEffect(() => {
    loadTrials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function loadTrials() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<Trial>>("/admin/trials/", { params });
      setTrials(data.results);
      setTotal(data.count);
    } catch {
      setError("Failed to load trials");
    } finally {
      setLoading(false);
    }
  }

  async function handleExtend() {
    if (!extendModal) return;
    setActionLoading(extendModal.id);
    try {
      await api.post(`/admin/trials/${extendModal.id}/extend/`, { days: extendDays });
      setExtendModal(null);
      loadTrials();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEndTrial(id: number) {
    setActionLoading(id);
    try {
      await api.post(`/admin/trials/${id}/end/`);
      loadTrials();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConvert() {
    if (!convertModal) return;
    setActionLoading(convertModal.id);
    try {
      await api.post(`/admin/trials/${convertModal.id}/convert/`, { plan: selectedPlan });
      setConvertModal(null);
      loadTrials();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetTrial(id: number) {
    setActionLoading(id);
    try {
      await api.post(`/admin/trials/${id}/reset/`);
      loadTrials();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  function getDaysColor(days: number): string {
    if (days > 7) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (days >= 3) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (days > 0) return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-gray-500 bg-white/[0.03] border-white/[0.06]";
  }

  if (error && trials.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">{error}</p>
          <Button onClick={loadTrials} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trial Management</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor and manage trial accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2">
            <Users className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium text-gray-200">{activeTrials} Active</span>
          </div>
          {expiringSoon > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2">
              <Timer className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">{expiringSoon} Expiring</span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={rowItem} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by business or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTrials()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
      </motion.div>

      <motion.div variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Business</th>
                <th className="px-5 py-4 text-left font-medium">Owner</th>
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Trial Start</th>
                <th className="px-5 py-4 text-left font-medium">Trial End</th>
                <th className="px-5 py-4 text-left font-medium">Days Left</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center"><LoadingSpinner size="lg" className="mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading trials...</p></td></tr>
              ) : trials.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-500">No trials found</td></tr>
              ) : (
                trials.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    variants={rowItem}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                          {t.business_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-200">{t.business_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">{t.owner_name}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {t.platform === "mobile" ? <Smartphone className="h-3.5 w-3.5 text-gray-400" /> : <Monitor className="h-3.5 w-3.5 text-gray-400" />}
                        <span className="text-xs text-gray-500 capitalize">{t.platform}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(t.trial_start_date, { hideTime: true })}</td>
                    <td className="px-5 py-4">
                      <span className={cn("text-xs", t.days_remaining <= 3 && t.days_remaining > 0 ? "text-red-400" : "text-gray-500")}>
                        {formatDate(t.trial_end_date, { hideTime: true })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", getDaysColor(t.days_remaining))}>
                        <Clock className="h-3 w-3" />
                        {t.days_remaining > 0 ? `${t.days_remaining}d` : "Expired"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "active" && (
                          <>
                            <button onClick={() => setExtendModal(t)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-cyan-400 transition-all" title="Extend Trial">
                              <CalendarPlus className="h-4 w-4" />
                            </button>
                            <button onClick={() => setConvertModal(t)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-purple-400 transition-all" title="Convert to Premium">
                              <Crown className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleEndTrial(t.id)} disabled={actionLoading === t.id} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-amber-400 transition-all disabled:opacity-30" title="End Trial">
                              {actionLoading === t.id ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4" />}
                            </button>
                          </>
                        )}
                        <button onClick={() => handleResetTrial(t.id)} disabled={actionLoading === t.id} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-blue-400 transition-all disabled:opacity-30" title="Reset Trial">
                          {actionLoading === t.id ? <LoadingSpinner size="sm" /> : <RotateCcw className="h-4 w-4" />}
                        </button>
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
                    <h3 className="text-lg font-semibold">Extend Trial</h3>
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
                    <span className="text-gray-500">Current End Date</span>
                    <span className="text-gray-200">{formatDate(extendModal.trial_end_date, { hideTime: true })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Days Remaining</span>
                    <span className={cn("font-medium", extendModal.days_remaining > 7 ? "text-emerald-400" : extendModal.days_remaining > 3 ? "text-amber-400" : "text-red-400")}>
                      {extendModal.days_remaining} days
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Additional Days</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={extendDays}
                    onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 text-center outline-none focus:border-white/[0.15]"
                  />
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

      <AnimatePresence>
        {convertModal && (
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <Crown className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Convert to Paid Plan</h3>
                    <p className="text-xs text-gray-500">{convertModal.business_name}</p>
                  </div>
                </div>
                <button onClick={() => setConvertModal(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Trial Started</span>
                    <span className="text-gray-200">{formatDate(convertModal.trial_start_date, { hideTime: true })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Trial Ends</span>
                    <span className="text-gray-200">{formatDate(convertModal.trial_end_date, { hideTime: true })}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Select Plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Basic", "Premium"].map((plan) => (
                      <button
                        key={plan}
                        onClick={() => setSelectedPlan(plan)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          selectedPlan === plan
                            ? "border-indigo-500/40 bg-indigo-500/10"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15]"
                        )}
                      >
                        <p className="text-sm font-medium text-gray-200">{plan}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{plan === "Premium" ? "ETB 1,500/mo" : "ETB 800/mo"}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setConvertModal(null)}>Cancel</Button>
                  <Button onClick={handleConvert} isLoading={actionLoading === convertModal.id} icon={Crown}>
                    Convert to {selectedPlan}
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

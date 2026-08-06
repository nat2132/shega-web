"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Eye,
  Edit3,
  Ban,
  Trash2,
  RotateCcw,
  Smartphone,
  Monitor,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
  CreditCard,
  History,
  AlertTriangle,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Business, PaginatedResponse } from "@/lib/types";
import api from "@/lib/api";

const statusColors: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  active: "success",
  expired: "danger",
  suspended: "warning",
  cancelled: "default",
  trial: "info",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const rowItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "subscriptions" | "payments">("overview");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Business | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const stats = {
    total: total,
    active: businesses.filter(b => b.subscription_status === "active").length,
    trial: businesses.filter(b => b.trial_status === "active").length,
    suspended: businesses.filter(b => b.subscription_status === "suspended").length,
  };

  useEffect(() => {
    loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, platformFilter]);

  async function loadBusinesses() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (platformFilter) params.platform = platformFilter;
      const { data } = await api.get<PaginatedResponse<Business>>("/admin/businesses/", { params });
      setBusinesses(data.results);
      setTotal(data.count);
    } catch {
      setError("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, action: string) {
    setActionLoading(id);
    try {
      await api.post(`/admin/businesses/${id}/${action}/`);
      loadBusinesses();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(id);
    try {
      await api.delete(`/admin/businesses/${id}/`);
      setConfirmDelete(null);
      loadBusinesses();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  }

  function getActionLabel(b: Business): { suspendLabel: string; suspendAction: string } {
    if (b.subscription_status === "suspended") return { suspendLabel: "Activate", suspendAction: "activate" };
    return { suspendLabel: "Suspend", suspendAction: "suspend" };
  }

  if (error && businesses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">Failed to load businesses</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <Button onClick={loadBusinesses} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all registered businesses and their subscriptions</p>
        </div>
        <Button icon={Plus}>Add Business</Button>
      </motion.div>

      <motion.div variants={rowItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-100" },
          { label: "Active", value: stats.active, color: "text-emerald-400" },
          { label: "Trial", value: stats.trial, color: "text-sky-400" },
          { label: "Suspended", value: stats.suspended, color: "text-amber-400" },
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
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadBusinesses()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={platformFilter} onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Platforms</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
          <option value="both">Both</option>
        </select>
      </motion.div>

      <motion.div variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Business Name</th>
                <th className="px-5 py-4 text-left font-medium">Owner</th>
                <th className="px-5 py-4 text-left font-medium">Phone</th>
                <th className="px-5 py-4 text-left font-medium">Email</th>
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Plan</th>
                <th className="px-5 py-4 text-left font-medium">Subscription</th>
                <th className="px-5 py-4 text-left font-medium">Trial</th>
                <th className="px-5 py-4 text-left font-medium">Expiry</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center"><LoadingSpinner size="lg" className="mx-auto" /><p className="mt-3 text-sm text-gray-500">Loading businesses...</p></td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center text-sm text-gray-500">No businesses found</td></tr>
              ) : (
                businesses.map((b, i) => {
                  const { suspendLabel, suspendAction } = getActionLabel(b);
                  return (
                    <motion.tr
                      key={b.id}
                      variants={rowItem}
                      initial="hidden"
                      animate="show"
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                            {b.business_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-200">{b.business_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400">{b.owner_name}</td>
                      <td className="px-5 py-4 text-gray-400 font-mono text-xs">{b.phone}</td>
                      <td className="px-5 py-4 text-gray-400 max-w-[120px] truncate">{b.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {b.platform === "mobile" || b.platform === "both" ? <Smartphone className="h-3.5 w-3.5 text-gray-400" /> : null}
                          {b.platform === "desktop" || b.platform === "both" ? <Monitor className="h-3.5 w-3.5 text-gray-400" /> : null}
                          <span className="text-xs text-gray-500 capitalize">{b.platform}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={b.current_plan === "Premium" ? "premium" : "default"} size="sm">
                          {b.current_plan}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusColors[b.subscription_status] || "default"} size="sm">
                          {b.subscription_status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "text-xs font-medium",
                          b.trial_status === "active" ? "text-sky-400" : b.trial_status === "expired" ? "text-red-400" : b.trial_status === "converted" ? "text-emerald-400" : "text-gray-600"
                        )}>
                          {b.trial_status === "none" ? "—" : b.trial_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{b.expiry_date ? formatDate(b.expiry_date, { hideTime: true }) : "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setDetailBusiness(b)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Edit">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(b.id, suspendAction)}
                            disabled={actionLoading === b.id}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-amber-400 transition-all disabled:opacity-30"
                            title={suspendLabel}
                          >
                            {actionLoading === b.id ? <LoadingSpinner size="sm" /> : <Ban className="h-4 w-4" />}
                          </button>
                          <button onClick={() => setConfirmDelete(b)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-red-400 transition-all" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="relative group">
                            <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="More">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-white/[0.08] bg-[#0a0a0f] backdrop-blur-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="py-1">
                                <button onClick={() => handleAction(b.id, "reset_trial")} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                  <RotateCcw className="h-3.5 w-3.5" /> Reset Trial
                                </button>
                                <button onClick={() => setDetailBusiness(b)} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                  <History className="h-3.5 w-3.5" /> Subscription History
                                </button>
                                <button onClick={() => setDetailBusiness(b)} className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/[0.06] transition-colors">
                                  <CreditCard className="h-3.5 w-3.5" /> Payment History
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
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
        {detailBusiness && (
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
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-3xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] shadow-premium-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0a0a0f] z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-bold text-gray-200">
                    {detailBusiness.business_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{detailBusiness.business_name}</h2>
                    <p className="text-xs text-gray-500">{detailBusiness.email}</p>
                  </div>
                </div>
                <button onClick={() => { setDetailBusiness(null); setDetailTab("overview"); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-1 px-6 pt-4 border-b border-white/[0.06]">
                {([["overview", "Overview"], ["subscriptions", "Subscriptions"], ["payments", "Payments"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDetailTab(key)}
                    className={cn("relative px-4 py-2.5 text-sm font-medium transition-colors",
                      detailTab === key ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
                    )}>
                    {label}
                    {detailTab === key && <motion.div layoutId="biz-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {detailTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ["Owner", detailBusiness.owner_name],
                      ["Phone", detailBusiness.phone],
                      ["Email", detailBusiness.email],
                      ["Platform", detailBusiness.platform],
                      ["Current Plan", detailBusiness.current_plan],
                      ["Subscription Status", detailBusiness.subscription_status],
                      ["Trial Status", detailBusiness.trial_status],
                      ["Expiry Date", detailBusiness.expiry_date ? formatDate(detailBusiness.expiry_date, { hideTime: true }) : "—"],
                      ["Status", detailBusiness.is_active ? "Active" : "Inactive"],
                      ["Created", detailBusiness.registration_date ? formatDate(detailBusiness.registration_date) : "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm text-gray-200 mt-0.5 font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === "subscriptions" && (
                  <div className="text-center py-8">
                    <Clock className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Subscription history for this business will appear here.</p>
                  </div>
                )}
                {detailTab === "payments" && (
                  <div className="text-center py-8">
                    <CreditCard className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Payment history for this business will appear here.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
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
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete Business</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-6">
                Are you sure you want to delete <strong>{confirmDelete.business_name}</strong>? All associated data including subscriptions, payments, and licenses will be permanently removed.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => handleDelete(confirmDelete.id)} isLoading={actionLoading === confirmDelete.id} icon={Trash2}>
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

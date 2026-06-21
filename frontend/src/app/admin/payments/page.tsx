"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Payment, PaginatedResponse } from "@/lib/types";

const tabs = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Approved" },
  { key: "failed", label: "Rejected" },
  { key: "all", label: "All" },
];

const statusColors: Record<string, string> = {
  pending: "bg-white/[0.06] text-gray-300",
  completed: "bg-white/[0.08] text-gray-200",
  failed: "bg-white/[0.03] text-gray-500",
  refunded: "bg-white/[0.04] text-gray-400",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewModal, setReviewModal] = useState<Payment | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [page, activeTab]);

  async function loadPayments() {
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<Payment>>("/admin/payments/", { params });
      setPayments(data.results);
      setTotal(data.count);
    } catch {
      /* ignore */
    }
  }

  async function handleReview(action: "approve" | "reject") {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await api.post(`/admin/payments/${reviewModal.id}/review/`, { action, notes: adminNotes });
      setReviewModal(null);
      setAdminNotes("");
      loadPayments();
    } catch {
      /* ignore */
    } finally {
      setReviewing(false);
    }
  }

  const totalPages = Math.ceil(total / 10);
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">Verify and manage payments</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.key ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab.label}
            {tab.key === "pending" && pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-gray-300">
                {pendingCount}
              </span>
            )}
            {activeTab === tab.key && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />
            )}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadPayments()}
          className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15]"
        />
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Transaction</th>
                <th className="px-5 py-4 text-left font-medium">Customer</th>
                <th className="px-5 py-4 text-left font-medium">Amount</th>
                <th className="px-5 py-4 text-left font-medium">Method</th>
                <th className="px-5 py-4 text-left font-medium">Receipt</th>
                <th className="px-5 py-4 text-left font-medium">Date</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                {activeTab === "pending" && <th className="px-5 py-4 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-mono text-xs text-gray-200">{p.transaction_id || `#${p.id}`}</td>
                  <td className="px-5 py-4 text-gray-300">{p.customer?.full_name || "N/A"}</td>
                  <td className="px-5 py-4 text-gray-200 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-5 py-4 text-gray-400">{p.payment_method || "—"}</td>
                  <td className="px-5 py-4">
                    <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.06] transition-all">
                      <ImageIcon className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[p.status])}>
                      {p.status === "approved" ? "Approved" : p.status === "rejected" ? "Rejected" : p.status}
                    </span>
                  </td>
                  {activeTab === "pending" && (
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setReviewModal(p)}>
                        Review
                      </Button>
                    </td>
                  )}
                </motion.tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={activeTab === "pending" ? 8 : 7} className="px-5 py-12 text-center text-sm text-gray-500">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {reviewModal && (
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
              className="w-full max-w-2xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] shadow-premium-lg"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <h2 className="text-lg font-semibold">Review Payment</h2>
                <button onClick={() => { setReviewModal(null); setAdminNotes(""); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Transaction ID</p>
                    <p className="text-sm text-gray-200 font-mono">{reviewModal.transaction_id || `#${reviewModal.id}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-sm text-gray-200">{reviewModal.customer?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-sm text-gray-200">{formatCurrency(reviewModal.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Method</p>
                    <p className="text-sm text-gray-200">{reviewModal.payment_method || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm text-gray-200">{formatDate(reviewModal.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1", statusColors[reviewModal.status])}>
                      {reviewModal.status}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06]">
                      <ImageIcon className="h-6 w-6 text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">Payment Receipt</p>
                      <button className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-200 mt-0.5">
                        <ExternalLink className="h-3 w-3" />
                        View full receipt
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about this payment..."
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => { setReviewModal(null); setAdminNotes(""); }}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleReview("reject")}
                    isLoading={reviewing}
                    icon={XCircle}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleReview("approve")}
                    isLoading={reviewing}
                    icon={CheckCircle}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PaginatedResponse } from "@/lib/types";

interface AdminPayment {
  id: number;
  customer: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  license?: number | null;
  plan?: number | null;
  plan_name?: string | null;
  amount: string;
  transaction_id: string;
  receipt_image?: string | null;
  payment_method: string;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  reviewed_at?: string | null;
  created_at: string;
}

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const statusBadge: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<AdminPayment | null>(null);
  const [rejectModal, setRejectModal] = useState<AdminPayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  async function loadPayments() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<AdminPayment>>("/admin/payments/", { params });
      setPayments(data.results);
      setTotal(data.count);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab]);

  async function handleApprove() {
    if (!detail) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/payments/${detail.id}/approve/`, { admin_notes: adminNotes });
      setDetail(null);
      setAdminNotes("");
      loadPayments();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/payments/${rejectModal.id}/reject/`, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason("");
      loadPayments();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  if (error && payments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg font-medium">{error}</p>
          <Button onClick={loadPayments} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Requests</h1>
        <p className="mt-1 text-sm text-gray-500">Verify and approve Telebirr payments</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={cn(
              "relative px-5 py-3 text-sm font-medium transition-colors",
              activeTab === tab.key ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {tab.label}
            {activeTab === tab.key && <motion.div layoutId="payment-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by transaction ID or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadPayments())}
          className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
        />
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-4 py-4 text-left font-medium">Customer</th>
                <th className="px-4 py-4 text-left font-medium">Business</th>
                <th className="px-4 py-4 text-left font-medium">Email</th>
                <th className="px-4 py-4 text-left font-medium">Plan</th>
                <th className="px-4 py-4 text-left font-medium">Amount</th>
                <th className="px-4 py-4 text-left font-medium">Transaction ID</th>
                <th className="px-4 py-4 text-left font-medium">Receipt</th>
                <th className="px-4 py-4 text-left font-medium">Date</th>
                <th className="px-4 py-4 text-left font-medium">Status</th>
                <th className="px-4 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                </td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center text-sm text-gray-500">No payment requests found</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-4 font-medium text-gray-200">{p.customer_name || "—"}</td>
                    <td className="px-4 py-4 text-gray-400">{p.customer_name || "—"}</td>
                    <td className="px-4 py-4 text-gray-400">{p.customer_email || "—"}</td>
                    <td className="px-4 py-4">
                      <Badge variant="default" size="sm">{p.plan_name || "—"}</Badge>
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-200">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-4 font-mono text-[10px] text-gray-300">{p.transaction_id || `#${p.id}`}</td>
                    <td className="px-4 py-4">
                      {p.receipt_image ? (
                        <button onClick={() => setReceiptImage(p.receipt_image!)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.06] transition-all">
                          <ImageIcon className="h-3 w-3" /> View
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] text-gray-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-4">
                      <Badge variant={statusBadge[p.status] || "default"} size="sm">{statusLabel[p.status]}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetail(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View / Approve">
                          <Eye className="h-4 w-4" />
                        </button>
                        {p.status === "pending" && (
                          <button onClick={() => { setRejectModal(p); setRejectReason(""); }} className="rounded-lg p-1.5 text-red-400 hover:bg-white/[0.06] transition-all" title="Reject">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} total)</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-3xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0a0a0f] z-10">
                <div>
                  <h2 className="text-lg font-semibold">Payment Details</h2>
                  <p className="text-xs text-gray-500">Transaction {detail.transaction_id || `#${detail.id}`}</p>
                </div>
                <button onClick={() => { setDetail(null); setAdminNotes(""); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Customer Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Info label="Name" value={detail.customer_name as string} />
                    <Info label="Email" value={detail.customer_email as string} />
                    <Info label="Business Name" value={detail.customer_name as string} />
                  </div>
                </div>

                <section>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Subscription Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Info label="Selected Plan" value={detail.plan_name as string} />
                    <Info label="Amount" value={formatCurrency(Number(detail.amount))} />
                    <Info label="Payment Method" value={detail.payment_method as string} />
                  </div>
                </section>

                {detail.receipt_image && (
                  <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Payment Information</p>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-center min-h-[180px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={detail.receipt_image} alt="Receipt" className="max-h-[260px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setReceiptImage(detail.receipt_image!)} />
                    </div>
                  </section>
                )}

                {detail.status === "pending" && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Admin Notes (optional)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={2}
                      placeholder="Add notes about this payment..."
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                    />
                  </div>
                )}

                {detail.status === "pending" && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={() => { setRejectModal(detail); setDetail(null); }} icon={XCircle}>Reject</Button>
                    <Button onClick={handleApprove} isLoading={actionLoading} icon={CheckCircle} className="w-full sm:w-auto">Approve Payment</Button>
                  </div>
                )}
                {detail.status !== "pending" && detail.admin_notes && (
                  <p className="text-xs text-gray-400">Admin notes: {detail.admin_notes}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectModal && (
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
              className="w-full max-w-lg rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] p-6"
            >
              <h3 className="text-lg font-semibold mb-2">Reject Payment</h3>
              <p className="text-sm text-gray-400 mb-4">
                Reject the payment from <span className="text-gray-200 font-medium">{rejectModal.customer_name}</span>? A reason is required.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Reason for rejection (sent to the customer)..."
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleReject} isLoading={actionLoading} icon={XCircle} disabled={!rejectReason.trim()}>Reject</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {receiptImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setReceiptImage(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-w-3xl max-h-[90vh]">
              <button onClick={() => setReceiptImage(null)} className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 border border-white/[0.1] text-gray-300 hover:text-white transition-all"><X className="h-4 w-4" /></button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptImage} alt="Receipt" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-200 mt-0.5 font-medium truncate">{value || "—"}</p>
    </div>
  );
}
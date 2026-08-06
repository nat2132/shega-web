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
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PaymentVerification, PaginatedResponse, User } from "@/lib/types";

function getPaymentCustomer(p: PaymentVerification): User | null {
  if (typeof p.customer === 'object' && p.customer) return p.customer as User;
  return null;
}

function pcName(p: PaymentVerification): string {
  const c = getPaymentCustomer(p);
  return c?.full_name || "N/A";
}

function pcPhone(p: PaymentVerification): string {
  const c = getPaymentCustomer(p);
  return c?.phone || "—";
}

function pcEmail(p: PaymentVerification): string {
  const c = getPaymentCustomer(p);
  return c?.email || "—";
}

function pcInitial(p: PaymentVerification): string {
  const n = pcName(p);
  return n?.charAt(0)?.toUpperCase() || "?";
}

const tabs = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const statusBadge: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const rowItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentVerification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [reviewModal, setReviewModal] = useState<PaymentVerification | null>(null);
  const [rejectModal, setRejectModal] = useState<PaymentVerification | null>(null);
  const [requestInfoModal, setRequestInfoModal] = useState<PaymentVerification | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [requestMsg, setRequestMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab]);

  async function loadPayments() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<PaymentVerification>>("/admin/payments/", { params });
      setPayments(data.results);
      setTotal(data.count);
    } catch {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(p: PaymentVerification) {
    setActionLoading(true);
    try {
      await api.post(`/admin/payments/${p.id}/review/`, { action: "approve", notes: adminNotes });
      setReviewModal(null);
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
      await api.post(`/admin/payments/${rejectModal.id}/review/`, { action: "reject", reason: rejectReason, notes: adminNotes });
      setRejectModal(null);
      setRejectReason("");
      setAdminNotes("");
      loadPayments();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (!requestInfoModal) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/payments/${requestInfoModal.id}/request-info/`, { message: requestMsg });
      setRequestInfoModal(null);
      setRequestMsg("");
      loadPayments();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  const pendingCount = payments.filter((p) => p.status === "pending").length;

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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem}>
        <h1 className="text-2xl font-bold tracking-tight">Payment Verification</h1>
        <p className="mt-1 text-sm text-gray-500">Verify, approve or reject payment submissions</p>
      </motion.div>

      <motion.div variants={rowItem} className="flex flex-wrap items-center gap-1 border-b border-white/[0.06]">
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
            {tab.key === "pending" && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 px-1.5 py-0.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
            {activeTab === tab.key && (
              <motion.div layoutId="pay-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />
            )}
          </button>
        ))}
      </motion.div>

      <motion.div variants={rowItem} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by transaction ID or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadPayments()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
      </motion.div>

      <motion.div variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-4 py-4 text-left font-medium">Business</th>
                <th className="px-4 py-4 text-left font-medium">Owner</th>
                <th className="px-4 py-4 text-left font-medium">Phone</th>
                <th className="px-4 py-4 text-left font-medium">Platform</th>
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
                <tr><td colSpan={11} className="px-4 py-16 text-center">
                  <div className="space-y-4">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="h-4 bg-white/[0.04] rounded w-24" />
                        <div className="h-4 bg-white/[0.04] rounded w-20" />
                        <div className="h-4 bg-white/[0.04] rounded w-16" />
                        <div className="h-4 bg-white/[0.04] rounded w-12" />
                        <div className="h-4 bg-white/[0.04] rounded w-16" />
                        <div className="h-4 bg-white/[0.04] rounded w-14" />
                        <div className="h-4 bg-white/[0.04] rounded w-20" />
                        <div className="h-4 bg-white/[0.04] rounded w-12" />
                        <div className="h-4 bg-white/[0.04] rounded w-16" />
                        <div className="h-4 bg-white/[0.04] rounded w-14" />
                        <div className="h-4 bg-white/[0.04] rounded w-16" />
                      </div>
                    ))}
                  </div>
                </td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-16 text-center text-sm text-gray-500">No payments found</td></tr>
              ) : (
                payments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    variants={rowItem}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                          {pcInitial(p)}
                        </div>
                        <span className="text-gray-200 text-xs font-medium">{pcName(p)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-xs">{pcName(p)}</td>
                    <td className="px-4 py-4 text-gray-400 text-xs font-mono">{pcPhone(p)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-500">Mobile</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={p.plan_selected === "Premium" ? "premium" : "default"} size="sm">
                        {p.plan_selected || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-200 font-medium text-xs">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-4 font-mono text-[10px] text-gray-300">{p.transaction_id || `#${p.id}`}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setReceiptImage(p.receipt_image || "/placeholder-receipt.png")}
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.06] transition-all"
                      >
                        <ImageIcon className="h-3 w-3" />
                        View
                      </button>
                    </td>
                    <td className="px-4 py-4 text-[10px] text-gray-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-4">
                      <Badge variant={statusBadge[p.status] || "default"} size="sm">
                        {p.status === "approved" ? "Approved" : p.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "pending" ? (
                          <>
                            <button onClick={() => setReviewModal(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Review">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(p); setRejectReason(""); }} className="rounded-lg p-1.5 text-red-400 hover:bg-white/[0.06] transition-all" title="Reject">
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setRequestInfoModal(p); setRequestMsg(""); }} className="rounded-lg p-1.5 text-amber-400 hover:bg-white/[0.06] transition-all" title="Request Info">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setReviewModal(p)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View Details">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
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
        {reviewModal && (
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
              className="w-full max-w-4xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] shadow-premium-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0a0a0f] z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                    <FileText className="h-5 w-5 text-gray-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Review Payment</h2>
                    <p className="text-xs text-gray-500">Transaction {reviewModal.transaction_id || `#${reviewModal.id}`}</p>
                  </div>
                </div>
                <button onClick={() => { setReviewModal(null); setAdminNotes(""); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="lg:col-span-2 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Business Name", pcName(reviewModal)],
                      ["Owner", pcName(reviewModal)],
                      ["Phone", pcPhone(reviewModal)],
                      ["Email", pcEmail(reviewModal)],
                      ["Plan Selected", reviewModal.plan_selected || "—"],
                      ["Amount", formatCurrency(reviewModal.amount)],
                      ["Transaction ID", reviewModal.transaction_id || `#${reviewModal.id}`],
                      ["Payment Method", reviewModal.payment_method || "—"],
                      ["Payment Date", reviewModal.paid_at ? formatDate(reviewModal.paid_at) : "—"],
                      ["Submission Date", reviewModal.submission_date ? formatDate(reviewModal.submission_date) : formatDate(reviewModal.created_at)],
                      ["Status", reviewModal.status],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                        <p className="text-sm text-gray-200 mt-0.5 font-medium truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-2">Receipt Image</p>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-center min-h-[200px]">
                      {reviewModal.receipt_image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={reviewModal.receipt_image}
                            alt="Payment Receipt"
                            className="max-h-[300px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setReceiptImage(reviewModal.receipt_image!)}
                          />
                        </>
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No receipt image uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Admin Notes</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="Add notes about this payment review..."
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Business Info</p>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-lg font-bold text-gray-300">
                        {pcName(reviewModal).charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{pcName(reviewModal)}</p>
                            <p className="text-xs text-gray-500">{pcEmail(reviewModal)}</p>
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Total Payments</span>
                        <span className="text-gray-300">—</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Subscription</span>
                        <span className="text-gray-300">—</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Platform</span>
                        <span className="text-gray-300 capitalize">Mobile</span>
                      </div>
                    </div>
                  </div>

                  {reviewModal.status === "pending" && (
                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={() => handleApprove(reviewModal)}
                        isLoading={actionLoading}
                        icon={CheckCircle}
                        className="w-full"
                      >
                        Approve Payment
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => { setRejectModal(reviewModal as PaymentVerification); setReviewModal(null); }}
                        icon={XCircle}
                        className="w-full"
                      >
                        Reject Payment
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setRequestInfoModal(reviewModal as PaymentVerification); setReviewModal(null); }}
                        icon={MessageSquare}
                        className="w-full"
                      >
                        Request Information
                      </Button>
                    </div>
                  )}
                </div>
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
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Reject Payment</h3>
                  <p className="text-xs text-gray-500">Transaction #{rejectModal.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  Are you sure you want to reject this payment from <strong>{pcName(rejectModal)}</strong>?
                </p>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Reason for Rejection</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder="Explain why this payment is being rejected (this will be sent to the user)..."
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Button>
                  <Button variant="danger" onClick={handleReject} isLoading={actionLoading} icon={XCircle} disabled={!rejectReason.trim()}>
                    Reject Payment
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {requestInfoModal && (
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
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <MessageSquare className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Request Information</h3>
                  <p className="text-xs text-gray-500">Transaction #{requestInfoModal.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  Send a message to <strong>{pcName(requestInfoModal)}</strong> requesting additional information about this payment.
                </p>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Message</label>
                  <textarea
                    value={requestMsg}
                    onChange={(e) => setRequestMsg(e.target.value)}
                    rows={4}
                    placeholder="What additional information do you need? (e.g., clearer receipt, transaction screenshot)..."
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setRequestInfoModal(null)}>Cancel</Button>
                  <Button onClick={handleRequestInfo} isLoading={actionLoading} icon={MessageSquare} disabled={!requestMsg.trim()}>
                    Send Request
                  </Button>
                </div>
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
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[90vh]"
            >
              <button onClick={() => setReceiptImage(null)} className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 border border-white/[0.1] text-gray-300 hover:text-white transition-all">
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptImage} alt="Receipt" className="max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

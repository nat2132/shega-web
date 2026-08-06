"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bell,
  Megaphone,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  type: string;
  recipients_count: number;
  status: "sent" | "failed" | "draft";
  sent_at: string;
}

interface PaginatedNotifications {
  count: number;
  results: NotificationRecord[];
}

const typeBadge: Record<string, "warning" | "info" | "success" | "danger" | "default"> = {
  maintenance: "warning",
  updates: "info",
  offers: "success",
  bug_fixes: "danger",
  announcements: "default",
  renewal_reminder: "info",
};

const typeLabels: Record<string, string> = {
  maintenance: "Maintenance",
  updates: "Updates",
  offers: "Offers",
  bug_fixes: "Bug Fixes",
  announcements: "Announcements",
  renewal_reminder: "Renewal Reminder",
};

const recipientOptions = [
  { value: "all", label: "All Users" },
  { value: "mobile", label: "Mobile Only" },
  { value: "desktop", label: "Desktop Only" },
  { value: "premium", label: "Premium Only" },
  { value: "basic", label: "Basic Only" },
  { value: "trial", label: "Trial Only" },
  { value: "expired", label: "Expired Only" },
  { value: "specific", label: "Specific Business" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    recipient: "all",
    type: "maintenance",
    title: "",
    message: "",
    business_id: "",
  });

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedNotifications>("/admin/notifications/", {
        params: { page, page_size: pageSize },
      });
      setNotifications(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      await api.post("/admin/notifications/send/", form);
      toast.success("Notification sent successfully");
      setShowConfirm(false);
      setForm({ recipient: "all", type: "maintenance", title: "", message: "", business_id: "" });
      loadNotifications();
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">Send push notifications and view history</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-5 w-5 text-gray-300" />
          <h2 className="text-base font-semibold text-gray-100">Send Notification</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Recipient</label>
            <select
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
            >
              {recipientOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
              placeholder="Notification title"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Message</label>
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
              placeholder="Write your notification message..."
            />
          </div>
          {form.recipient === "specific" && (
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Business ID</label>
              <input
                value={form.business_id}
                onChange={(e) => setForm({ ...form, business_id: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                placeholder="Enter business ID"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end mt-5">
          <Button
            icon={Send}
            onClick={() => setShowConfirm(true)}
            disabled={!form.title || !form.message}
          >
            Send Notification
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showConfirm && (
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Confirm Send</h2>
                  <p className="text-sm text-gray-400">
                    This will notify {recipientOptions.find((o) => o.value === form.recipient)?.label}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-4 space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-200">{form.title}</p>
                <p className="text-sm text-gray-400">{form.message}</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSend} isLoading={sending}>
                  Send Now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-100">Notification History</h2>
        </div>
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                  <th className="px-5 py-4 text-left font-medium">Title</th>
                  <th className="px-5 py-4 text-left font-medium">Message</th>
                  <th className="px-5 py-4 text-center font-medium">Recipients</th>
                  <th className="px-5 py-4 text-left font-medium">Type</th>
                  <th className="px-5 py-4 text-left font-medium">Status</th>
                  <th className="px-5 py-4 text-left font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                      <p className="mt-2 text-sm text-gray-500">Loading...</p>
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                      No notifications sent yet
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <motion.tr
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4 font-medium text-gray-200">{n.title}</td>
                      <td className="px-5 py-4 text-gray-400 max-w-xs truncate">{n.message}</td>
                      <td className="px-5 py-4 text-center text-gray-300">{n.recipients_count}</td>
                      <td className="px-5 py-4">
                        <Badge variant={typeBadge[n.type] || "default"}>
                          {typeLabels[n.type] || n.type}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            n.status === "sent"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : n.status === "failed"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          )}
                        >
                          {n.status === "sent" ? "Sent" : n.status === "failed" ? "Failed" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {n.sent_at ? formatDate(n.sent_at) : "—"}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

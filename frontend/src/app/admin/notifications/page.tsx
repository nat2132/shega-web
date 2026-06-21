"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Filter, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Notification, User, PaginatedResponse } from "@/lib/types";

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: "bg-white/[0.06] text-gray-300",
  warning: "bg-white/[0.06] text-gray-300",
  success: "bg-white/[0.06] text-gray-300",
  error: "bg-white/[0.06] text-gray-300",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({
    recipient_type: "all",
    customer_id: "",
    type: "info",
    title: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadHistory();
    loadCustomers();
  }, [page, typeFilter]);

  async function loadHistory() {
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get<PaginatedResponse<Notification>>("/admin/notifications/", { params });
      setNotifications(data.results);
      setHistoryTotal(data.count);
    } catch {
      /* ignore */
    }
  }

  async function loadCustomers() {
    try {
      const { data } = await api.get<PaginatedResponse<User>>("/admin/customers/", { params: { page_size: 200 } });
      setCustomers(data.results);
    } catch {
      /* ignore */
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        message: form.message,
      };
      if (form.recipient_type === "specific" && form.customer_id) {
        payload.customer_id = parseInt(form.customer_id);
      }
      await api.post("/admin/notifications/send/", payload);
      setForm({ recipient_type: "all", customer_id: "", type: "info", title: "", message: "" });
      loadHistory();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  const totalPages = Math.ceil(historyTotal / 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">Send and manage system notifications</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-6"
      >
        <h2 className="text-base font-semibold text-gray-100 mb-5">Send Notification</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Recipients</label>
              <select value={form.recipient_type} onChange={(e) => setForm({ ...form, recipient_type: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                <option value="all">All Customers</option>
                <option value="specific">Specific Customer</option>
              </select>
            </div>
            {form.recipient_type === "specific" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Customer</label>
                <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Message</label>
            <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" icon={Send} isLoading={sending}>Send Notification</Button>
          </div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-100">Notification History</h3>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 text-xs text-gray-300 outline-none focus:border-white/[0.15]">
            <option value="">All Types</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div key={n.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", typeColors[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-200">{n.title}</h4>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-500">{formatDate(n.created_at)}</span>
              </div>
            );
          })}
          {notifications.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">No notifications sent yet</p>
            </div>
          )}
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
      </motion.div>
    </div>
  );
}

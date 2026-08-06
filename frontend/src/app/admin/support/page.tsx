"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  CheckCircle,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import toast from "react-hot-toast";

interface TicketMessage {
  id: number;
  author: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface Ticket {
  id: number;
  ticket_id: string;
  business: string;
  subject: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  platform: string;
  assigned_to: string;
  created_at: string;
  messages: TicketMessage[];
}

interface AdminUser {
  id: number;
  username: string;
}

const priorityColors: Record<string, "default" | "warning" | "info" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  resolved: "bg-green-500/10 text-green-400 border border-green-500/20",
  closed: "bg-gray-500/10 text-gray-400 border border-gray-500/20",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [assignModal, setAssignModal] = useState<Ticket | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState("");

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadTickets();
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadTickets() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      const { data } = await api.get<{ count: number; results: Ticket[] }>("/admin/support/tickets/", { params });
      setTickets(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmins() {
    try {
      const { data } = await api.get<{ results: AdminUser[] }>("/admin/admins/", { params: { page_size: 100 } });
      setAdmins(data.results);
    } catch {
      /* ignore */
    }
  }

  async function handleChangeStatus(ticket: Ticket, status: string) {
    try {
      await api.patch(`/admin/support/tickets/${ticket.id}/`, { status });
      toast.success(`Ticket ${status}`);
      loadTickets();
    } catch {
      toast.error("Failed to update ticket");
    }
  }

  async function handleAssign() {
    if (!assignModal || !selectedAdmin) return;
    try {
      await api.patch(`/admin/support/tickets/${assignModal.id}/`, { assigned_to: selectedAdmin });
      toast.success("Ticket assigned");
      setAssignModal(null);
      setSelectedAdmin("");
      loadTickets();
    } catch {
      toast.error("Failed to assign ticket");
    }
  }

  async function handleSendReply() {
    if (!replyModal || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/admin/support/tickets/${replyModal.id}/reply/`, {
        content: replyText,
        is_internal: isInternal,
      });
      toast.success("Reply sent");
      setReplyText("");
      loadTickets();
      const { data } = await api.get<{ results: Ticket[] }>("/admin/support/tickets/", {
        params: { id: replyModal.id },
      });
      if (data.results.length > 0) {
        setReplyModal(data.results[0]);
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleEscalate(ticket: Ticket) {
    try {
      await api.post(`/admin/support/tickets/${ticket.id}/escalate/`);
      toast.success("Ticket escalated");
      loadTickets();
    } catch {
      toast.error("Failed to escalate");
    }
  }

  const tabs = [
    {
      value: "open",
      label: "Open",
      content: null,
    },
    {
      value: "in_progress",
      label: "In Progress",
      content: null,
    },
    {
      value: "resolved",
      label: "Resolved",
      content: null,
    },
    {
      value: "closed",
      label: "Closed",
      content: null,
    },
    {
      value: "all",
      label: "All",
      content: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Center</h1>
          <p className="mt-1 text-sm text-gray-500">Manage support tickets and inquiries</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadTickets()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15]"
          />
        </div>
      </div>

      <Tabs
        tabs={tabs}
        defaultValue="open"
        className="w-full"
      />

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Ticket ID</th>
                <th className="px-5 py-4 text-left font-medium">Business</th>
                <th className="px-5 py-4 text-left font-medium">Subject</th>
                <th className="px-5 py-4 text-left font-medium">Priority</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Assigned To</th>
                <th className="px-5 py-4 text-left font-medium">Created</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-500">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{ticket.ticket_id}</td>
                    <td className="px-5 py-4 text-gray-200">{ticket.business}</td>
                    <td className="px-5 py-4 text-gray-300 max-w-[200px] truncate">{ticket.subject}</td>
                    <td className="px-5 py-4">
                      <Badge variant={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[ticket.status])}>
                        {ticket.status === "in_progress" ? "In Progress" : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400">{ticket.platform}</td>
                    <td className="px-5 py-4 text-gray-400">{ticket.assigned_to || "—"}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatDate(ticket.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setReplyModal(ticket);
                            setReplyText("");
                            setIsInternal(false);
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                          title="View/Reply"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAssignModal(ticket);
                            setSelectedAdmin(ticket.assigned_to || "");
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                          title="Assign"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                        {ticket.status !== "closed" && (
                          <button
                            onClick={() => handleChangeStatus(ticket, ticket.status === "resolved" ? "closed" : "resolved")}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                            title="Close"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEscalate(ticket)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                          title="Escalate"
                        >
                          <ArrowUpRight className="h-4 w-4" />
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

      <AnimatePresence>
        {replyModal && (
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
              className="w-full max-w-2xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-lg font-semibold">
                    Ticket #{replyModal.ticket_id}
                  </h2>
                  <p className="text-sm text-gray-400">{replyModal.subject}</p>
                </div>
                <button
                  onClick={() => setReplyModal(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] shrink-0">
                <Badge variant={priorityColors[replyModal.priority]}>{replyModal.priority}</Badge>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[replyModal.status])}>
                  {replyModal.status === "in_progress" ? "In Progress" : replyModal.status.charAt(0).toUpperCase() + replyModal.status.slice(1)}
                </span>
                <span className="text-xs text-gray-500">{replyModal.business}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {replyModal.messages?.length > 0 ? (
                  replyModal.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-xl p-4",
                        msg.is_internal
                          ? "bg-amber-500/5 border border-amber-500/10"
                          : "bg-white/[0.03] border border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-300">
                          {msg.author}
                          {msg.is_internal && (
                            <span className="ml-2 text-amber-400">(Internal Note)</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-500 py-8">No messages yet</p>
                )}
              </div>

              <div className="border-t border-white/[0.06] p-4 shrink-0">
                <div className="flex items-start gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    placeholder="Type your reply..."
                    className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                  />
                  <Button onClick={handleSendReply} icon={Send} isLoading={sendingReply} disabled={!replyText.trim()}>
                    Send
                  </Button>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400"
                  />
                  <span className="text-xs text-gray-400">Internal note (not visible to customer)</span>
                </label>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {assignModal && (
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
              <h2 className="text-lg font-semibold mb-4">Assign Ticket</h2>
              <p className="text-sm text-gray-400 mb-4">
                Assigning ticket #{assignModal.ticket_id}: {assignModal.subject}
              </p>
              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15] mb-4"
              >
                <option value="">Select admin...</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.username}>{a.username}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setAssignModal(null)}>Cancel</Button>
                <Button onClick={handleAssign} disabled={!selectedAdmin}>Assign</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

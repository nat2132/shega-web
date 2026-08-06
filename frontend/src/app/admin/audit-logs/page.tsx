"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Filter,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface AuditLog {
  id: number;
  timestamp: string;
  admin: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
}

interface AdminUser {
  id: number;
  username: string;
}

interface PaginatedAuditLogs {
  count: number;
  results: AuditLog[];
}

const actionColors: Record<string, "info" | "success" | "danger" | "warning" | "default"> = {
  create: "success",
  update: "info",
  delete: "danger",
  login: "default",
  logout: "default",
  export: "warning",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    admin: "",
    action: "",
    resource_type: "",
    search: "",
    date_from: "",
    date_to: "",
  });

  const pageSize = 15;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadAdmins() {
    try {
      const { data } = await api.get<{ results: AdminUser[] }>("/admin/admins/", { params: { page_size: 100 } });
      setAdmins(data.results);
    } catch {
      /* ignore */
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const { data } = await api.get<PaginatedAuditLogs>("/admin/audit-logs/", { params });
      setLogs(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleSearch() {
    setPage(1);
    loadLogs();
  }

  async function handleExport() {
    try {
      const params: Record<string, unknown> = { export: true };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await api.get("/admin/audit-logs/export/", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    } catch {
      toast.error("Failed to export logs");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">Track all system actions and changes</p>
        </div>
        <Button onClick={handleExport} icon={Download} variant="secondary">
          Export CSV
        </Button>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search details..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-white/[0.15]"
              />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Admin</label>
            <select value={filters.admin} onChange={(e) => handleFilterChange("admin", e.target.value)}
              className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
              <option value="">All Admins</option>
              {admins.map((a) => <option key={a.id} value={a.username}>{a.username}</option>)}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Action</label>
            <select value={filters.action} onChange={(e) => handleFilterChange("action", e.target.value)}
              className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="export">Export</option>
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Resource</label>
            <select value={filters.resource_type} onChange={(e) => handleFilterChange("resource_type", e.target.value)}
              className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
              <option value="">All Resources</option>
              <option value="customer">Customer</option>
              <option value="license">License</option>
              <option value="payment">Payment</option>
              <option value="invoice">Invoice</option>
              <option value="plan">Plan</option>
              <option value="admin">Admin</option>
              <option value="settings">Settings</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
          </div>
          <div className="min-w-[150px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
          </div>
          <Button size="sm" onClick={handleSearch}>
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium w-8"></th>
                <th className="px-5 py-4 text-left font-medium">Timestamp</th>
                <th className="px-5 py-4 text-left font-medium">Admin</th>
                <th className="px-5 py-4 text-left font-medium">Action</th>
                <th className="px-5 py-4 text-left font-medium">Resource</th>
                <th className="px-5 py-4 text-left font-medium">Resource ID</th>
                <th className="px-5 py-4 text-left font-medium">Details</th>
                <th className="px-5 py-4 text-left font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-5 py-3 text-gray-500">
                      {expandedId === log.id ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-5 py-3 text-gray-300">{log.admin}</td>
                    <td className="px-5 py-3">
                      <Badge variant={actionColors[log.action] || "default"} size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{log.resource_type}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{log.resource_id}</td>
                    <td className="px-5 py-3 text-gray-400 max-w-[200px] truncate">{log.details}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{log.ip_address}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {expandedId && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.06] bg-white/[0.02]"
            >
              {logs
                .filter((l) => l.id === expandedId)
                .map((log) => (
                  <div key={`expanded-${log.id}`} className="p-5 space-y-3">
                    {log.before_state && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Before State:</p>
                        <pre className="rounded-xl bg-black/40 p-3 text-xs text-gray-300 overflow-x-auto font-mono">
                          {JSON.stringify(log.before_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after_state && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">After State:</p>
                        <pre className="rounded-xl bg-black/40 p-3 text-xs text-gray-300 overflow-x-auto font-mono">
                          {JSON.stringify(log.after_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {!log.before_state && !log.after_state && (
                      <p className="text-sm text-gray-500">No state data available</p>
                    )}
                  </div>
                ))}
            </motion.div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} entries)</p>
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
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

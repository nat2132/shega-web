"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Eye,
  RefreshCw,
  PauseCircle,
  XCircle,
  X,
  Filter,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { License, LicensePlan, User, PaginatedResponse } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-white/[0.06] text-gray-300",
  expired: "bg-white/[0.03] text-gray-500",
  suspended: "bg-white/[0.04] text-gray-400",
  cancelled: "bg-white/[0.02] text-gray-600",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    plan: "",
    start_date: "",
    notes: "",
  });

  useEffect(() => {
    loadLicenses();
    loadPlans();
    loadCustomers();
  }, [page, statusFilter, planFilter]);

  async function loadLicenses() {
    try {
      const params: Record<string, unknown> = { page, page_size: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;
      const { data } = await api.get<PaginatedResponse<License>>("/admin/licenses/", { params });
      setLicenses(data.results);
      setTotal(data.count);
    } catch {
      /* ignore */
    }
  }

  async function loadPlans() {
    try {
      const { data } = await api.get<PaginatedResponse<LicensePlan>>("/admin/plans/");
      setPlans(data.results);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/licenses/", { ...form, customer: Number(form.customer), plan: Number(form.plan) });
      setModalOpen(false);
      setForm({ customer: "", plan: "", start_date: "", notes: "" });
      loadLicenses();
    } catch {
      /* ignore */
    }
  }

  async function handleAction(id: number, action: "renew" | "suspend" | "revoke") {
    try {
      await api.post(`/admin/licenses/${id}/${action}/`);
      loadLicenses();
    } catch {
      /* ignore */
    }
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
          <p className="mt-1 text-sm text-gray-500">Manage software licenses</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={Plus}>Create License</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by key or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadLicenses()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]">
          <option value="">All Plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">License Key</th>
                <th className="px-5 py-4 text-left font-medium">Customer</th>
                <th className="px-5 py-4 text-left font-medium">Plan</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Start</th>
                <th className="px-5 py-4 text-left font-medium">Expiry</th>
                <th className="px-5 py-4 text-center font-medium">Devices</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-mono text-xs text-gray-200">{l.license_key}</td>
                  <td className="px-5 py-4 text-gray-300">{l.customer?.full_name || "N/A"}</td>
                  <td className="px-5 py-4 text-gray-300">{l.plan?.name || "N/A"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[l.status])}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(l.issued_date)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(l.expiry_date)}</td>
                  <td className="px-5 py-4 text-center text-gray-400">{l.activated_devices}/{l.max_activations}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View"><Eye className="h-4 w-4" /></button>
                      {l.status !== "active" && (
                        <button onClick={() => handleAction(l.id, "renew")} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Renew"><RefreshCw className="h-4 w-4" /></button>
                      )}
                      {l.status === "active" && (
                        <button onClick={() => handleAction(l.id, "suspend")} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Suspend"><PauseCircle className="h-4 w-4" /></button>
                      )}
                      {l.status !== "cancelled" && (
                        <button onClick={() => handleAction(l.id, "revoke")} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-400 transition-all" title="Revoke"><XCircle className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {licenses.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">No licenses found</td></tr>
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
        {modalOpen && (
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
              className="w-full max-w-lg rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] shadow-premium-lg"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <h2 className="text-lg font-semibold">Create License</h2>
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Customer</label>
                  <select required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Plan</label>
                  <select required value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                    <option value="">Select plan</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.duration_days} days</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Start Date</label>
                  <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Create License</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

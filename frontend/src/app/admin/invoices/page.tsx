"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Eye, Download, X } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Invoice, User, PaginatedResponse } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-white/[0.03] text-gray-500",
  sent: "bg-white/[0.06] text-gray-300",
  paid: "bg-white/[0.08] text-gray-200",
  overdue: "bg-white/[0.04] text-gray-400",
  cancelled: "bg-white/[0.02] text-gray-600",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    amount: "",
    tax: "0",
    due_date: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadInvoices() {
    try {
      const { data } = await api.get<PaginatedResponse<Invoice>>("/admin/invoices/", { params: { page, page_size: 10 } });
      setInvoices(data.results);
      setTotal(data.count);
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
    setCreating(true);
    try {
      await api.post("/admin/invoices/", {
        customer: parseInt(form.customer),
        amount: parseFloat(form.amount),
        tax: parseFloat(form.tax),
        due_date: form.due_date,
        items: [{ description: form.description, quantity: 1, unit_price: parseFloat(form.amount), total: parseFloat(form.amount) }],
      });
      setModalOpen(false);
      setForm({ customer: "", amount: "", tax: "0", due_date: "", description: "" });
      loadInvoices();
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage invoices</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={Plus}>Create Invoice</Button>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Invoice #</th>
                <th className="px-5 py-4 text-left font-medium">Customer</th>
                <th className="px-5 py-4 text-left font-medium">Amount</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Date</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-mono text-xs text-gray-200">{inv.invoice_number}</td>
                  <td className="px-5 py-4 text-gray-300">{typeof inv.customer === 'object' ? inv.customer?.full_name || "N/A" : "N/A"}</td>
                  <td className="px-5 py-4 text-gray-200 font-medium">{formatCurrency(inv.total || inv.amount)}</td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{inv.issued_date ? formatDate(inv.issued_date) : formatDate(inv.created_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View"><Eye className="h-4 w-4" /></button>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Download"><Download className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">No invoices found</td></tr>
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
                <h2 className="text-lg font-semibold">Create Invoice</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Amount (ETB)</label>
                    <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Tax (ETB)</label>
                    <input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Due Date</label>
                  <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" isLoading={creating}>Create Invoice</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

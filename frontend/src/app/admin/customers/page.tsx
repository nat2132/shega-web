"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Eye,
  Edit3,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Key,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { User, Payment, License, LicensePlan, PaginatedResponse } from "@/lib/types";

function businessId(user: User): string {
  return `SHG-${String(user.id).padStart(6, "0")}`;
}

function userBusinessName(user: User): string {
  return user.profile?.company_name || user.business_name || "—";
}

function planName(p: number | LicensePlan | undefined): string {
  if (typeof p === "object" && p) return (p as LicensePlan).name || "N/A";
  return "N/A";
}

export default function UsersPage() {
  const [customers, setCustomers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company_name: "", is_active: true });

  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "payments" | "licenses">("overview");
  const [detailPayments, setDetailPayments] = useState<Payment[]>([]);
  const [detailLicenses, setDetailLicenses] = useState<License[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function loadCustomers() {
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.is_active = statusFilter === "active";
      const { data } = await api.get<PaginatedResponse<User>>("/admin/customers/", { params });
      setCustomers(data.results);
      setTotal(data.count);
    } catch {
      /* ignore */
    }
  }

  async function openDetail(user: User) {
    setDetailUser(user);
    setDetailTab("overview");
    setDetailPayments([]);
    setDetailLicenses([]);
    setDetailLoading(true);
    try {
      const params: Record<string, unknown> = { search: user.email, page_size: 20 };
      const [pRes, lRes] = await Promise.all([
        api.get<PaginatedResponse<Payment>>("/admin/payments/", { params }),
        api.get<PaginatedResponse<License>>("/admin/licenses/", { params }),
      ]);
      setDetailPayments(pRes.data.results ?? []);
      setDetailLicenses(lRes.data.results ?? []);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ full_name: "", email: "", phone: "", company_name: "", is_active: true });
    setModalOpen(true);
  }

  function openEdit(c: User) {
    setEditing(c);
    setForm({
      full_name: c.full_name || "",
      email: c.email,
      phone: c.phone || "",
      company_name: c.profile?.company_name || "",
      is_active: c.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/customers/${editing.id}/`, form);
      } else {
        await api.post("/admin/customers/", form);
      }
      setModalOpen(false);
      loadCustomers();
    } catch {
      /* ignore */
    }
  }

  async function toggleBlock(c: User) {
    try {
      await api.patch(`/admin/customers/${c.id}/`, { is_active: !c.is_active });
      loadCustomers();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users, their businesses and subscription status</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Add User</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCustomers()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05] focus:ring-1 focus:ring-white/[0.1]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-300 outline-none focus:border-white/[0.15]"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Name</th>
                <th className="px-5 py-4 text-left font-medium">Email</th>
                <th className="px-5 py-4 text-left font-medium">Business</th>
                <th className="px-5 py-4 text-left font-medium">Business ID</th>
                <th className="px-5 py-4 text-left font-medium">Subscription</th>
                <th className="px-5 py-4 text-left font-medium">Registered</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                        {c.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="font-medium text-gray-200">{c.full_name || c.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{c.email}</td>
                  <td className="px-5 py-4 text-gray-400">{userBusinessName(c)}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-300">{businessId(c)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={c.is_active ? "success" : "default"} size="sm">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(c.date_joined, { hideTime: true })}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(c)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="View Details"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all" title="Edit"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => toggleBlock(c)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-400 transition-all" title={c.is_active ? "Block" : "Unblock"}><Ban className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"><ChevronRight className="h-4 w-4" /></button>
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
                <h2 className="text-lg font-semibold">{editing ? "Edit User" : "Add User"}</h2>
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Full Name</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Company Name</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit">{editing ? "Update" : "Create"}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailUser && (
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
                    {detailUser.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{detailUser.full_name || detailUser.email}</h2>
                    <p className="text-xs text-gray-500 font-mono">{businessId(detailUser)}</p>
                  </div>
                </div>
                <button onClick={() => { setDetailUser(null); setDetailTab("overview"); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-1 px-6 pt-4 border-b border-white/[0.06]">
                {([["overview", "Overview"], ["payments", "Payment History"], ["licenses", "Licenses"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDetailTab(key)}
                    className={cn("relative px-4 py-2.5 text-sm font-medium transition-colors",
                      detailTab === key ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
                    )}>
                    {label}
                    {detailTab === key && <motion.div layoutId="user-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {detailTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ["Full Name", detailUser.full_name || "—"],
                      ["Email", detailUser.email],
                      ["Phone", detailUser.phone_number || detailUser.phone || "—"],
                      ["Business", userBusinessName(detailUser)],
                      ["Business ID", businessId(detailUser)],
                      ["Subscription Status", detailUser.is_active ? "Active" : "Inactive"],
                      ["Registered", detailUser.date_joined ? formatDate(detailUser.date_joined, { hideTime: true }) : "—"],
                      ["Type", detailUser.is_staff ? "Staff" : detailUser.is_admin ? "Admin" : "Customer"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm text-gray-200 mt-0.5 font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === "payments" && (
                  detailLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading payment history...
                    </div>
                  ) : detailPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No payment records found for this user.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                            <th className="px-4 py-3 text-left font-medium">Transaction</th>
                            <th className="px-4 py-3 text-left font-medium">Plan</th>
                            <th className="px-4 py-3 text-left font-medium">Amount</th>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPayments.map((p) => (
                            <tr key={p.id} className="border-b border-white/[0.03] last:border-0">
                              <td className="px-4 py-3 font-mono text-[10px] text-gray-300">{p.transaction_id || `#${p.id}`}</td>
                              <td className="px-4 py-3 text-gray-300">{p.plan_selected || planName(p.plan)}</td>
                              <td className="px-4 py-3 text-gray-300">{formatCurrency(p.amount)}</td>
                              <td className="px-4 py-3 text-gray-500">{formatDate(p.created_at, { hideTime: true })}</td>
                              <td className="px-4 py-3">
                                <Badge variant={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "danger"} size="sm">{p.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                {detailTab === "licenses" && (
                  detailLoading ? (
                    <div className="flex items-center justify-center py-12 text-gray-500 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading licenses...
                    </div>
                  ) : detailLicenses.length === 0 ? (
                    <div className="text-center py-12">
                      <Key className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No licenses found for this user.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                            <th className="px-4 py-3 text-left font-medium">License Key</th>
                            <th className="px-4 py-3 text-left font-medium">Plan</th>
                            <th className="px-4 py-3 text-left font-medium">Activated</th>
                            <th className="px-4 py-3 text-left font-medium">Expiry</th>
                            <th className="px-4 py-3 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailLicenses.map((l) => (
                            <tr key={l.id} className="border-b border-white/[0.03] last:border-0">
                              <td className="px-4 py-3 font-mono text-[11px] text-gray-200">{l.license_key}</td>
                              <td className="px-4 py-3 text-gray-300">{planName(l.plan)}</td>
                              <td className="px-4 py-3 text-gray-500">{l.issued_date ? formatDate(l.issued_date, { hideTime: true }) : formatDate(l.start_date, { hideTime: true })}</td>
                              <td className="px-4 py-3 text-gray-500">{l.expiry_date ? formatDate(l.expiry_date, { hideTime: true }) : "—"}</td>
                              <td className="px-4 py-3">
                                <Badge variant={l.status === "active" ? "success" : l.status === "suspended" ? "warning" : "danger"} size="sm">{l.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

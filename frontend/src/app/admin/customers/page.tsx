"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  X as XIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { PaginatedResponse, License, DeviceActivation } from "@/lib/types";

interface AdminCustomer {
  id: number;
  email: string;
  phone?: string;
  business_name: string;
  company_name: string;
  current_plan: string | null;
  license_status: string | null;
  license_expiry: string | null;
  is_active: boolean;
  total_paid: number;
  date_joined: string;
}

interface BusinessDetail {
  id: number;
  email: string;
  phone?: string;
  business_name: string;
  company_name: string;
  first_name?: string;
  last_name?: string;
  date_joined: string;
  licenses?: License[];
  recent_payments?: PaymentLike[];
}

interface PaymentLike {
  id: number;
  transaction_id?: string;
  plan?: { name?: string } | number;
  amount: string | number;
  status: string;
  created_at: string;
}

function licenseStatusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  return "danger";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [devices, setDevices] = useState<DeviceActivation[]>([]);
  const [activeLicenseId, setActiveLicenseId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  async function loadCustomers() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.is_active = statusFilter === "active";
      const { data } = await api.get<PaginatedResponse<AdminCustomer>>("/admin/businesses/", { params });
      setCustomers(data.results);
      setTotal(data.count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function openDetail(userId: number) {
    setDetailLoading(true);
    setDevices([]);
    setActiveLicenseId(null);
    try {
      const { data } = await api.get<BusinessDetail>(`/admin/businesses/${userId}/`);
      setDetail(data);
      const license = data.licenses?.find((l) => l.status === "active") ?? data.licenses?.[0];
      if (license) {
        setActiveLicenseId(license.id);
        const devRes = await api.get<PaginatedResponse<DeviceActivation>>(`/licenses/device-activations/`, { params: { license: license.id, page_size: 50 } });
        setDevices(devRes.data.results ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">Manage customer registrations and subscriptions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadCustomers())}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
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
                <th className="px-5 py-4 text-left font-medium">Business Name</th>
                <th className="px-5 py-4 text-left font-medium">Owner Name</th>
                <th className="px-5 py-4 text-left font-medium">Email</th>
                <th className="px-5 py-4 text-left font-medium">Current Plan</th>
                <th className="px-5 py-4 text-left font-medium">License Status</th>
                <th className="px-5 py-4 text-left font-medium">Expiry Date</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-gray-500">No customers found</td></tr>
              ) : (
                customers.map((c) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium text-gray-200">{c.company_name || c.business_name || "—"}</td>
                    <td className="px-5 py-4 text-gray-400">{c.business_name || "—"}</td>
                    <td className="px-5 py-4 text-gray-400">{c.email}</td>
                    <td className="px-5 py-4 text-gray-300">{c.current_plan || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={licenseStatusVariant(c.license_status || "none")} size="sm">{c.license_status ? c.license_status : "No License"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{c.license_expiry ? formatDate(c.license_expiry, { hideTime: true }) : "—"}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => openDetail(c.id)} title="View Details" className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><Eye className="h-4 w-4" /></button>
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
              className="w-full max-w-4xl rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0a0a0f] z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-bold text-gray-200">
                    {(detail.company_name || detail.business_name || detail.email).charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{detail.company_name || detail.business_name || detail.email}</h2>
                    <p className="text-xs text-gray-500">{detail.email}</p>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><XIcon className="h-5 w-5" /></button>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Loading customer details...</div>
              ) : (
                <div className="p-6 space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Account Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Info label="Owner Name" value={detail.business_name || "—"} />
                      <Info label="Email" value={detail.email} />
                      <Info label="Phone" value={detail.phone || "—"} />
                      <Info label="Business Name" value={detail.company_name || "—"} />
                      <Info label="Registered" value={formatDate(detail.date_joined, { hideTime: true })} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Subscription Information</p>
                    {(detail.licenses ?? []).length === 0 ? (
                      <p className="text-sm text-gray-500 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">No active licenses for this customer.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                              <th className="px-4 py-3 text-left font-medium">License Key</th>
                              <th className="px-4 py-3 text-left font-medium">Plan</th>
                              <th className="px-4 py-3 text-left font-medium">Status</th>
                              <th className="px-4 py-3 text-left font-medium">Expiry</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.licenses?.map((l) => (
                              <tr key={l.id} className="border-b border-white/[0.03] last:border-0">
                                <td className="px-4 py-3 font-mono text-xs text-gray-200">{l.license_key}</td>
                                <td className="px-4 py-3 text-gray-300">{planName(l.plan)}</td>
                                <td className="px-4 py-3"><Badge variant={licenseStatusVariant(l.status)} size="sm">{l.status}</Badge></td>
                                <td className="px-4 py-3 text-gray-500">{l.expiry_date ? formatDate(l.expiry_date, { hideTime: true }) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {(detail.recent_payments ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Payments</p>
                      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                              <th className="px-4 py-3 text-left font-medium">Transaction</th>
                              <th className="px-4 py-3 text-left font-medium">Amount</th>
                              <th className="px-4 py-3 text-left font-medium">Date</th>
                              <th className="px-4 py-3 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.recent_payments?.map((p) => (
                              <tr key={p.id} className="border-b border-white/[0.03] last:border-0">
                                <td className="px-4 py-3 font-mono text-[10px] text-gray-300">{p.transaction_id || `#${p.id}`}</td>
                                <td className="px-4 py-3 text-gray-300">{formatCurrency(Number(p.amount))}</td>
                                <td className="px-4 py-3 text-gray-500">{formatDate(p.created_at, { hideTime: true })}</td>
                                <td className="px-4 py-3"><Badge variant={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "danger"} size="sm">{p.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Activated Devices {activeLicenseId ? `(License #${activeLicenseId})` : ""}</p>
                    {devices.length === 0 ? (
                      <p className="text-sm text-gray-500 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">No activated devices.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {devices.map((d) => (
                          <div key={d.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-200 font-medium">{d.device_name}</p>
                              <p className="text-xs text-gray-500 font-mono">{d.device_id}</p>
                            </div>
                            <Badge variant={d.is_active ? "success" : "danger"} size="sm">{d.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function planName(plan: License["plan"]): string {
  if (typeof plan === "object" && plan) return (plan as { name?: string }).name || "N/A";
  return "N/A";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-200 mt-0.5 font-medium truncate">{value}</p>
    </div>
  );
}
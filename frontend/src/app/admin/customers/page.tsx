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
        <p className="mt-1 text-sm text-muted">Manage customer registrations and subscriptions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by name, email or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadCustomers())}
            className="h-10 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-fg placeholder-muted outline-none transition-all focus:border-border-soft focus:bg-surface-elevated"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
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
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-muted">No customers found</td></tr>
              ) : (
                customers.map((c) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-medium text-fg">{c.company_name || c.business_name || "—"}</td>
                    <td className="px-5 py-4 text-muted">{c.business_name || "—"}</td>
                    <td className="px-5 py-4 text-muted">{c.email}</td>
                    <td className="px-5 py-4 text-fg-2">{c.current_plan || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={licenseStatusVariant(c.license_status || "none")} size="sm">{c.license_status ? c.license_status : "No License"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">{c.license_expiry ? formatDate(c.license_expiry, { hideTime: true }) : "—"}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => openDetail(c.id)} title="View Details" className="rounded-lg p-2 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg transition-all"><Eye className="h-4 w-4" /></button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg p-2 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg disabled:opacity-30 transition-all"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg p-2 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg disabled:opacity-30 transition-all"><ChevronRight className="h-4 w-4" /></button>
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
              className="w-full max-w-4xl rounded-2xl backdrop-blur-xl bg-surface border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-surface z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated text-sm font-bold text-fg">
                    {(detail.company_name || detail.business_name || detail.email).charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{detail.company_name || detail.business_name || detail.email}</h2>
                    <p className="text-xs text-muted">{detail.email}</p>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg transition-all"><XIcon className="h-5 w-5" /></button>
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-16 text-muted gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Loading customer details...</div>
              ) : (
                <div className="p-6 space-y-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Account Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Info label="Owner Name" value={detail.business_name || "—"} />
                      <Info label="Email" value={detail.email} />
                      <Info label="Phone" value={detail.phone || "—"} />
                      <Info label="Business Name" value={detail.company_name || "—"} />
                      <Info label="Registered" value={formatDate(detail.date_joined, { hideTime: true })} />
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Subscription Information</p>
                    {(detail.licenses ?? []).length === 0 ? (
                      <p className="text-sm text-muted rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-6 text-center">No active licenses for this customer.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted">
                              <th className="px-4 py-3 text-left font-medium">License Key</th>
                              <th className="px-4 py-3 text-left font-medium">Plan</th>
                              <th className="px-4 py-3 text-left font-medium">Status</th>
                              <th className="px-4 py-3 text-left font-medium">Expiry</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.licenses?.map((l) => (
                              <tr key={l.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 font-mono text-xs text-fg">{l.license_key}</td>
                                <td className="px-4 py-3 text-fg-2">{planName(l.plan)}</td>
                                <td className="px-4 py-3"><Badge variant={licenseStatusVariant(l.status)} size="sm">{l.status}</Badge></td>
                                <td className="px-4 py-3 text-muted">{l.expiry_date ? formatDate(l.expiry_date, { hideTime: true }) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {(detail.recent_payments ?? []).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Recent Payments</p>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted">
                              <th className="px-4 py-3 text-left font-medium">Transaction</th>
                              <th className="px-4 py-3 text-left font-medium">Amount</th>
                              <th className="px-4 py-3 text-left font-medium">Date</th>
                              <th className="px-4 py-3 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.recent_payments?.map((p) => (
                              <tr key={p.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3 font-mono text-[10px] text-fg-2">{p.transaction_id || `#${p.id}`}</td>
                                <td className="px-4 py-3 text-fg-2">{formatCurrency(Number(p.amount))}</td>
                                <td className="px-4 py-3 text-muted">{formatDate(p.created_at, { hideTime: true })}</td>
                                <td className="px-4 py-3"><Badge variant={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "danger"} size="sm">{p.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Activated Devices {activeLicenseId ? `(License #${activeLicenseId})` : ""}</p>
                    {devices.length === 0 ? (
                      <p className="text-sm text-muted rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">No activated devices.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {devices.map((d) => (
                          <div key={d.id} className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm text-fg font-medium">{d.device_name}</p>
                              <p className="text-xs text-muted font-mono">{d.device_id}</p>
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
    <div className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-fg mt-0.5 font-medium truncate">{value}</p>
    </div>
  );
}
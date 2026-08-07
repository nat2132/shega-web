"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye as EyeIcon,
  X as XIcon,
  Clock,
  Ban,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PaginatedResponse, DeviceActivation } from "@/lib/types";

interface AdminSubscription {
  id: number;
  license_key: string;
  customer: number;
  customer_name: string;
  customer_email: string;
  plan_name: string;
  plan_label?: string | null;
  platform?: string | null;
  status: "active" | "expired" | "suspended" | "revoked" | string;
  start_date: string;
  expiry_date: string;
  device_limit: number;
  days_remaining: number;
  notes?: string;
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  expired: "danger",
  suspended: "warning",
  revoked: "danger",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<AdminSubscription | null>(null);
  const [devices, setDevices] = useState<DeviceActivation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [extendLicense, setExtendLicense] = useState<AdminSubscription | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [actionLoading, setActionLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  async function loadLicenses() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<AdminSubscription>>("/admin/subscriptions/", { params });
      setLicenses(data.results);
      setTotal(data.count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function openDetail(l: AdminSubscription) {
    setDetail(l);
    setDetailLoading(true);
    setDevices([]);
    try {
      const res = await api.get<PaginatedResponse<DeviceActivation>>(`/licenses/device-activations/`, { params: { license: l.id, page_size: 50 } });
      setDevices(res.data.results ?? []);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleExtend() {
    if (!extendLicense) return;
    setActionLoading(true);
    try {
      const days = parseInt(extendDays, 10);
      await api.post(`/admin/subscriptions/${extendLicense.id}/extend/`, { days });
      setExtendLicense(null);
      loadLicenses();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(l: AdminSubscription) {
    try {
      await api.post(`/licenses/licenses/${l.id}/suspend/`, { reason: "Deactivated by admin" });
      loadLicenses();
      if (detail?.id === l.id) {
        setDetail({ ...detail, status: "suspended" });
      }
    } catch {
      /* ignore */
    }
  }

  async function handleResetDevice(l: AdminSubscription) {
    if (!detail || detail.id !== l.id) return;
    setActionLoading(true);
    try {
      const active = devices.filter((d) => d.is_active);
      for (const device of active) {
        await api.post(`/licenses/licenses/${l.id}/deactivate_device/`, { device_id: device.device_id });
      }
      openDetail(l);
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
        <p className="mt-1 text-sm text-muted">Manage generated software licenses</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by license key or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadLicenses())}
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
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-5 py-4 text-left font-medium">License Key</th>
                <th className="px-5 py-4 text-left font-medium">Customer</th>
                <th className="px-5 py-4 text-left font-medium">Plan</th>
                <th className="px-5 py-4 text-left font-medium">Platform</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Expiry Date</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
                </td></tr>
              ) : licenses.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-muted">No licenses found</td></tr>
              ) : (
                licenses.map((l) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-mono text-xs text-fg">{l.license_key}</td>
                    <td className="px-5 py-4 text-fg-2">{l.customer_name}</td>
                    <td className="px-5 py-4 text-muted">{l.plan_label || l.plan_name}</td>
                    <td className="px-5 py-4 text-muted">{l.platform || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant[l.status] || "default"} size="sm">{l.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">{l.expiry_date ? formatDate(l.expiry_date, { hideTime: true }) : "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(l)} title="View" className="rounded-lg p-1.5 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg transition-all"><EyeIcon className="h-4 w-4" /></button>
                        <button onClick={() => { setExtendLicense(l); setExtendDays("30"); }} title="Extend" className="rounded-lg p-1.5 text-emerald-400 hover:bg-surface dark:hover:bg-white/[0.06] transition-all"><Clock className="h-4 w-4" /></button>
                        <button onClick={() => openDetail(l)} title="Reset Device" className="rounded-lg p-1.5 text-amber-400 hover:bg-surface dark:hover:bg-white/[0.06] transition-all"><Smartphone className="h-4 w-4" /></button>
                        {l.status === "active" && (
                          <button onClick={() => handleDeactivate(l)} title="Deactivate" className="rounded-lg p-1.5 text-red-400 hover:bg-surface dark:hover:bg-white/[0.06] transition-all"><Ban className="h-4 w-4" /></button>
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
              className="w-full max-w-3xl rounded-2xl backdrop-blur-xl bg-surface border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-surface z-10">
                <div>
                  <h2 className="text-lg font-semibold">License Details</h2>
                  <p className="text-xs text-muted font-mono">{detail.license_key}</p>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg transition-all"><XIcon className="h-5 w-5" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Info label="Customer" value={detail.customer_name} />
                  <Info label="Email" value={detail.customer_email} />
                  <Info label="Plan" value={detail.plan_label || detail.plan_name} />
                  <Info label="Status" value={detail.status} />
                  <Info label="Start Date" value={detail.start_date ? formatDate(detail.start_date, { hideTime: true }) : "—"} />
                  <Info label="Expiry Date" value={detail.expiry_date ? formatDate(detail.expiry_date, { hideTime: true }) : "—"} />
                  <Info label="Device Limit" value={String(detail.device_limit ?? "—")} />
                  <Info label="Platform" value={detail.platform || "—"} />
                  <Info label="Days Remaining" value={String(detail.days_remaining ?? "—")} />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Activated Devices</p>
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Loading devices...</div>
                  ) : devices.length === 0 ? (
                    <p className="text-sm text-muted rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">No activated devices.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {devices.map((d) => (
                        <div key={d.id} className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-fg font-medium flex items-center gap-2"><Smartphone className="h-3.5 w-3.5 text-muted" />{d.device_name}</p>
                            <p className="text-xs text-muted font-mono mt-0.5">{d.device_id} · {d.operating_system}</p>
                          </div>
                          <Badge variant={d.is_active ? "success" : "danger"} size="sm">{d.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {devices.some((d) => d.is_active) && (
                    <Button variant="secondary" onClick={() => handleResetDevice(detail)} isLoading={actionLoading} className="mt-4">
                      Reset All Devices
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {extendLicense && (
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
              className="w-full max-w-sm rounded-2xl backdrop-blur-xl bg-surface border border-border p-6"
            >
              <h3 className="text-lg font-semibold mb-1">Extend License</h3>
              <p className="text-sm text-muted mb-4">License <span className="font-mono text-fg">{extendLicense.license_key}</span></p>
              <label className="mb-1.5 block text-xs font-medium text-muted">Extend by (days)</label>
              <input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft mb-4"
              />
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setExtendLicense(null)}>Cancel</Button>
                <Button onClick={handleExtend} isLoading={actionLoading}>Extend</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-fg mt-0.5 font-medium truncate">{value}</p>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Smartphone,
  Monitor,
  X,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface AppVersion {
  id: number;
  platform: "mobile" | "desktop";
  version: string;
  min_version: string;
  force_update: boolean;
  release_notes: string;
  download_url: string;
  created_at: string;
}

interface PaginatedVersions {
  count: number;
  results: AppVersion[];
}

export default function VersionsPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [form, setForm] = useState({
    platform: "mobile",
    version: "",
    min_version: "",
    force_update: false,
    release_notes: "",
    download_url: "",
  });

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadVersions() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedVersions>("/admin/versions/", {
        params: { page, page_size: pageSize },
      });
      setVersions(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load versions");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      platform: "mobile",
      version: "",
      min_version: "",
      force_update: false,
      release_notes: "",
      download_url: "",
    });
    setModalOpen(true);
  }

  function openEdit(v: AppVersion) {
    setEditing(v);
    setForm({
      platform: v.platform,
      version: v.version,
      min_version: v.min_version,
      force_update: v.force_update,
      release_notes: v.release_notes,
      download_url: v.download_url,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/versions/${editing.id}/`, form);
        toast.success("Version updated");
      } else {
        await api.post("/admin/versions/", form);
        toast.success("Version created");
      }
      setModalOpen(false);
      loadVersions();
    } catch {
      toast.error("Operation failed");
    }
  }

  async function handleDelete(v: AppVersion) {
    if (!confirm(`Delete version ${v.version}?`)) return;
    try {
      await api.delete(`/admin/versions/${v.id}/`);
      toast.success("Version deleted");
      loadVersions();
    } catch {
      toast.error("Failed to delete version");
    }
  }

  async function handleNotify(v: AppVersion) {
    try {
      await api.post(`/admin/versions/${v.id}/notify/`);
      toast.success("Update notification sent to users");
    } catch {
      toast.error("Failed to send notification");
    }
  }

  const mobileVersions = versions.filter((v) => v.platform === "mobile");
  const desktopVersions = versions.filter((v) => v.platform === "desktop");

  function renderTable(data: AppVersion[]) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs text-gray-500">
              <th className="px-5 py-4 text-left font-medium">Version</th>
              <th className="px-5 py-4 text-left font-medium">Min Version</th>
              <th className="px-5 py-4 text-left font-medium">Force Update</th>
              <th className="px-5 py-4 text-left font-medium">Release Notes</th>
              <th className="px-5 py-4 text-left font-medium">Download URL</th>
              <th className="px-5 py-4 text-left font-medium">Created</th>
              <th className="px-5 py-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <motion.tr
                key={v.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-5 py-4 font-mono text-sm text-gray-200">{v.version}</td>
                <td className="px-5 py-4 font-mono text-xs text-gray-400">{v.min_version || "—"}</td>
                <td className="px-5 py-4">
                  {v.force_update ? (
                    <Badge variant="danger">Required</Badge>
                  ) : (
                    <Badge variant="default">Optional</Badge>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-400 max-w-[200px] truncate">
                  {v.release_notes || "—"}
                </td>
                <td className="px-5 py-4 text-xs text-indigo-400 max-w-[150px] truncate">
                  {v.download_url ? (
                    <a href={v.download_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {v.download_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">{formatDate(v.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(v)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleNotify(v)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                      title="Notify Users"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                  No versions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Versions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage mobile and desktop application versions</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Create Version</Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-100">Mobile Versions</h2>
        </div>
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
            </div>
          ) : (
            renderTable(mobileVersions)
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-100">Desktop Versions</h2>
        </div>
        <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
            </div>
          ) : (
            renderTable(desktopVersions)
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
              className="w-full max-w-lg rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <h2 className="text-lg font-semibold">
                  {editing ? "Edit Version" : "Create Version"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="desktop">Desktop</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Version</label>
                    <input
                      required
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                      placeholder="1.0.0"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Min Version</label>
                    <input
                      value={form.min_version}
                      onChange={(e) => setForm({ ...form, min_version: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Release Notes</label>
                  <textarea
                    value={form.release_notes}
                    onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                    placeholder="Describe what's new in this version..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Download URL</label>
                  <input
                    value={form.download_url}
                    onChange={(e) => setForm({ ...form, download_url: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="force_update"
                    checked={form.force_update}
                    onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400"
                  />
                  <label htmlFor="force_update" className="text-sm text-gray-300">
                    Force update (users must update to continue)
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editing ? "Update" : "Create"}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

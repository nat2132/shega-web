"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface FeatureFlag {
  id: number;
  name: string;
  code: string;
  description: string;
  is_enabled: boolean;
  is_beta: boolean;
}

interface PaginatedFeatures {
  count: number;
  results: FeatureFlag[];
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    is_beta: false,
  });

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadFeatures() {
    setLoading(true);
    try {
      const { data } = await api.get<PaginatedFeatures>("/admin/features/", {
        params: { page, page_size: pageSize },
      });
      setFeatures(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load features");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", code: "", description: "", is_beta: false });
    setModalOpen(true);
  }

  function openEdit(f: FeatureFlag) {
    setEditing(f);
    setForm({ name: f.name, code: f.code, description: f.description, is_beta: f.is_beta });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/admin/features/${editing.id}/`, form);
        toast.success("Feature updated");
      } else {
        await api.post("/admin/features/", form);
        toast.success("Feature created");
      }
      setModalOpen(false);
      loadFeatures();
    } catch {
      toast.error("Operation failed");
    }
  }

  async function toggleFeature(feature: FeatureFlag) {
    try {
      await api.patch(`/admin/features/${feature.id}/`, {
        is_enabled: !feature.is_enabled,
      });
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === feature.id ? { ...f, is_enabled: !f.is_enabled } : f
        )
      );
      toast.success(`Feature ${feature.is_enabled ? "disabled" : "enabled"}`);
    } catch {
      toast.error("Failed to toggle feature");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage feature flags and toggles</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Create Feature Flag</Button>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Name</th>
                <th className="px-5 py-4 text-left font-medium">Code</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Beta</th>
                <th className="px-5 py-4 text-left font-medium">Description</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                    <p className="mt-2 text-sm text-gray-500">Loading...</p>
                  </td>
                </tr>
              ) : features.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    No feature flags found
                  </td>
                </tr>
              ) : (
                features.map((feature) => (
                  <motion.tr
                    key={feature.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4 font-medium text-gray-200">{feature.name}</td>
                    <td className="px-5 py-4">
                      <code className="rounded-md bg-white/[0.05] px-2 py-1 text-xs font-mono text-indigo-300">
                        {feature.code}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleFeature(feature)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                          feature.is_enabled
                            ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/15"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/15"
                        )}
                      >
                        {feature.is_enabled ? (
                          <ToggleRight className="h-3.5 w-3.5" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5" />
                        )}
                        {feature.is_enabled ? "On" : "Off"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {feature.is_beta ? (
                        <Badge variant="warning">Beta</Badge>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 max-w-[200px] truncate">
                      {feature.description || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(feature)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
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
                  {editing ? "Edit Feature Flag" : "Create Feature Flag"}
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
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                    placeholder="e.g. Dark Mode"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Code</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15] font-mono"
                    placeholder="e.g. dark_mode"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none"
                    placeholder="What does this feature do?"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_beta"
                    checked={form.is_beta}
                    onChange={(e) => setForm({ ...form, is_beta: e.target.checked })}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400"
                  />
                  <label htmlFor="is_beta" className="text-sm text-gray-300">
                    Beta feature
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

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { LicensePlan, PaginatedResponse } from "@/lib/types";

export default function PlansPage() {
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LicensePlan | null>(null);
  const [editing, setEditing] = useState<LicensePlan | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    price: "",
    duration_days: "30",
    max_activations: "1",
    is_active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data } = await api.get<PaginatedResponse<LicensePlan>>("/admin/plans/");
      setPlans(data.results);
    } catch {
      /* ignore */
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", code: "", description: "", price: "", duration_days: "30", max_activations: "1", is_active: true });
    setModalOpen(true);
  }

  function openEdit(plan: LicensePlan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      code: plan.code,
      description: plan.description,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      max_activations: plan.max_activations.toString(),
      is_active: plan.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseFloat(form.price), duration_days: parseInt(form.duration_days), max_activations: parseInt(form.max_activations) };
      if (editing) {
        await api.patch(`/admin/plans/${editing.id}/`, payload);
      } else {
        await api.post("/admin/plans/", payload);
      }
      setModalOpen(false);
      loadPlans();
    } catch {
      /* ignore */
    }
  }

  async function toggleActive(plan: LicensePlan) {
    try {
      await api.patch(`/admin/plans/${plan.id}/`, { is_active: !plan.is_active });
      loadPlans();
    } catch {
      /* ignore */
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/admin/plans/${deleteConfirm.id}/`);
      setDeleteConfirm(null);
      loadPlans();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">License Plans</h1>
          <p className="mt-1 text-sm text-gray-500">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Add Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "rounded-2xl backdrop-blur-xl border p-5 transition-all duration-300 hover:border-white/[0.12]",
              plan.is_active
                ? "bg-white/[0.03] border-white/[0.06]"
                : "bg-white/[0.01] border-white/[0.03] opacity-60"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.code}</p>
              </div>
              <button
                onClick={() => toggleActive(plan)}
                className={cn("transition-colors", plan.is_active ? "text-gray-200" : "text-gray-500")}
              >
                {plan.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
              </button>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">{formatCurrency(plan.price)}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-400">
                <span>Duration</span>
                <span className="text-gray-200">{plan.duration_days} days</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Device Limit</span>
                <span className="text-gray-200">{plan.max_activations}</span>
              </div>
            </div>
            {plan.description && (
              <p className="mt-3 text-xs text-gray-500 line-clamp-2">{plan.description}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => openEdit(plan)} className="flex-1 rounded-xl border border-white/[0.06] py-2 text-xs font-medium text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-all flex items-center justify-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => setDeleteConfirm(plan)} className="flex-1 rounded-xl border border-white/[0.06] py-2 text-xs font-medium text-gray-400 hover:bg-white/[0.04] hover:text-gray-400 transition-all flex items-center justify-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-16">
            <p className="text-sm text-gray-500">No plans yet. Create your first plan.</p>
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
                <h2 className="text-lg font-semibold">{editing ? "Edit Plan" : "Add Plan"}</h2>
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Plan Name</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Code</label>
                    <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Price (ETB)</label>
                    <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Duration (days)</label>
                    <input required type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Max Devices</label>
                    <input required type="number" min="1" value={form.max_activations} onChange={(e) => setForm({ ...form, max_activations: e.target.value })}
                      className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="plan_active" checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400" />
                  <label htmlFor="plan_active" className="text-sm text-gray-300">Active</label>
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
        {deleteConfirm && (
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
              className="w-full max-w-sm rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08] shadow-premium-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-2">Delete Plan</h2>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete <span className="text-gray-200 font-medium">{deleteConfirm.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} icon={Trash2}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

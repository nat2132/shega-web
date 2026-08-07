"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit3, X as XIcon, ToggleLeft, ToggleRight } from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { LicensePlan, PaginatedResponse } from "@/lib/types";

interface PlanForm {
  name: string;
  price: string;
  duration_months: string;
  device_limit: string;
  is_active: boolean;
}

const emptyForm: PlanForm = { name: "", price: "", duration_months: "1", device_limit: "1", is_active: true };

export default function PlansPage() {
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LicensePlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadPlans() {
    try {
      const { data } = await api.get<PaginatedResponse<LicensePlan>>("/licenses/plans/", { params: { page_size: 100 } });
      setPlans(data.results ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlans();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(plan: LicensePlan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      price: plan.price.toString(),
      duration_months: plan.duration_months?.toString() || "1",
      device_limit: plan.device_limit?.toString() || "1",
      is_active: plan.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      duration_months: parseInt(form.duration_months, 10),
      device_limit: parseInt(form.device_limit, 10),
      is_active: form.is_active,
    };
    try {
      if (editing) {
        await api.patch(`/licenses/plans/${editing.id}/`, payload);
      } else {
        await api.post("/licenses/plans/", payload);
      }
      setModalOpen(false);
      loadPlans();
    } catch {
      /* ignore */
    }
  }

  async function toggleActive(plan: LicensePlan) {
    try {
      await api.patch(`/licenses/plans/${plan.id}/`, { is_active: !plan.is_active });
      loadPlans();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Add Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <p className="text-sm text-muted">No plans yet. Create your first plan.</p>
          </div>
        ) : (
          plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-2xl backdrop-blur-xl border p-5 transition-all duration-300",
                plan.is_active ? "bg-surface border-border" : "bg-black/[0.02] dark:bg-white/[0.01] border-black/[0.05] dark:border-white/[0.05] opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-fg">{plan.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{plan.duration_months} mo · {plan.device_limit} device(s)</p>
                </div>
                <button onClick={() => toggleActive(plan)} className={cn("transition-colors", plan.is_active ? "text-fg" : "text-muted")}>
                  {plan.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-fg">{formatCurrency(plan.price)}</span>
              </div>
              <div className="mb-2">
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", plan.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-surface text-muted")}>
                  {plan.is_active ? "Active" : "Disabled"}
                </span>
              </div>
              <button
                onClick={() => openEdit(plan)}
                className="mt-4 w-full rounded-xl border border-border py-2 text-xs font-medium text-muted hover:bg-surface hover:text-fg transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </button>
            </motion.div>
          ))
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
              className="w-full max-w-lg rounded-2xl backdrop-blur-xl bg-surface border border-border"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold">{editing ? "Edit Plan" : "Add Plan"}</h2>
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface dark:hover:bg-white/[0.06] hover:text-fg transition-all"><XIcon className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Plan Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Price (ETB)</label>
                    <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Duration (mo)</label>
                    <input required type="number" min="1" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Device Limit (0=unlimited)</label>
                    <input required type="number" min="0" value={form.device_limit} onChange={(e) => setForm({ ...form, device_limit: e.target.value })} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="plan_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-border bg-surface text-accent focus:ring-accent" />
                  <label htmlFor="plan_active" className="text-sm text-fg-2">Active</label>
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
    </div>
  );
}
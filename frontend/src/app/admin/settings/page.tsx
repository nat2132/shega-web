"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Sliders,
  DollarSign,
  CreditCard,
  Shield,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface SystemSettings {
  site_name: string;
  support_email: string;
  support_phone: string;
  support_address: string;
  trial_duration_days: number;
  maintenance_mode: boolean;
  mobile_basic_price: number;
  mobile_premium_price: number;
  desktop_basic_price: number;
  desktop_premium_price: number;
  telebirr_merchant_id: string;
  telebirr_api_key: string;
  currency: string;
  tax_rate: number;
  terms_conditions: string;
  privacy_policy: string;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [form, setForm] = useState<SystemSettings>({
    site_name: "Shega ERP",
    support_email: "support@shegaerp.com",
    support_phone: "+251-11-555-1234",
    support_address: "Addis Ababa, Ethiopia",
    trial_duration_days: 14,
    maintenance_mode: false,
    mobile_basic_price: 199,
    mobile_premium_price: 499,
    desktop_basic_price: 299,
    desktop_premium_price: 699,
    telebirr_merchant_id: "",
    telebirr_api_key: "",
    currency: "ETB",
    tax_rate: 15,
    terms_conditions: "",
    privacy_policy: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<SystemSettings>("/admin/settings/")
      .then(({ data }) => {
        setForm((prev) => ({ ...prev, ...data }));
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/admin/settings/", form);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    { key: "general", label: "General", icon: Sliders },
    { key: "pricing", label: "Pricing", icon: DollarSign },
    { key: "payment", label: "Payment", icon: CreditCard },
    { key: "legal", label: "Legal", icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure system preferences</p>
        </div>
        <Button onClick={handleSave} icon={Save} isLoading={saving}>Save Changes</Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/[0.06] pb-3">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all " +
              (activeSection === s.key
                ? "bg-white/[0.08] text-gray-200"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200")
            }
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-6"
      >
        {activeSection === "general" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">General Settings</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Site Name</label>
              <input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Support Email</label>
              <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Support Phone</label>
              <input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Support Address</label>
              <textarea value={form.support_address} onChange={(e) => setForm({ ...form, support_address: e.target.value })} rows={2}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Trial Duration (days)</label>
              <input type="number" min="0" value={form.trial_duration_days} onChange={(e) => setForm({ ...form, trial_duration_days: Number(e.target.value) })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="maintenance_mode" checked={form.maintenance_mode}
                onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400" />
              <label htmlFor="maintenance_mode" className="text-sm text-gray-300">Maintenance Mode</label>
            </div>
          </div>
        )}

        {activeSection === "pricing" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">Pricing Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Mobile Basic Price</label>
                <input type="number" min="0" value={form.mobile_basic_price} onChange={(e) => setForm({ ...form, mobile_basic_price: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Mobile Premium Price</label>
                <input type="number" min="0" value={form.mobile_premium_price} onChange={(e) => setForm({ ...form, mobile_premium_price: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Desktop Basic Price</label>
                <input type="number" min="0" value={form.desktop_basic_price} onChange={(e) => setForm({ ...form, desktop_basic_price: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Desktop Premium Price</label>
                <input type="number" min="0" value={form.desktop_premium_price} onChange={(e) => setForm({ ...form, desktop_premium_price: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
              </div>
            </div>
          </div>
        )}

        {activeSection === "payment" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">Payment Settings</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Telebirr Merchant ID</label>
              <input value={form.telebirr_merchant_id} onChange={(e) => setForm({ ...form, telebirr_merchant_id: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Telebirr API Key</label>
              <input type="password" value={form.telebirr_api_key} onChange={(e) => setForm({ ...form, telebirr_api_key: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                  <option value="ETB">ETB (Birr)</option>
                  <option value="USD">USD (Dollar)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Tax Rate (%)</label>
                <input type="number" min="0" max="100" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                  className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
              </div>
            </div>
          </div>
        )}

        {activeSection === "legal" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">Legal Documents</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Terms &amp; Conditions</label>
              <textarea value={form.terms_conditions} onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })} rows={8}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-y font-mono" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Privacy Policy</label>
              <textarea value={form.privacy_policy} onChange={(e) => setForm({ ...form, privacy_policy: e.target.value })} rows={8}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-y font-mono" />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

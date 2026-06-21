"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Mail, Shield, CreditCard, Sliders } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Settings {
  site_name: string;
  support_email: string;
  support_phone: string;
  company_address: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  default_license_duration: string;
  max_activations_default: string;
  allow_auto_renew: boolean;
  currency: string;
  payment_gateway: string;
  gateway_api_key: string;
  gateway_secret: string;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [form, setForm] = useState<Settings>({
    site_name: "Shega ERP",
    support_email: "support@shegaerp.com",
    support_phone: "+251-11-555-1234",
    company_address: "Addis Ababa, Ethiopia",
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    default_license_duration: "365",
    max_activations_default: "3",
    allow_auto_renew: true,
    currency: "ETB",
    payment_gateway: "chapa",
    gateway_api_key: "",
    gateway_secret: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await api.get<Settings>("/admin/settings/");
      setForm((prev) => ({ ...prev, ...data }));
    } catch {
      /* ignore */
    }
  }

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
    { key: "email", label: "Email", icon: Mail },
    { key: "license", label: "License Defaults", icon: Shield },
    { key: "payment", label: "Payment", icon: CreditCard },
  ];

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
            className={(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all " +
               (activeSection === s.key
                ? "bg-white/[0.08] text-gray-200"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200")
            )}
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
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Company Address</label>
              <textarea value={form.company_address} onChange={(e) => setForm({ ...form, company_address: e.target.value })} rows={2}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-100 outline-none focus:border-white/[0.15] resize-none" />
            </div>
          </div>
        )}

        {activeSection === "email" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">Email Settings</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">SMTP Host</label>
              <input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">SMTP Port</label>
              <input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">SMTP Username</label>
              <input value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">SMTP Password</label>
              <input type="password" value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
          </div>
        )}

        {activeSection === "license" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">License Defaults</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Default License Duration (days)</label>
              <input type="number" min="1" value={form.default_license_duration} onChange={(e) => setForm({ ...form, default_license_duration: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Default Max Activations</label>
              <input type="number" min="1" value={form.max_activations_default} onChange={(e) => setForm({ ...form, max_activations_default: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="auto_renew" checked={form.allow_auto_renew}
                onChange={(e) => setForm({ ...form, allow_auto_renew: e.target.checked })}
                className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.03] text-gray-200 focus:ring-gray-400" />
              <label htmlFor="auto_renew" className="text-sm text-gray-300">Allow automatic renewal</label>
            </div>
          </div>
        )}

        {activeSection === "payment" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-gray-100 mb-4">Payment Settings</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                <option value="ETB">ETB (Birr)</option>
                <option value="USD">USD (Dollar)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Payment Gateway</label>
              <select value={form.payment_gateway} onChange={(e) => setForm({ ...form, payment_gateway: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]">
                <option value="chapa">Chapa</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">API Key</label>
              <input type="password" value={form.gateway_api_key} onChange={(e) => setForm({ ...form, gateway_api_key: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">API Secret</label>
              <input type="password" value={form.gateway_secret} onChange={(e) => setForm({ ...form, gateway_secret: e.target.value })}
                className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]" />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

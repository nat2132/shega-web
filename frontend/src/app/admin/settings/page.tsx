"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Building2, Smartphone, Shield, Lock } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface SettingItem {
  key: string;
  value: string;
  type: string;
  description?: string;
}

interface SystemSettingsResponse {
  settings: SettingItem[];
}

const BUSINESS_KEYS = ["company_name", "support_email"];
const PAYMENT_KEYS = ["telebirr_number"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState({ company_name: "", support_email: "" });
  const [payment, setPayment] = useState({ telebirr_number: "" });

  const [password, setPassword] = useState({ old_password: "", new_password: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    api
      .get<SystemSettingsResponse>("/admin/settings/")
      .then(({ data }) => {
        const list = data.settings ?? [];
        const byKey: Record<string, string> = {};
        list.forEach((s) => { byKey[s.key] = s.value; });
        setBusiness({ company_name: byKey.company_name || "Shega", support_email: byKey.support_email || "" });
        setPayment({ telebirr_number: byKey["telebirr_number"] || "" });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const payload: SettingItem[] = [
      ...BUSINESS_KEYS.map((key) => ({ key, value: business[key as keyof typeof business], type: "string" })),
      ...PAYMENT_KEYS.map((key) => ({ key, value: payment[key as keyof typeof payment], type: "string" })),
    ];
    try {
      await api.put("/admin/settings/", payload);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password/", password);
      toast.success("Password changed");
      setPassword({ old_password: "", new_password: "" });
    } catch {
      toast.error("Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  const sections = [
    { key: "business", label: "Business Information", icon: Building2 },
    { key: "payment", label: "Payment Information", icon: Smartphone },
    { key: "security", label: "Security", icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage business and payment configuration</p>
        </div>
        {activeSection !== "security" && <Button onClick={handleSave} icon={Save} isLoading={saving}>Save Changes</Button>}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all " +
              (activeSection === s.key ? "bg-surface text-fg" : "text-muted hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-fg")
            }
          >
            <s.icon className="h-4 w-4" />
            {s.label}
          </button>
        ))}
      </div>

      <motion.div key={activeSection} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl backdrop-blur-xl bg-surface border border-border p-6">
        {activeSection === "business" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-fg mb-4">Business Information</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Company Name</label>
              <input value={business.company_name} onChange={(e) => setBusiness({ ...business, company_name: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Support Email</label>
              <input type="email" value={business.support_email} onChange={(e) => setBusiness({ ...business, support_email: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
            </div>
          </div>
        )}

        {activeSection === "payment" && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-base font-semibold text-fg mb-4">Payment Information</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Telebirr Number</label>
              <input value={payment.telebirr_number} onChange={(e) => setPayment({ ...payment, telebirr_number: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
            </div>
          </div>
        )}

        {activeSection === "security" && (
          <form onSubmit={handlePassword} className="space-y-4 max-w-xl">
            <h3 className="flex items-center gap-2 text-base font-semibold text-fg mb-4"><Lock className="h-4 w-4 text-muted" /> Change Password</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Current Password</label>
              <input type="password" required value={password.old_password} onChange={(e) => setPassword({ ...password, old_password: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">New Password</label>
              <input type="password" required minLength={8} value={password.new_password} onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-border-soft" />
            </div>
            <Button type="submit" isLoading={passwordLoading} icon={Lock}>Update Password</Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
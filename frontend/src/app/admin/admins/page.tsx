"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit3,
  Ban,
  CheckCircle,
  Key,
  History,
  Activity,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "finance" | "support";
  status: "active" | "suspended";
  phone: string;
  last_login: string;
}

interface PaginatedAdmins {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminUser[];
}

const roleColors: Record<string, "danger" | "info" | "warning" | "default"> = {
  super_admin: "danger",
  admin: "info",
  finance: "warning",
  support: "default",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance: "Finance",
  support: "Support",
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin" as string,
    phone: "",
  });
  const [resettingPassword, setResettingPassword] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadAdmins() {
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedAdmins>("/admin/admins/", { params });
      setAdmins(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load admins");
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ username: "", email: "", password: "", role: "admin", phone: "" });
    setModalOpen(true);
  }

  function openEdit(admin: AdminUser) {
    setEditing(admin);
    setForm({
      username: admin.username,
      email: admin.email,
      password: "",
      role: admin.role,
      phone: admin.phone,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const payload: Record<string, unknown> = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/admin/admins/${editing.id}/`, payload);
        toast.success("Admin updated");
      } else {
        await api.post("/admin/admins/", form);
        toast.success("Admin created");
      }
      setModalOpen(false);
      loadAdmins();
    } catch {
      toast.error("Operation failed");
    }
  }

  async function handleSuspendActivate(admin: AdminUser) {
    try {
      const action = admin.status === "active" ? "suspend" : "activate";
      await api.post(`/admin/admins/${admin.id}/${action}/`);
      toast.success(`Admin ${action}d`);
      loadAdmins();
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleResetPassword() {
    if (!resettingPassword) return;
    try {
      await api.post(`/admin/admins/${resettingPassword.id}/reset-password/`, {
        password: newPassword,
      });
      toast.success("Password reset successfully");
      setResettingPassword(null);
      setNewPassword("");
    } catch {
      toast.error("Failed to reset password");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage system administrators and their roles</p>
        </div>
        <Button onClick={openAdd} icon={Plus}>Create Admin</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search admins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadAdmins()}
            className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all focus:border-white/[0.15] focus:bg-white/[0.05]"
          />
        </div>
      </div>

      <div className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                <th className="px-5 py-4 text-left font-medium">Username</th>
                <th className="px-5 py-4 text-left font-medium">Email</th>
                <th className="px-5 py-4 text-left font-medium">Role</th>
                <th className="px-5 py-4 text-left font-medium">Status</th>
                <th className="px-5 py-4 text-left font-medium">Last Login</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <motion.tr
                  key={admin.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                        {admin.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-200">{admin.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{admin.email}</td>
                  <td className="px-5 py-4">
                    <Badge variant={roleColors[admin.role]}>{roleLabels[admin.role]}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        admin.status === "active"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      )}
                    >
                      {admin.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    {admin.last_login ? formatDate(admin.last_login) : "Never"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(admin)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSuspendActivate(admin)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                        title={admin.status === "active" ? "Suspend" : "Activate"}
                      >
                        {admin.status === "active" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setResettingPassword(admin);
                          setNewPassword("");
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                        title="Login History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                        title="Activity"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    No administrators found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 disabled:opacity-30 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
                <h2 className="text-lg font-semibold">{editing ? "Edit Admin" : "Create Admin"}</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Username</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Password {editing && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="finance">Finance</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
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

      <AnimatePresence>
        {resettingPassword && (
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
              className="w-full max-w-md rounded-2xl backdrop-blur-xl bg-[#0a0a0f] border border-white/[0.08]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <h2 className="text-lg font-semibold">Reset Password</h2>
                <button
                  onClick={() => setResettingPassword(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-400">
                  Resetting password for <span className="text-gray-200 font-medium">{resettingPassword.username}</span>
                </p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-gray-100 outline-none focus:border-white/[0.15]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setResettingPassword(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResetPassword} disabled={!newPassword}>
                    Reset Password
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

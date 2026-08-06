"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  SearchX,
  Building2,
  Users,
  CreditCard,
  Key,
  Loader2,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type {
  User,
  Business,
  Payment,
  License,
  PaginatedResponse,
  LicensePlan,
} from "@/lib/types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const rowItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface ResultGroup<T> {
  key: string;
  label: string;
  icon: typeof Users;
  color: string;
  items: T[];
  href: string;
}

function cName(c: number | User | undefined): string {
  if (typeof c === "object" && c) return (c as User).full_name || (c as User).business_name || "N/A";
  return "N/A";
}

function planName(p: number | LicensePlan | undefined): string {
  if (typeof p === "object" && p) return (p as LicensePlan).name || "N/A";
  return "N/A";
}

export default function AdminSearchPage() {
  const params = useSearchParams();
  const q = (params.get("q") || "").trim();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("users");

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const paramsObj: Record<string, unknown> = { search: q, page_size: 25 };
        const [bRes, uRes, pRes, lRes] = await Promise.all([
          api.get<PaginatedResponse<Business>>("/admin/businesses/", { params: paramsObj }),
          api.get<PaginatedResponse<User>>("/admin/customers/", { params: paramsObj }),
          api.get<PaginatedResponse<Payment>>("/admin/payments/", { params: paramsObj }),
          api.get<PaginatedResponse<License>>("/admin/licenses/", { params: paramsObj }),
        ]);
        if (cancelled) return;
        setBusinesses(bRes.data.results ?? []);
        setUsers(uRes.data.results ?? []);
        setPayments(pRes.data.results ?? []);
        setLicenses(lRes.data.results ?? []);
      } catch {
        if (!cancelled) setError("Failed to run search");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const groups: ResultGroup<unknown>[] = [
    { key: "users", label: "Users", icon: Users, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", items: users, href: "/admin/customers" },
    { key: "businesses", label: "Businesses", icon: Building2, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", items: businesses, href: "/admin/businesses" },
    { key: "payments", label: "Payments", icon: CreditCard, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", items: payments, href: "/admin/payments" },
    { key: "licenses", label: "Licenses", icon: Key, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", items: licenses, href: "/admin/licenses" },
  ];

  const activeGroup = groups.find((g) => g.key === activeTab) ?? groups[0];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={rowItem}>
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? <>Search Results for “{q}”</> : "Global Search"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search across users, businesses, payments (transaction numbers) and license keys.
        </p>
      </motion.div>

      {!q ? (
        <motion.div variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] p-16 text-center">
          <SearchX className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Type a query in the search bar above to find users, businesses, payments or licenses.</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={rowItem} className="flex flex-wrap items-center gap-2 border-b border-white/[0.06]">
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.key}
                  onClick={() => setActiveTab(g.key)}
                  className={cn(
                    "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors",
                    activeTab === g.key ? "text-gray-200" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {g.label}
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold">
                    {g.items.length}
                  </span>
                  {activeTab === g.key && (
                    <motion.div layoutId="search-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />
                  )}
                </button>
              );
            })}
          </motion.div>

          {loading ? (
            <motion.div variants={rowItem} className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Searching...</p>
            </motion.div>
          ) : error ? (
            <motion.div variants={rowItem} className="rounded-2xl border border-white/[0.06] p-16 text-center">
              <p className="text-red-400">{error}</p>
            </motion.div>
          ) : (
            <motion.div key={activeTab} variants={rowItem} className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
              {loading ? null : activeGroup && (activeGroup.items as unknown[]).length === 0 ? (
                <div className="p-16 text-center">
                  <SearchX className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No {activeGroup.label.toLowerCase()} match “{q}”.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                        {activeGroup.key === "users" && (
                          <>
                            <th className="px-5 py-4 text-left font-medium">Name</th>
                            <th className="px-5 py-4 text-left font-medium">Email</th>
                            <th className="px-5 py-4 text-left font-medium">Business</th>
                            <th className="px-5 py-4 text-left font-medium">Registered</th>
                            <th className="px-5 py-4 text-left font-medium">Status</th>
                          </>
                        )}
                        {activeGroup.key === "businesses" && (
                          <>
                            <th className="px-5 py-4 text-left font-medium">Business</th>
                            <th className="px-5 py-4 text-left font-medium">Owner</th>
                            <th className="px-5 py-4 text-left font-medium">Plan</th>
                            <th className="px-5 py-4 text-left font-medium">Expiry</th>
                            <th className="px-5 py-4 text-left font-medium">Status</th>
                          </>
                        )}
                        {activeGroup.key === "payments" && (
                          <>
                            <th className="px-5 py-4 text-left font-medium">Customer</th>
                            <th className="px-5 py-4 text-left font-medium">Transaction</th>
                            <th className="px-5 py-4 text-left font-medium">Plan</th>
                            <th className="px-5 py-4 text-left font-medium">Amount</th>
                            <th className="px-5 py-4 text-left font-medium">Status</th>
                          </>
                        )}
                        {activeGroup.key === "licenses" && (
                          <>
                            <th className="px-5 py-4 text-left font-medium">License Key</th>
                            <th className="px-5 py-4 text-left font-medium">Business</th>
                            <th className="px-5 py-4 text-left font-medium">Plan</th>
                            <th className="px-5 py-4 text-left font-medium">Expiry</th>
                            <th className="px-5 py-4 text-left font-medium">Status</th>
                          </>
                        )}
                        <th className="px-5 py-4 text-right font-medium">Go</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroup.key === "users" &&
                        (users as User[]).map((u) => (
                          <tr key={u.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-bold text-gray-300">
                                  {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className="font-medium text-gray-200">{u.full_name || u.email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-gray-400">{u.email}</td>
                            <td className="px-5 py-4 text-gray-400">{u.profile?.company_name || u.business_name || "—"}</td>
                            <td className="px-5 py-4 text-gray-400">{formatDate(u.date_joined, { hideTime: true })}</td>
                            <td className="px-5 py-4">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", u.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.03] text-gray-500")}>
                                {u.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <Link href={activeGroup.href} className="flex items-center justify-end text-gray-400 hover:text-white transition-colors">
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      {activeGroup.key === "businesses" &&
                        (businesses as Business[]).map((b) => (
                          <tr key={b.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4"><span className="font-medium text-gray-200">{b.business_name}</span></td>
                            <td className="px-5 py-4 text-gray-400">{b.owner_name}</td>
                            <td className="px-5 py-4"><Badge variant={b.current_plan === "Premium" ? "premium" : "default"} size="sm">{b.current_plan}</Badge></td>
                            <td className="px-5 py-4 text-gray-400">{b.expiry_date ? formatDate(b.expiry_date, { hideTime: true }) : "—"}</td>
                            <td className="px-5 py-4">
                              <Badge variant={b.subscription_status === "active" ? "success" : b.subscription_status === "suspended" ? "warning" : "danger"} size="sm">{b.subscription_status}</Badge>
                            </td>
                            <td className="px-5 py-4">
                              <Link href={activeGroup.href} className="inline-flex items-center justify-end text-gray-400 hover:text-white transition-colors">
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      {activeGroup.key === "payments" &&
                        (payments as Payment[]).map((p) => (
                          <tr key={p.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4"><span className="font-medium text-gray-200">{cName(p.customer)}</span></td>
                            <td className="px-5 py-4 font-mono text-[10px] text-gray-300">{p.transaction_id || `#${p.id}`}</td>
                            <td className="px-5 py-4 text-gray-400">{p.plan_selected || planName(p.plan)}</td>
                            <td className="px-5 py-4 text-gray-200">{formatCurrency(p.amount)}</td>
                            <td className="px-5 py-4">
                              <Badge variant={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "danger"} size="sm">{p.status}</Badge>
                            </td>
                            <td className="px-5 py-4">
                              <Link href={activeGroup.href} className="inline-flex items-center justify-end text-gray-400 hover:text-white transition-colors">
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      {activeGroup.key === "licenses" &&
                        (licenses as License[]).map((l) => (
                          <tr key={l.id} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                            <td className="px-5 py-4 font-mono text-[11px] text-gray-200">{l.license_key}</td>
                            <td className="px-5 py-4 text-gray-400">{cName(l.customer)}</td>
                            <td className="px-5 py-4 text-gray-400">{planName(l.plan)}</td>
                            <td className="px-5 py-4 text-gray-400">{l.expiry_date ? formatDate(l.expiry_date, { hideTime: true }) : "—"}</td>
                            <td className="px-5 py-4">
                              <Badge variant={l.status === "active" ? "success" : l.status === "suspended" ? "warning" : "danger"} size="sm">{l.status}</Badge>
                            </td>
                            <td className="px-5 py-4">
                              <Link href={activeGroup.href} className="inline-flex items-center justify-end text-gray-400 hover:text-white transition-colors">
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {!loading && !error && (
            <motion.div variants={rowItem} className="flex justify-end">
              <Link
                href={activeGroup ? `${activeGroup.href}?search=${encodeURIComponent(q)}` : "#"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] px-4 py-2 text-sm text-gray-300 transition-all hover:bg-white/[0.06]"
              >
                View all in {activeGroup?.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
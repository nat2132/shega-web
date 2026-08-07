"use client";

import { useEffect, useState, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BadgeCheck,
  CreditCard,
  Key,
  Tag,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/payments", label: "Payment Requests", icon: CreditCard },
  { href: "/admin/customers", label: "Customers", icon: BadgeCheck },
  { href: "/admin/licenses", label: "Licenses", icon: Key },
  { href: "/admin/plans", label: "Plans", icon: Tag },
  { href: "/admin/downloads", label: "Downloads", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarLink({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link href={item.href} onClick={onNavigate}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-surface text-fg"
            : "text-muted hover:bg-surface hover:text-fg"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl bg-surface"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <item.icon className="relative z-10 h-5 w-5 shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="relative z-10 truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {item.badge && !collapsed && (
          <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-muted px-1.5 text-[10px] font-bold text-accent">
            {item.badge}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

function NavGroup({
  title,
  items,
  collapsed,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="px-3">
      {!collapsed && (
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-border border-t-accent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-accent" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-fg-2">Loading admin panel</p>
          <div className="flex gap-1">
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="h-1.5 w-1.5 rounded-full bg-muted"
            />
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="h-1.5 w-1.5 rounded-full bg-muted"
            />
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              className="h-1.5 w-1.5 rounded-full bg-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (mounted && !isLoading && (!isAuthenticated || !user?.is_staff)) {
      router.push("/auth/login");
    }
  }, [mounted, isAuthenticated, isLoading, user, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/auth/login");
  }, [logout, router]);

  if (!mounted || isLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAuthenticated || !user?.is_staff) {
    return null;
  }

  const initials = (user.full_name || user.email || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-muted">
          <span className="text-sm font-bold text-accent">S</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="truncate text-base font-semibold tracking-tight text-fg"
            >
              Shega Admin
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto py-4 scrollbar-hide">
        <NavGroup title="Navigation" items={navItems} collapsed={collapsed} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-1 flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm text-muted transition-all hover:bg-surface hover:text-fg"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-all hover:bg-surface hover:text-fg"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-border bg-surface lg:flex"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full w-72 border-r border-border bg-surface"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          "lg:ml-64",
          collapsed && "lg:ml-[72px]"
        )}
      >
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-bg/80 backdrop-blur-xl px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-fg lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-all hover:bg-surface-elevated hover:text-fg"
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-xs font-bold text-accent">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight text-fg-2">
                  {user.full_name || "Admin"}
                </p>
                <p className="text-xs text-muted">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

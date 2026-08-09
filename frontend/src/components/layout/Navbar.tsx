"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Languages } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";
import { useTheme } from "@/hooks/useTheme";

const languages = [
  { code: "en", label: "EN" },
  { code: "am", label: "አማ" },
  { code: "om", label: "OR" },
  { code: "ti", label: "ትግራ" },
];

const navLinks = [
  { label: "nav.home", href: "/" },
  { label: "nav.features", href: "/#features" },
  { label: "nav.pricing", href: "/#pricing" },
  { label: "nav.mobileApp", href: "/#mobile-app" },
  { label: "nav.faq", href: "/#faq" },
  { label: "nav.contact", href: "/#contact" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, language, setLanguage } = useTranslations();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const close = () => setLangOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [langOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-[var(--border-soft)]"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center">
             <Image src="/images/logo.png" alt="SHEGA" width={32} height={32} className="object-contain dark:invert" priority />
           </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">
            SHEGA
          </span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--muted)] transition-colors duration-200 hover:text-[var(--fg)]"
            >
              {t(link.label) as string}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-1.5 md:flex">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
              aria-label="Switch language"
            >
              <Languages className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-1.5 w-24 rounded-xl border border-[var(--border-soft)] bg-white dark:bg-black shadow-lg overflow-hidden"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className={cn(
                        "w-full px-3 py-2 text-[13px] font-medium text-left transition-colors hover:bg-[var(--surface)]",
                        language === lang.code
                          ? "text-[var(--fg)] bg-[var(--surface)]"
                          : "text-[var(--muted)]"
                      )}
                    >
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            href="/#how-it-works"
            className="btn-primary gap-1.5 px-4 py-1.5 text-[13px]"
          >
            {t("nav.startFreeTrial") as string}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--fg)]"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--fg)]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden border-t border-[var(--border-soft)] bg-white dark:bg-black"
          >
            <div className="space-y-0.5 px-5 pb-5 pt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--fg)]"
                >
                  {t(link.label) as string}
                </Link>
              ))}
              <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); }}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          language === lang.code
                            ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/8"
                            : "border-[var(--border)] text-[var(--muted)]"
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/#how-it-works"
                    onClick={() => setMobileOpen(false)}
                    className="btn-primary flex items-center justify-center gap-2 py-2.5"
                  >
                    {t("nav.startFreeTrial") as string}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export { Navbar };

"use client";

import { motion, type Variants } from "framer-motion";
import { Download, Monitor, HardDrive, Wifi, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const releaseNotes = [
  {
    version: "2.1.0",
    date: "June 1, 2026",
    changes: [
      "Added multi-warehouse support",
      "Improved barcode scanning performance",
      "New debt aging reports",
      "Enhanced POS interface with dark mode",
      "Fixed invoice PDF generation issues",
      "Performance improvements and bug fixes",
    ],
  },
  {
    version: "2.0.1",
    date: "April 15, 2026",
    changes: [
      "Fixed database sync issue on slow connections",
      "Improved receipt printer compatibility",
      "Updated currency exchange rate API",
      "Minor UI fixes",
    ],
  },
  {
    version: "2.0.0",
    date: "March 1, 2026",
    changes: [
      "Complete UI redesign with modern look",
      "Offline mode support",
      "Real-time cloud sync",
      "Employee management module",
      "Advanced analytics dashboard",
      "API access for integrations",
    ],
  },
  {
    version: "1.3.0",
    date: "January 10, 2026",
    changes: [
      "Supplier management module",
      "Purchase order system",
      "Price history tracking",
      "Export reports to PDF/Excel",
    ],
  },
  {
    version: "1.2.0",
    date: "November 20, 2025",
    changes: [
      "Debt management system",
      "Payment reminders",
      "Customer credit tracking",
      "Notification preferences",
    ],
  },
];

const installSteps = [
  {
    title: "Download the Installer",
    description:
      "Click the download button above to get the Shega installer for Windows.",
  },
  {
    title: "Run the Installer",
    description:
      "Locate the downloaded file (Shega-Setup-2.1.0.exe) and double-click to run it. Allow any security prompts if they appear.",
  },
  {
    title: "Follow Setup Wizard",
    description:
      "Choose your installation directory and follow the on-screen instructions. The default settings are recommended for most users.",
  },
  {
    title: "Launch Shega",
    description:
      "Once installation is complete, launch Shega from the desktop shortcut or Start Menu. Sign in with your account to get started.",
  },
  {
    title: "Activate License",
    description:
      "Enter your license key in the activation screen. If you don't have one, start your 14-day free trial directly from the app.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 bg-glow pointer-events-none" />
          <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Download{" "}
                <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Shega
                </span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                Get the latest version of Shega for Windows. Run your business
                smarter with our all-in-one ERP and POS platform.
              </p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <motion.div
                  className="glass rounded-2xl p-8 text-center sm:p-12"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10">
                    <Monitor className="h-10 w-10 text-indigo-400" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
                    Shega for Windows
                  </h2>
                  <p className="mb-6 text-sm text-zinc-500">
                    Version 2.1.0 &middot; Released June 1, 2026 &middot; 245
                    MB
                  </p>
                  <a
                    href="#"
                    className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="h-5 w-5" />
                    Download for Windows
                  </a>
                  <p className="mt-4 text-xs text-zinc-600">
                    Shega-Setup-2.1.0.exe &middot; Windows 10 or later
                  </p>
                </motion.div>

                <motion.div
                  className="mt-12"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <h3 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
                    System Requirements
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { icon: Monitor, label: "Operating System", value: "Windows 10+" },
                      { icon: HardDrive, label: "RAM", value: "4 GB minimum" },
                      { icon: HardDrive, label: "Storage", value: "500 MB free" },
                      { icon: Wifi, label: "Internet", value: "Required for sync" },
                    ].map((req) => (
                      <div
                        key={req.label}
                        className="glass rounded-xl p-4 text-center"
                      >
                        <req.icon className="mx-auto mb-2 h-5 w-5 text-indigo-400" />
                        <p className="text-xs font-medium text-zinc-500">
                          {req.label}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
                          {req.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="mt-12"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                >
                  <h3 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
                    Installation Guide
                  </h3>
                  <div className="space-y-4">
                    {installSteps.map((step, i) => (
                      <motion.div
                        key={step.title}
                        variants={itemVariants}
                        className="glass rounded-xl p-5 flex gap-4 items-start"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-bold text-indigo-400">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="font-medium text-[var(--foreground)]">
                            {step.title}
                          </h4>
                          <p className="mt-1 text-sm text-zinc-400">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <div>
                <motion.div
                  className="glass rounded-2xl p-6"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                    Release Notes
                  </h3>
                  <div className="space-y-6">
                    {releaseNotes.map((release) => (
                      <div key={release.version}>
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-indigo-400">
                            v{release.version}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {release.date}
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {release.changes.map((change) => (
                            <li
                              key={change}
                              className="flex items-start gap-2 text-xs text-zinc-400"
                            >
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

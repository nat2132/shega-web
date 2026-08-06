"use client";

import { motion, type Variants } from "framer-motion";
import { Download, Smartphone, HardDrive, Wifi, Check } from "lucide-react";
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
    title: "Download the App",
    description: "Click the download button above to get the Shega APK for Android.",
  },
  {
    title: "Install the APK",
    description: "Locate the downloaded file and tap to install. Allow installation from unknown sources if prompted.",
  },
  {
    title: "Launch Shega",
    description: "Once installation is complete, launch Shega from your app drawer. Sign in with your account to get started.",
  },
  {
    title: "Activate License",
    description: "Enter your license key in the activation screen. If you don't have one, start your 7-day free trial directly from the app.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">Latest version 2.1.0</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Download <span className="text-gradient">Shega</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted max-w-2xl mx-auto">
                Get the latest version of Shega for Android. Run your business
                smarter with our all-in-one inventory and sales management platform.
              </p>
            </motion.div>

            <div className="max-w-2xl mx-auto space-y-8">
              <motion.div
                className="glass rounded-2xl p-8 text-center sm:p-12 glass-inner-highlight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06]">
                  <Smartphone className="h-8 w-8 text-foreground" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground tracking-tight">
                  Shega for Android
                </h2>
                <p className="mb-6 text-sm text-muted">
                  Version 2.1.0 &middot; Released June 1, 2026 &middot; 45 MB
                </p>
                <a
                  href="#"
                  className="btn-glass-primary inline-flex h-12 items-center gap-2.5 px-8 text-sm rounded-xl"
                >
                  <Download className="h-5 w-5" />
                  Download for Android
                </a>
                <p className="mt-4 text-xs text-muted/70">
                  Shega-2.1.0.apk &middot; Android 8.0 or later
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <h3 className="mb-6 text-xl font-semibold text-foreground tracking-tight">
                  System Requirements
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Smartphone, label: "Operating System", value: "Android 8.0+" },
                    { icon: HardDrive, label: "RAM", value: "2 GB minimum" },
                    { icon: HardDrive, label: "Storage", value: "200 MB free" },
                    { icon: Wifi, label: "Internet", value: "Required for sync" },
                  ].map((req) => (
                    <div
                      key={req.label}
                      className="glass rounded-xl p-5 text-center glass-inner-highlight"
                    >
                      <req.icon className="mx-auto mb-3 h-5 w-5 text-foreground/40" />
                      <p className="text-xs font-medium text-muted tracking-wider uppercase">
                        {req.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {req.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
              >
                <h3 className="mb-6 text-xl font-semibold text-foreground tracking-tight">
                  Installation Guide
                </h3>
                <div className="space-y-3">
                  {installSteps.map((step, i) => (
                    <motion.div
                      key={step.title}
                      variants={itemVariants}
                      className="glass rounded-2xl p-5 flex gap-4 items-start glass-inner-highlight"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm font-bold text-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {step.title}
                        </h4>
                        <p className="mt-1 text-sm text-muted leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="glass rounded-2xl p-6 glass-inner-highlight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <h3 className="mb-5 text-lg font-semibold text-foreground tracking-tight">
                  Release Notes
                </h3>
                <div className="space-y-6">
                  {releaseNotes.map((release) => (
                    <div key={release.version} className="border-b border-white/[0.04] pb-5 last:border-0 last:pb-0">
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          v{release.version}
                        </span>
                        <span className="text-xs text-muted">
                          {release.date}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {release.changes.map((change) => (
                          <li
                            key={change}
                            className="flex items-start gap-2 text-xs text-muted leading-relaxed"
                          >
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/30" />
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
        </section>
      </main>
      <Footer />
    </div>
  );
}

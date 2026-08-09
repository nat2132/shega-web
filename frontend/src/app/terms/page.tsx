"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const sections = [
  {
    title: "License & Access",
    body:
      "Subject to these Terms, we grant you a limited, non-exclusive, non-transferable right to access and use the Shega Services for your internal business purposes. All other rights remain with Shega.",
  },
  {
    title: "Account Responsibilities",
    body:
      "You are responsible for maintaining the confidentiality of your account and license credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.",
  },
  {
    title: "Offline First",
    body:
      "Shega is an offline-first application. You retain full ownership of the data you enter (sales, inventory, contacts, etc.) locally on your device. Your license is tied to the device and plan you purchased.",
  },
  {
    title: "Prohibited Activities",
    body:
      "You may not reverse-engineer, decompile, resell, or misuse the Services, or use them in a way that violates Ethiopian law or the rights of others.",
  },
  {
    title: "Subscription & Billing",
    body:
      "Fees are as displayed at purchase. Plans and features may be updated; continued use after changes constitutes acceptance. Refunds are provided only as required by law.",
  },
  {
    title: "Warranty Disclaimer",
    body:
      "THE SERVICES ARE PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.",
  },
  {
    title: "Limitation of Liability",
    body:
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHEGA’S TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICES WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.",
  },
  {
    title: "Changes to These Terms",
    body:
      "We may update these Terms from time to time. The latest version will be posted at /terms with an updated “Last updated” date.",
  },
  {
    title: "Contact Us",
    body:
      "Shega · Bole Road, Addis Ababa, Ethiopia · Email: ssshegas@gmail.com · Phone: 0925319901",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">Terms & Conditions</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Terms of <span className="text-gradient">Service</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                Last updated: August 2026
              </p>
            </motion.div>

            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {sections.map((s) => (
                <div
                  key={s.title}
                  className="glass rounded-2xl p-6 glass-inner-highlight"
                >
                  <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

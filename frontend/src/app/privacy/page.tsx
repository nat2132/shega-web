"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We collect information you provide directly to us, such as when you create an account, contact us, or use the Shega mobile/desktop application (the “Services”). This may include your name, business name, email address, and phone number.",
  },
  {
    title: "How We Use Your Information",
    body:
      "We use your information to operate, improve, and personalize the Services, to communicate with you, and to keep your account and devices secure. We process data only on lawful bases and in the minimum way necessary.",
  },
  {
    title: "Data We Store Locally",
    body:
      "The Shega mobile app is designed to work offline-first: your sales, inventory, contacts, and subscription records are stored locally on your device. We do not sync or transmit this data to our servers without your consent.",
  },
  {
    title: "Device & License Verification",
    body:
      "When you verify a license, only the license key, plan, and expiry are sent to our servers. No business data is uploaded during verification.",
  },
  {
    title: "Cookies & Analytics",
    body:
      "Our website may use cookies to remember your preferences and to understand how the site is used. Cookies do not identify you personally.",
  },
  {
    title: "Your Rights",
    body:
      "You may request access, correction, or deletion of the personal information we hold about you by contacting us at the details below. You may also close your account at any time from your profile settings.",
  },
  {
    title: "Contact Us",
    body:
      "Shega · Bole Road, Addis Ababa, Ethiopia · Email: ssshegas@gmail.com · Phone: 0925319901",
  },
];

export default function PrivacyPage() {
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
              <div className="pill pill-glass mb-6 inline-flex">Your Privacy</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Privacy <span className="text-gradient">Policy</span>
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

"use client";

import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10 rounded-3xl glass-strong p-12 sm:p-16 overflow-hidden text-center glass-inner-highlight"
        >
          <div className="ambient-glow ambient-glow-1" />
          <div className="ambient-glow ambient-glow-2" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Ready to Get Started?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
              Manage inventory, track sales, and streamline your operations — all from
              one platform designed for Ethiopian businesses.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="#how-it-works"
                className="btn-glass-primary gap-2 px-8 py-4 text-base group"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="btn-glass gap-2 px-8 py-4 text-base"
              >
                <Phone className="h-4 w-4" />
                Contact Us
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

const statVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 1 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden granny-gradient-1">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-glow pointer-events-none" />

      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Now Available in Ethiopia
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl"
        >
          <span className="gradient-text">Supercharge Your Business</span>
          <br />
          <span className="text-foreground">with Shega</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          The all-in-one inventory, sales, and business management platform built for
          Ethiopian businesses. From warehouse to customer, manage everything in one place.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-semibold text-background transition-all duration-300 hover:opacity-90">
            Download Free Trial
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:bg-surface">
            Watch Demo
          </button>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-16 flex items-center justify-center gap-8"
        >
          {[
            { label: "10,000+", sub: "Businesses" },
            { label: "99.9%", sub: "Uptime" },
            { label: "24/7", sub: "Support" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-8"
              variants={statVariants}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.sub}</div>
              </div>
              {i < 2 && <div className="h-8 w-px bg-border" />}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="granny-card relative mx-auto h-64 w-full max-w-4xl overflow-hidden sm:h-80 lg:h-96">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="absolute inset-0 bg-glow-card" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Shega Dashboard Preview</p>
              <p className="text-sm text-muted-foreground">Interactive demo coming soon</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

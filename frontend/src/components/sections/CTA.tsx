'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Phone } from 'lucide-react';

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 granny-gradient-2">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-30" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Ready to Transform Your Business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Join thousands of Ethiopian businesses already using Shega to streamline
            operations, manage inventory, and grow faster.
          </p>
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-foreground px-8 py-4 text-base font-semibold text-background transition-all duration-300 hover:opacity-90">
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:bg-surface">
            <Phone className="h-5 w-5 text-muted-foreground" />
            Talk to Sales
          </button>
        </motion.div>
      </div>
    </section>
  );
}

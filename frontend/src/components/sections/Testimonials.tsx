"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.3 } },
};

function Testimonials() {
  const { t } = useTranslations();
  const items = t("testimonials.items") as unknown as Array<{ name: string; role: string; location: string; quote: string }>;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  if (!items || items.length === 0) return null;
  const item = items[current];

  return (
    <section id="testimonials" className="section-light py-28 relative overflow-hidden">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("testimonials.badge") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            {t("testimonials.title") as string}
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("testimonials.subtitle") as string}
          </p>
        </motion.div>

        <div
          className="max-w-2xl mx-auto"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative min-h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="card-apple p-8 relative"
              >
                <Quote className="absolute top-6 right-6 h-8 w-8 text-[var(--accent)]/8" />
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-[var(--accent)] text-sm">★</span>
                  ))}
                </div>
                <p className="text-[15px] text-[var(--muted)] mb-6 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--surface)] border border-[var(--border-soft)] flex items-center justify-center text-[14px] font-semibold text-[var(--fg)]">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--fg)]">{item.name}</div>
                    <div className="text-[12px] text-[var(--muted)] mt-0.5">
                      {item.role} &middot; {item.location}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--meta)] transition-all"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 bg-[var(--accent)]"
                      : "w-1.5 bg-[var(--border)] hover:bg-[var(--meta)]"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--meta)] transition-all"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-[11px] text-[var(--muted)] mt-3 tracking-[0.02em]">
            {paused ? "Paused" : "Auto-rotating"}
          </p>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;

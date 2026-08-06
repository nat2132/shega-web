"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

function FAQ() {
  const { t } = useTranslations();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = (t("faq.items") as unknown as FAQItem[]) || [];

  return (
    <section id="faq" className="section-surface py-28">
      <div className="container-apple">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("faq.badge") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            {t("faq.title") as string}
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("faq.subtitle") as string}
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-2">
          {items.map((item: FAQItem, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border transition-all duration-300",
                openIndex === index
                  ? "border-[var(--accent)]/20 bg-white dark:bg-[#1d1d1f]"
                  : "border-[var(--border-soft)] bg-white dark:bg-[#1d1d1f] hover:border-[var(--border)]"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className={cn(
                  "text-[14px] font-medium pr-4",
                  openIndex === index ? "text-[var(--fg)]" : "text-[var(--fg-2)]"
                )}>
                  {item.question as string}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300",
                    openIndex === index ? "rotate-180 text-[var(--accent)]" : "text-[var(--muted)]"
                  )}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <p className="text-[14px] text-[var(--muted)] leading-relaxed">
                        {item.answer as string}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;

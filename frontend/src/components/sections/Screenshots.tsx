"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const mobileItems = [
  { title: "inventory", file: "invetory-mobile.jpg" },
  { title: "sales", file: "sales-mobile.jpg" },
  { title: "reports", file: "reports-mobile.jpg" },
  { title: "dashboard", file: "dashboard-mobile.jpg" },
  { title: "aiAssistant", file: "business-assistant-mobile.jpg" },
  { title: "purchaseOrders", file: "product-order-mobile.jpg" },
];

function Screenshots() {
  const { t } = useTranslations();
  const [mobileIndex, setMobileIndex] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const currentMobileImg = `/images/screens/${mobileItems[mobileIndex].file}`;

  const nextMobile = () => setMobileIndex((prev) => (prev + 1) % mobileItems.length);
  const prevMobile = () => setMobileIndex((prev) => (prev - 1 + mobileItems.length) % mobileItems.length);

  return (
    <>
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Screenshot"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
          />
        </div>
      )}
    <section id="screenshots" className="section-surface py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("screenshots.title") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            {t("screenshots.title") as string}
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("screenshots.subtitle") as string}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h3 className="text-lg font-semibold text-[var(--fg)] flex items-center justify-center gap-2 mb-6">
            <Smartphone className="h-5 w-5 text-[var(--accent)]" />
            {t("screenshots.mobile.title") as string}
          </h3>
        </motion.div>

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevMobile}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--meta)] transition-all"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="relative w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`mobile-${mobileIndex}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="card-elevated rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 px-5 pt-4 pb-3 border-b border-[var(--border-soft)]">
                    <span className="text-[11px] text-[var(--muted)] font-medium">
                      {t(`screenshots.mobile.${mobileItems[mobileIndex].title}`) as string}
                    </span>
                  </div>
                  <div className="h-[450px] sm:h-[520px] bg-[var(--bg)] flex items-center justify-center m-2 rounded-lg overflow-hidden cursor-zoom-in">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentMobileImg}
                      alt={t(`screenshots.mobile.${mobileItems[mobileIndex].title}`) as string}
                      className="h-full w-auto"
                      onClick={() => setLightboxSrc(currentMobileImg)}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={nextMobile}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--meta)] transition-all"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {mobileItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setMobileIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === mobileIndex ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-[var(--border)] hover:bg-[var(--meta)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

export default Screenshots;

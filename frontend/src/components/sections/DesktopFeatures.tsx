"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Monitor, Clock } from "lucide-react";
import BlurText from "@/components/reactbits/BlurText";

function DesktopFeatures() {
  const { t } = useTranslations();

  return (
    <section id="desktop-app" className="section-surface py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">
            <Monitor className="h-3.5 w-3.5 mr-1.5" />
            Desktop Application
          </div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4 flex justify-center">
            <BlurText
              text={t("features.desktop.title") as string}
              delay={50}
              animateBy="words"
              direction="top"
              stepDuration={0.25}
              threshold={0.3}
            />
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("features.desktop.subtitle") as string}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="card-elevated p-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/8 border border-[var(--accent)]/12 mx-auto mb-6">
              <Clock className="h-8 w-8 text-[var(--accent)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--fg)] mb-3">Coming Soon</h3>
            <p className="text-[var(--muted)] leading-relaxed">
              The desktop application is currently in development. Stay tuned for updates!
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <span className="w-px h-4 bg-[var(--border)]" />
              <span>Notify me when available</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default DesktopFeatures;

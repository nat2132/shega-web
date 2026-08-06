"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Apple, Bell } from "lucide-react";
import { useState } from "react";

function ComingSoon() {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");

  return (
    <section id="coming-soon" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl glass-strong p-8 sm:p-12 overflow-hidden glass-inner-highlight"
        >
          <div className="ambient-glow ambient-glow-1" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-white/[0.06] border border-white/[0.06] mb-6">
                <Apple className="h-7 w-7 text-foreground" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                {t("comingSoon.title") as string}
              </h2>
              <p className="text-lg text-muted max-w-xl leading-relaxed">
                {t("comingSoon.description") as string}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl glass-input text-foreground placeholder:text-muted/60 text-sm"
                />
                <button className="btn-glass-primary gap-2 px-6 py-3 text-sm shrink-0">
                  <Bell className="h-4 w-4" />
                  {t("comingSoon.notifyMe") as string}
                </button>
              </div>
            </div>

            <div className="shrink-0">
              <div className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl glass glass-inner-highlight">
                <Apple className="h-14 w-14 text-foreground" />
                <div className="text-center">
                  <div className="text-xs text-muted tracking-wider uppercase">Download on the</div>
                  <div className="text-base font-semibold text-foreground tracking-tight">App Store</div>
                </div>
                <div className="text-xs text-muted bg-white/[0.06] px-3 py-1.5 rounded-lg tracking-wide">
                  {t("comingSoon.badge") as string}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ComingSoon;

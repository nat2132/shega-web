"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Download, Building2, Sparkles, CreditCard } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";

const icons = [Download, Building2, Sparkles, CreditCard];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function HowItWorks() {
  const { t } = useTranslations();
  const steps = t("howItWorks.steps") as unknown as Array<{ step: string; title: string; desc: string }>;

  return (
    <section id="how-it-works" className="section-surface py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("howItWorks.badge") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4 flex justify-center">
            <BlurText
              text={t("howItWorks.title") as string}
              delay={50}
              animateBy="words"
              direction="top"
              stepDuration={0.25}
              threshold={0.3}
            />
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("howItWorks.subtitle") as string}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {steps.map((step, index) => {
            const Icon = icons[index] || Download;
            return (
              <motion.div
                key={step.step}
                variants={cardVariants}
                className="relative group"
              >
                <div className="card-apple p-6 text-center transition-all duration-300 group-hover:border-[var(--accent)]/20 group-hover:shadow-[0_8px_32px_-8px_rgba(0,113,227,0.08)] h-full">
                  <div className="flex items-center justify-center mb-4">
                    <motion.div
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/8 border border-[var(--accent)]/12"
                      whileHover={{ scale: 1.1, borderColor: "var(--accent)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <Icon className="h-5 w-5 text-[var(--accent)]" />
                    </motion.div>
                  </div>
                  <motion.div
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-semibold mb-3"
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {step.step}
                  </motion.div>
                  <h3 className="text-[15px] font-semibold text-[var(--fg)] mb-2 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden md:block absolute top-12 -right-3 w-6 h-px bg-gradient-to-r from-[var(--border)] to-transparent"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.12 }}
                    style={{ transformOrigin: "left" }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link
            href="#how-it-works"
            className="btn-primary btn-large gap-2 inline-flex group relative overflow-hidden"
          >
            <span className="relative z-10">{t("nav.startFreeTrial") as string}</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default HowItWorks;

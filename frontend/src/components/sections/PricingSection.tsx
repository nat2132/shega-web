"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Check, Smartphone, Star } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PlanType = {
  name: string;
  description: string;
  monthlyPrice: string;
  quarterlyPrice: string;
  period: string;
  monthLabel: string;
  quarterLabel: string;
  features: string[];
  cta: string;
  popular?: string;
  recommended?: string;
};

function PricingCard({ plan, index, isQuarterly }: { plan: PlanType; index: number; isQuarterly: boolean }) {
  const isPopular = !!plan.popular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      whileHover={{ y: -6 }}
      className={cn(
        "relative rounded-2xl p-6 transition-all duration-300 group cursor-default flex flex-col",
        isPopular
          ? "bg-white dark:bg-[#262629] border-2 border-[#f59e0b] shadow-[0_8px_32px_-8px_rgba(245,158,11,0.15)]"
          : "bg-white dark:bg-[#262629] border border-[var(--border)] hover:border-[var(--meta)]"
      )}
    >
      {isPopular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        >
          <span className="bg-[#f59e0b] text-white text-[11px] font-semibold px-3 py-1 rounded-full tracking-[0.02em] inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-white" />
            {plan.popular}
          </span>
          {plan.recommended && (
            <span className="bg-[var(--accent)] text-white text-[11px] font-semibold px-3 py-1 rounded-full tracking-[0.02em]">
              {plan.recommended}
            </span>
          )}
        </motion.div>
      )}

      <div className="text-center pt-2">
        <h3 className="text-lg font-semibold text-[var(--fg)] mb-1 tracking-tight">
          {plan.name}
        </h3>
        <p className="text-[13px] text-[var(--muted)] leading-relaxed min-h-[2.5rem]">
          {plan.description}
        </p>
      </div>

      <div className="mb-5 text-center mt-4">
        <div className="text-[11px] text-[var(--muted)] font-medium mb-1">
          {isQuarterly ? plan.quarterLabel : plan.monthLabel}
        </div>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-[15px] text-[var(--muted)] font-medium">{plan.period}</span>
          <span className="text-3xl font-bold text-[var(--fg)] tracking-tight">
            {isQuarterly ? plan.quarterlyPrice : plan.monthlyPrice}
          </span>
        </div>
        {isPopular && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#f59e0b]"
          >
            <Star className="h-3 w-3 fill-[#f59e0b]" />
            Best Value — Most Popular Plan
          </motion.div>
        )}
      </div>

      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.features.map((feature: string, idx: number) => (
          <motion.li
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.03 }}
            className="flex items-start gap-2"
          >
            <Check className="h-4 w-4 text-[var(--accent)] mt-0.5 shrink-0" />
            <span className={cn(
              "text-[13px] leading-relaxed",
              feature.startsWith("Everything") ? "text-[var(--fg-2)] font-medium" : "text-[var(--muted)]"
            )}>
              {feature}
            </span>
          </motion.li>
        ))}
      </ul>

      <Link
        href="#how-it-works"
        className={cn(
          "w-full inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
          isPopular ? "btn-primary" : "btn-secondary"
        )}
      >
        {plan.cta}
      </Link>
    </motion.div>
  );
}

function PricingSection() {
  const { t } = useTranslations();
  const [isQuarterly, setIsQuarterly] = useState(false);

  const mobileBasic = t("pricing.mobile.basic") as unknown as PlanType;
  const mobilePremium = t("pricing.mobile.premium") as unknown as PlanType;

  return (
    <section id="pricing" className="section-light py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">Simple Pricing</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            Plans That Grow With Your Business
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed mb-8">
            Choose the plan that fits your business. Upgrade anytime.
          </p>

          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] p-0.5">
            <motion.button
              onClick={() => setIsQuarterly(false)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 relative",
                !isQuarterly ? "text-white" : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {!isQuarterly && (
                <motion.span
                  layoutId="pricingToggleBg"
                  className="absolute inset-0 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">1 Month</span>
            </motion.button>
            <motion.button
              onClick={() => setIsQuarterly(true)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 relative",
                isQuarterly ? "text-white" : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {isQuarterly && (
                <motion.span
                  layoutId="pricingToggleBg"
                  className="absolute inset-0 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">3 Months</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="mb-20">
          <div className="flex items-center gap-3 justify-center mb-8">
            <Smartphone className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--fg)]">{t("pricing.mobile.title") as string}</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <PricingCard plan={mobileBasic} index={0} isQuarterly={isQuarterly} />
            <PricingCard plan={mobilePremium} index={1} isQuarterly={isQuarterly} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;

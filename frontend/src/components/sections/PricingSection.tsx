"use client";

import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Check, Monitor, Smartphone, Star, TabletSmartphone } from "lucide-react";
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
  includes?: string;
  features: string[];
  cta: string;
  popular?: string;
  recommended?: string;
};

function PricingCard({
  plan,
  index,
  isQuarterly,
  icon: Icon,
}: {
  plan: PlanType;
  index: number;
  isQuarterly: boolean;
  icon?: ComponentType<{ className?: string }>;
}) {
  const { t } = useTranslations();
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
        {Icon && (
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <Icon className="h-5 w-5 text-[var(--accent)]" />
          </div>
        )}
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
        {plan.includes && (
          <div className="mt-2 text-[11px] font-medium text-[var(--muted)]">{plan.includes}</div>
        )}
        {isPopular && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#f59e0b]"
          >
            <Star className="h-3 w-3 fill-[#f59e0b]" />
            {t("pricing.bestValue") as string}
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

const PLAN_KEYS = ["mobile", "desktop", "both"] as const;
const PLAN_ICONS = {
  mobile: Smartphone,
  desktop: Monitor,
  both: TabletSmartphone,
} as const;

function PricingSection() {
  const { t } = useTranslations();
  const [isQuarterly, setIsQuarterly] = useState(false);

  const plans = PLAN_KEYS.map((key) => ({
    key,
    plan: t(`pricing.plans.${key}`) as unknown as PlanType,
  })).filter((entry) => entry.plan && typeof entry.plan === "object");

  return (
    <section id="pricing" className="section-light py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("pricing.badge") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            {t("pricing.heading") as string}
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed mb-8">
            {t("pricing.lead") as string}
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
              <span className="relative z-10">{t("pricing.toggle.monthly") as string}</span>
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
              <span className="relative z-10">{t("pricing.toggle.threeMonths") as string}</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="mb-20">
          <div className="flex items-center gap-3 justify-center mb-3">
            <TabletSmartphone className="h-5 w-5 text-[var(--accent)]" />
            <h3 className="text-lg font-semibold text-[var(--fg)]">{t("pricing.plans.title") as string}</h3>
          </div>
          <p className="text-center text-[15px] text-[var(--muted)] max-w-xl mx-auto mb-8">
            {t("pricing.plans.subtitle") as string}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(({ key, plan }, index) => (
              <PricingCard
                key={key}
                plan={plan}
                icon={PLAN_ICONS[key]}
                index={index}
                isQuarterly={isQuarterly}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;

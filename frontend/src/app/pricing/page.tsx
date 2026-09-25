"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Check, ChevronDown, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

type PublicPlan = {
  id: number;
  name: string;
  display_name?: string | null;
  edition?: string | null;
  duration_months?: number | null;
  device_limit?: number | null;
  price?: number | null;
  included_mobile_devices?: number | null;
  included_desktop_devices?: number | null;
  included_businesses?: number | null;
  addon_mobile_price?: number | null;
  addon_desktop_price?: number | null;
  addon_business_price?: number | null;
  is_active?: boolean;
};

const faqs = [
  {
    question: "What is Shega?",
    answer: "Shega is an all-in-one ERP and POS platform designed specifically for Ethiopian businesses. It covers inventory management, sales, expenses, debt tracking, employee management, and analytics — all in one integrated system.",
  },
  {
    question: "How does licensing work?",
    answer: "Each plan includes a set number of mobile devices, desktop devices, and businesses, plus the duration shown on your plan. You can add more devices or businesses whenever you need them with flexible add-ons.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept Telebirr, bank transfers, and international payments via credit/debit cards. For larger plans, we also offer customized payment schedules.",
  },
  {
    question: "Is there a free trial?",
    answer: "Absolutely. You can start a 14-day free trial with full access to all features. No credit card required. If you decide not to continue, your data will be exported and deleted per your request.",
  },
  {
    question: "Can I switch plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you pay the prorated difference. When downgrading, the change takes effect at the start of your next billing period.",
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

function num(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function fmtPts(value?: number | null): string {
  return num(value).toLocaleString("en-US");
}

function planFeatures(plan: PublicPlan): string[] {
  const lines: string[] = [];
  const mobile = num(plan.included_mobile_devices);
  const desktop = num(plan.included_desktop_devices);
  const businesses = num(plan.included_businesses);
  if (mobile > 0) lines.push(`${fmtPts(mobile)} mobile device${mobile === 1 ? "" : "s"} included`);
  if (desktop > 0) lines.push(`${fmtPts(desktop)} desktop device${desktop === 1 ? "" : "s"} included`);
  if (businesses > 0) lines.push(`${fmtPts(businesses)} business${businesses === 1 ? "" : "es"} included`);
  return lines;
}

function planAddons(plan: PublicPlan): { label: string; price: number }[] {
  const addons: { label: string; price: number }[] = [];
  const mobile = num(plan.addon_mobile_price);
  const desktop = num(plan.addon_desktop_price);
  const business = num(plan.addon_business_price);
  if (mobile > 0) addons.push({ label: "Extra mobile device", price: mobile });
  if (desktop > 0) addons.push({ label: "Extra desktop device", price: desktop });
  if (business > 0) addons.push({ label: "Extra business", price: business });
  return addons;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/plans`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const list: PublicPlan[] = Array.isArray(data) ? data : (data.results ?? []);
      setPlans(list.filter((p) => p.is_active !== false));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const popularId =
    plans.length > 0
      ? plans.reduce((best, plan) =>
          num(plan.price) > num(best.price) ? plan : best
        ).id
      : null;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-12 max-w-2xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">No hidden fees</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Simple, Transparent{" "}
                <span className="text-gradient">Pricing</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted max-w-xl mx-auto">
                Choose the plan that fits your business. No hidden fees, no surprises.
              </p>
            </motion.div>

            <div className="mb-12 flex items-center justify-center">
              <span className="rounded-full bg-white/[0.06] border border-white/[0.06] px-3 py-1 text-xs font-medium text-muted">
                All prices in Ethiopian Birr (ETB) · Billed monthly
              </span>
            </div>

            {loading ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative rounded-2xl p-8 glass glass-inner-highlight animate-pulse"
                    )}
                  >
                    <div className="mb-6 pt-2">
                      <div className="h-5 w-24 rounded-md bg-white/5" />
                      <div className="mt-4 h-10 w-40 rounded-md bg-white/5" />
                      <div className="mt-3 h-4 w-28 rounded-md bg-white/5" />
                    </div>
                    <div className="mb-8 h-11 w-full rounded-xl bg-white/5" />
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="h-4 w-full rounded-md bg-white/5" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="mx-auto max-w-md">
                <div className="glass rounded-2xl p-10 text-center glass-inner-highlight">
                  <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-foreground/40" />
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    Couldn&apos;t load pricing
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    We couldn&apos;t fetch the latest plans. Please check your connection and try again.
                  </p>
                  <button
                    onClick={load}
                    className="btn-glass-primary mt-6 inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </button>
                </div>
              </div>
            ) : plans.length === 0 ? (
              <div className="mx-auto max-w-md">
                <div className="glass rounded-2xl p-10 text-center glass-inner-highlight">
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    No plans available
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Plans aren&apos;t available right now. Please check back soon.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                className="grid gap-6 lg:grid-cols-3"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
              >
                {plans.map((plan, i) => {
                  const popular = plan.id === popularId;
                  const features = planFeatures(plan);
                  const addons = planAddons(plan);
                  const months = num(plan.duration_months);
                  const deviceLimit = num(plan.device_limit);
                  return (
                    <motion.div
                      key={plan.id}
                      variants={cardVariants}
                      custom={i}
                      className={cn(
                        "relative rounded-2xl p-8 transition-all duration-300 glass-inner-highlight",
                        popular
                          ? "glass-strong shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)]"
                          : "glass hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]"
                      )}
                    >
                      {popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-bg tracking-wider uppercase">
                          Most Popular
                        </div>
                      )}

                      <div className="mb-6 pt-2">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">
                          {plan.name}
                        </h3>
                        {plan.edition && (
                          <p className="mt-1 text-xs font-medium text-muted uppercase tracking-wider">
                            {plan.edition}
                          </p>
                        )}
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-foreground tracking-tight">
                            {fmtPts(plan.price)} ETB
                          </span>
                          <span className="text-sm text-muted">/month</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {months > 0 && `${months}-month license`}
                          {months > 0 && deviceLimit > 0 && " · "}
                          {deviceLimit > 0 && `Up to ${fmtPts(deviceLimit)} device${deviceLimit === 1 ? "" : "s"}`}
                        </p>
                      </div>

                      <Link
                        href="/auth/register"
                        className={cn(
                          "mb-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                          popular ? "btn-glass-primary" : "btn-glass"
                        )}
                      >
                        Get Started
                        <ArrowRight className="h-4 w-4" />
                      </Link>

                      {features.length > 0 && (
                        <ul className="space-y-3">
                          {features.map((f) => (
                            <li key={f} className="flex items-start gap-3 text-sm text-muted">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}

                      {addons.length > 0 && (
                        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="mb-2.5 text-xs font-medium text-muted tracking-wider uppercase">
                            Add-ons
                          </p>
                          <ul className="space-y-1.5">
                            {addons.map((addon) => (
                              <li
                                key={addon.label}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="text-muted">{addon.label}</span>
                                <span className="font-medium text-foreground/70">
                                  +{addon.price.toLocaleString("en-US")} ETB/month
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-3" />
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-12 max-w-2xl text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">Got questions?</div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Everything you need to know about pricing and plans.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-3"
            >
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl transition-all duration-300",
                    openIndex === i ? "glass-strong" : "glass"
                  )}
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted transition-transform duration-300",
                        openIndex === i ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === i && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
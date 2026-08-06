"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Check, ChevronDown, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 39,
    period: "3 months",
    devices: "1 device",
    savings: "Save 20%",
    popular: false,
    features: [
      "Inventory management",
      "Point of sale",
      "Expense tracking",
      "Basic reports",
      "Email support",
      "1 warehouse",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Business",
    monthlyPrice: 89,
    yearlyPrice: 69,
    period: "6 months",
    devices: "3 devices",
    savings: "Save 22%",
    popular: true,
    features: [
      "Everything in Starter",
      "Debt management",
      "Supplier management",
      "Multi-warehouse",
      "Employee management",
      "Priority email & chat",
      "Advanced reports",
      "API access",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    monthlyPrice: 149,
    yearlyPrice: 119,
    period: "12 months",
    devices: "Unlimited",
    savings: "Save 20%",
    popular: false,
    features: [
      "Everything in Business",
      "Unlimited devices",
      "Dedicated account manager",
      "On-site training",
      "Custom integrations",
      "SLA guarantee",
      "Phone & priority support",
      "Data migration assistance",
    ],
    cta: "Contact Sales",
  },
];

const featuresCompare = [
  { name: "Inventory Management", starter: true, business: true, enterprise: true },
  { name: "Point of Sale", starter: true, business: true, enterprise: true },
  { name: "Expense Tracking", starter: true, business: true, enterprise: true },
  { name: "Basic Reports", starter: true, business: true, enterprise: true },
  { name: "Email Support", starter: true, business: true, enterprise: true },
  { name: "Debt Management", starter: false, business: true, enterprise: true },
  { name: "Supplier Management", starter: false, business: true, enterprise: true },
  { name: "Multi-Warehouse", starter: false, business: true, enterprise: true },
  { name: "Employee Management", starter: false, business: true, enterprise: true },
  { name: "Advanced Reports", starter: false, business: true, enterprise: true },
  { name: "API Access", starter: false, business: true, enterprise: true },
  { name: "Unlimited Devices", starter: false, business: false, enterprise: true },
  { name: "Dedicated Manager", starter: false, business: false, enterprise: true },
  { name: "On-site Training", starter: false, business: false, enterprise: true },
  { name: "Custom Integrations", starter: false, business: false, enterprise: true },
  { name: "SLA Guarantee", starter: false, business: false, enterprise: true },
  { name: "Phone Support", starter: false, business: false, enterprise: true },
  { name: "Data Migration", starter: false, business: false, enterprise: true },
];

const faqs = [
  {
    question: "What is Shega?",
    answer: "Shega is an all-in-one ERP and POS platform designed specifically for Ethiopian businesses. It covers inventory management, sales, expenses, debt tracking, employee management, and analytics — all in one integrated system.",
  },
  {
    question: "How does licensing work?",
    answer: "Shega offers flexible licensing based on your plan. Starter covers 1 device for 3 months, Business covers 3 devices for 6 months, and Enterprise offers unlimited devices for 12 months. All plans include free updates during the license period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept Telebirr, bank transfers, and international payments via credit/debit cards. For Enterprise plans, we also offer customized payment schedules.",
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

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

            <div className="mb-12 flex items-center justify-center gap-4">
              <span className={cn("text-sm font-medium transition-colors", !yearly ? "text-foreground" : "text-muted")}>
                Monthly
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                  yearly ? "bg-foreground/60" : "bg-foreground/15"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white transition-transform",
                    yearly ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
              <span className={cn("text-sm font-medium transition-colors", yearly ? "text-foreground" : "text-muted")}>
                Yearly
              </span>
              {yearly && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-foreground border border-white/[0.06]"
                >
                  Save ~20%
                </motion.span>
              )}
            </div>

            <motion.div
              className="grid gap-6 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={cardVariants}
                  custom={i}
                  className={cn(
                    "relative rounded-2xl p-8 transition-all duration-300 glass-inner-highlight",
                    plan.popular
                      ? "glass-strong shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)]"
                      : "glass hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-bg tracking-wider uppercase">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6 pt-2">
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground tracking-tight">
                        ETB {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-sm text-muted">
                        /{plan.period.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{plan.devices}</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {yearly && (
                      <motion.p
                        key="savings"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-6 text-sm font-medium text-foreground/60"
                      >
                        {plan.savings} with yearly billing
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Link
                    href="#how-it-works"
                    className={cn(
                      "mb-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                      plan.popular ? "btn-glass-primary" : "btn-glass"
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-20"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h3 className="mb-8 text-center text-lg font-semibold text-foreground tracking-tight">
                Compare Features
              </h3>
              <div className="overflow-x-auto rounded-2xl glass glass-inner-highlight">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th className="px-4 py-3.5 text-left text-sm font-medium text-muted">Feature</th>
                      <th className="px-4 py-3.5 text-center text-sm font-medium text-muted">Starter</th>
                      <th className="px-4 py-3.5 text-center text-sm font-medium text-foreground">Business</th>
                      <th className="px-4 py-3.5 text-center text-sm font-medium text-muted">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuresCompare.map((f) => (
                      <tr
                        key={f.name}
                        className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3 text-sm text-muted">{f.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Check className={cn("mx-auto h-4 w-4", f.starter ? "text-foreground/40" : "text-muted/20")} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Check className={cn("mx-auto h-4 w-4", f.business ? "text-foreground/40" : "text-muted/20")} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Check className={cn("mx-auto h-4 w-4", f.enterprise ? "text-foreground/40" : "text-muted/20")} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Check, X, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

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
    missing: [
      "Multi-warehouse",
      "Employee management",
      "Advanced analytics",
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
    missing: [],
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
    missing: [],
    cta: "Contact Sales",
  },
];

const featuresCompare = [
  { name: "Inventory Management", starter: true, business: true, enterprise: true },
  { name: "Point of Sale", starter: true, business: true, enterprise: true },
  { name: "Expense Tracking", starter: true, business: true, enterprise: true },
  { name: "Basic Reports", starter: true, business: true, enterprise: true },
  { name: "Email Support", starter: true, business: true, enterprise: true },
  { name: "1 Warehouse", starter: true, business: true, enterprise: true },
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
    answer:
      "Shega is an all-in-one ERP and POS platform designed specifically for Ethiopian businesses. It covers inventory management, sales, expenses, debt tracking, employee management, and analytics — all in one integrated system.",
  },
  {
    question: "How does licensing work?",
    answer:
      "Shega offers flexible licensing based on your plan. Starter covers 1 device for 3 months, Business covers 3 devices for 6 months, and Enterprise offers unlimited devices for 12 months. All plans include free updates during the license period.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept Telebirr, bank transfers, and international payments via credit/debit cards. For Enterprise plans, we also offer customized payment schedules.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Absolutely. You can start a 14-day free trial with full access to all features. No credit card required. If you decide not to continue, your data will be exported and deleted per your request.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you pay the prorated difference. When downgrading, the change takes effect at the start of your next billing period.",
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-[var(--foreground)]"
      >
        <span className="text-sm font-medium text-zinc-300">{faq.question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-zinc-500">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 bg-glow pointer-events-none" />
          <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-12 max-w-2xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Simple, Transparent{" "}
                <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Pricing
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                Choose the plan that fits your business. No hidden fees, no
                surprises.
              </p>
            </motion.div>

            <div className="mb-12 flex items-center justify-center gap-4">
              <span
                className={`text-sm font-medium ${
                  !yearly ? "text-[var(--foreground)]" : "text-zinc-500"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() => setYearly(!yearly)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  yearly ? "bg-indigo-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    yearly ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  yearly ? "text-[var(--foreground)]" : "text-zinc-500"
                }`}
              >
                Yearly
              </span>
              {yearly && (
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  Save ~20%
                </span>
              )}
            </div>

            <motion.div
              className="grid gap-8 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  variants={cardVariants}
                  custom={i}
                  className={`relative rounded-2xl p-8 transition-all duration-300 ${
                    plan.popular
                      ? "gradient-border bg-zinc-900/80 shadow-[0_0_30px_-5px_rgba(99,102,241,0.2)]"
                      : "glass"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--foreground)]">
                        ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-sm text-zinc-500">
                        /{plan.period.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{plan.devices}</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {yearly && (
                      <motion.p
                        key="savings"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-6 text-sm font-medium text-green-400"
                      >
                        {plan.savings} with yearly billing
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    className={`mb-8 w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 ${
                      plan.popular
                        ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
                        : "glass text-[var(--foreground)] hover:bg-[var(--color-surface-hover)]"
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-sm text-zinc-300"
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-sm text-zinc-600"
                      >
                        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-600" />
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
              <h3 className="mb-8 text-center text-lg font-semibold text-[var(--foreground)]">
                Compare Features
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                        Feature
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">
                        Starter
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">
                        Business
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-indigo-400">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuresCompare.map((f) => (
                      <tr
                        key={f.name}
                        className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface)]"
                      >
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {f.name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {f.starter ? (
                            <Check className="mx-auto h-4 w-4 text-green-400" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-zinc-600" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {f.business ? (
                            <Check className="mx-auto h-4 w-4 text-green-400" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-zinc-600" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {f.enterprise ? (
                            <Check className="mx-auto h-4 w-4 text-green-400" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-zinc-600" />
                          )}
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
          <div className="absolute inset-0 bg-glow pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-12 max-w-2xl text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                Everything you need to know about pricing and plans.
              </p>
            </motion.div>

            <motion.div
              className="glass rounded-2xl px-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  faq={faq}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

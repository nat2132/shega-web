'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    totalPrice: 1999,
    months: 3,
    devices: '1 device',
    popular: false,
    features: [
      'Inventory management',
      'Point of sale',
      'Expense tracking',
      'Basic reports',
      'Email support',
      '1 warehouse',
    ],
  },
  {
    name: 'Business',
    totalPrice: 3499,
    months: 6,
    devices: '3 devices',
    popular: true,
    features: [
      'Everything in Starter',
      'Debt management',
      'Supplier management',
      'Multi-warehouse',
      'Employee management',
      'Priority support',
      'Advanced reports',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    totalPrice: 5999,
    months: 12,
    devices: 'Unlimited devices',
    popular: false,
    features: [
      'Everything in Business',
      'Unlimited devices',
      'Dedicated account manager',
      'On-site training',
      'Custom integrations',
      'Phone & priority support',
      'Data migration assistance',
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

function formatPrice(price: number) {
  return price.toLocaleString('en-ET');
}

export default function PricingSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-glow pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Choose the plan that fits your business. No hidden fees, no surprises.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-8 lg:grid-cols-3 items-stretch"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              custom={i}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'granny-card ring-1 ring-foreground/10 shadow-lg'
                  : 'granny-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-background">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {formatPrice(plan.totalPrice)} ETB
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.devices}</p>
                <p className="text-xs text-muted-foreground/70">
                  {formatPrice(Math.round(plan.totalPrice / plan.months))} ETB/mo
                </p>
              </div>

              <button className="mb-8 w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90">
                Get Started
              </button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-foreground" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

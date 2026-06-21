'use client';

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  CreditCard,
  Receipt,
  Truck,
  Warehouse,
  Users,
  BarChart3,
  Bell,
} from 'lucide-react';

const features = [
  { icon: Package, title: 'Inventory Management', description: 'Real-time stock tracking' },
  { icon: ShoppingCart, title: 'Sales Management', description: 'POS & invoicing' },
  { icon: CreditCard, title: 'Debt Management', description: 'Customer credit tracking' },
  { icon: Receipt, title: 'Expense Tracking', description: 'Categorize & track' },
  { icon: Truck, title: 'Supplier Management', description: 'Supplier database' },
  { icon: Warehouse, title: 'Warehouse Management', description: 'Multi-warehouse' },
  { icon: Users, title: 'Employee Management', description: 'Roles & permissions' },
  { icon: BarChart3, title: 'Analytics', description: 'Real-time insights' },
  { icon: Bell, title: 'Notifications', description: 'Smart alerts' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function FeatureCard({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div variants={cardVariants} className="granny-card group cursor-default rounded-xl p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-surface-hover">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{feature.title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-glow pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-16 max-w-2xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="gradient-text text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Run Your Business
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Powerful features designed for Ethiopian wholesalers, retailers, and distributors.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

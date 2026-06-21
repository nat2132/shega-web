"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
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
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FeatureCard } from "@/components/ui/Card";

const featureCategories = [
  {
    title: "Inventory Management",
    icon: Package,
    features: [
      "Real-time stock tracking",
      "Barcode scanning",
      "Low stock alerts",
      "Multi-warehouse support",
    ],
  },
  {
    title: "Sales Management",
    icon: ShoppingCart,
    features: [
      "POS system",
      "Invoice generation",
      "Sales reports",
      "Returns management",
    ],
  },
  {
    title: "Debt Management",
    icon: CreditCard,
    features: [
      "Customer credit tracking",
      "Payment reminders",
      "Debt aging reports",
    ],
  },
  {
    title: "Expense Tracking",
    icon: Receipt,
    features: [
      "Categorize expenses",
      "Attach receipts",
      "Recurring expenses",
    ],
  },
  {
    title: "Supplier Management",
    icon: Truck,
    features: [
      "Supplier database",
      "Purchase orders",
      "Price history",
    ],
  },
  {
    title: "Warehouse Management",
    icon: Warehouse,
    features: [
      "Bin locations",
      "Transfer stock",
      "Inventory counts",
    ],
  },
  {
    title: "Employee Management",
    icon: Users,
    features: [
      "Roles & permissions",
      "Time tracking",
      "Commission calculation",
    ],
  },
  {
    title: "Analytics & Reports",
    icon: BarChart3,
    features: [
      "Real-time dashboard",
      "Custom reports",
      "Export PDF/Excel",
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    features: [
      "Email alerts",
      "SMS notifications",
      "Push notifications",
    ],
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function FeaturesPage() {
  const categories = useMemo(() => featureCategories, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 bg-glow pointer-events-none" />
          <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
                Powerful Features for{" "}
                <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Your Business
                </span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                Everything you need to manage inventory, sales, expenses, and
                more — all in one platform designed for Ethiopian businesses.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              {categories.map((category) => (
                <motion.div key={category.title} variants={itemVariants}>
                  <FeatureCard
                    icon={category.icon}
                    title={category.title}
                    description={category.features.join(" ● ")}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

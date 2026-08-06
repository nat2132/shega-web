"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Package, ShoppingCart, CreditCard, Receipt, Truck,
  Warehouse, Users, BarChart3, Bell, ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FeatureCard } from "@/components/ui/Card";
import Link from "next/link";

const featureCategories = [
  { title: "Inventory Management", icon: Package, features: ["Real-time stock tracking", "Barcode scanning", "Low stock alerts", "Multi-warehouse support"] },
  { title: "Sales Management", icon: ShoppingCart, features: ["POS system", "Invoice generation", "Sales reports", "Returns management"] },
  { title: "Debt Management", icon: CreditCard, features: ["Customer credit tracking", "Payment reminders", "Debt aging reports"] },
  { title: "Expense Tracking", icon: Receipt, features: ["Categorize expenses", "Attach receipts", "Recurring expenses"] },
  { title: "Supplier Management", icon: Truck, features: ["Supplier database", "Purchase orders", "Price history"] },
  { title: "Warehouse Management", icon: Warehouse, features: ["Bin locations", "Transfer stock", "Inventory counts"] },
  { title: "Employee Management", icon: Users, features: ["Roles & permissions", "Time tracking", "Commission calculation"] },
  { title: "Analytics & Reports", icon: BarChart3, features: ["Real-time dashboard", "Custom reports", "Export PDF/Excel"] },
  { title: "Notifications", icon: Bell, features: ["Email alerts", "SMS notifications", "Push notifications"] },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function FeaturesPage() {
  const categories = useMemo(() => featureCategories, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">Tools to grow your business</div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                Powerful Features for <span className="text-gradient">Your Business</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted max-w-2xl mx-auto">
                 Manage inventory, sales, expenses, and more —
                 all in one platform designed for Ethiopian businesses.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                    description={category.features.join(" \u25cf ")}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Link href="#how-it-works" className="btn-glass-primary gap-2 px-8 py-4 text-base inline-flex group">
                Get Started <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

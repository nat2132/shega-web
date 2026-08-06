"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Package, ShoppingCart, Contact, RotateCcw, BarChart3,
  Wallet, PieChart, Handshake, ClipboardList, Truck,
  Warehouse, Bot, HeartPulse, Palette, Fingerprint, Bell
} from "lucide-react";
import BlurText from "@/components/reactbits/BlurText";
import { Smartphone } from "lucide-react";

const features = [
  { icon: Package, key: "features.mobile.items.inventoryManagement" },
  { icon: ShoppingCart, key: "features.mobile.items.sales" },
  { icon: Contact, key: "features.mobile.items.contacts" },
  { icon: RotateCcw, key: "features.mobile.items.stockAdjustments" },
  { icon: BarChart3, key: "features.mobile.items.reports" },
  { icon: Wallet, key: "features.mobile.items.expenses" },
  { icon: PieChart, key: "features.mobile.items.budgets" },
  { icon: Handshake, key: "features.mobile.items.debtManagement" },
  { icon: ClipboardList, key: "features.mobile.items.customerOrders" },
  { icon: Truck, key: "features.mobile.items.purchaseOrders" },
  { icon: Warehouse, key: "features.mobile.items.multiWarehouse" },
  { icon: Bot, key: "features.mobile.items.aiAssistant" },
  { icon: HeartPulse, key: "features.mobile.items.businessHealthScore" },
  { icon: Palette, key: "features.mobile.items.themes" },
  { icon: Fingerprint, key: "features.mobile.items.biometrics" },
  { icon: Bell, key: "features.mobile.items.supplierCreditReminders" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function MobileFeatures() {
  const { t } = useTranslations();

  return (
    <section id="mobile-app" className="section-light py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">
            <Smartphone className="h-3.5 w-3.5 mr-1.5" />
            Mobile App
          </div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4 flex justify-center">
            <BlurText
              text={t("features.mobile.title") as string}
              delay={50}
              animateBy="words"
              direction="top"
              stepDuration={0.25}
              threshold={0.3}
            />
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("features.mobile.subtitle") as string}
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.key}
              variants={itemVariants}
              className="card-apple p-4 flex items-center gap-3 transition-all duration-300 group hover:border-[var(--accent)]/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/8 border border-[var(--accent)]/12 group-hover:bg-[var(--accent)]/12 transition-colors">
                <feature.icon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--fg)]">
                {t(feature.key) as string}
              </h3>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="card-elevated max-w-md mx-auto p-6 inline-flex flex-col items-center gap-3">
            <Smartphone className="h-8 w-8 text-[var(--accent)]" />
            <div>
              <p className="text-[14px] font-medium text-[var(--fg)]">Available for Android</p>
              <p className="text-[12px] text-[var(--muted)] mt-1">Download the app</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default MobileFeatures;

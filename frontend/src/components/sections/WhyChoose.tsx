"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Clock, Workflow, BarChart2, Package, TrendingUp, Wallet, Users, FileText, Brain, WifiOff } from "lucide-react";

const benefits = [
  { icon: Clock, key: "whyChoose.items.saveTime" },
  { icon: Workflow, key: "whyChoose.items.reduceWork" },
  { icon: BarChart2, key: "whyChoose.items.trackSales" },
  { icon: Package, key: "whyChoose.items.manageInventory" },
  { icon: TrendingUp, key: "whyChoose.items.monitorPerformance" },
  { icon: Wallet, key: "whyChoose.items.controlExpenses" },
  { icon: Users, key: "whyChoose.items.manageDebts" },
  { icon: FileText, key: "whyChoose.items.generateReports" },
  { icon: Brain, key: "whyChoose.items.betterDecisions" },
  { icon: WifiOff, key: "whyChoose.items.workOffline" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function WhyChoose() {
  const { t } = useTranslations();

  return (
    <section id="support" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="pill pill-glass mb-6 inline-flex">{t("whyChoose.badge") as string}</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            {t("whyChoose.title") as string}
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            {t("whyChoose.subtitle") as string}
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.key}
              variants={itemVariants}
              className="glass-hoverable rounded-xl p-5 glass-inner-highlight"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] mb-3">
                <benefit.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1 tracking-tight">
                {t(benefit.key) as string}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {t(`${benefit.key}Desc`) as string}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default WhyChoose;

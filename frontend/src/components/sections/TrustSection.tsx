"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Shield, Lock, Languages, Calendar, Zap, RefreshCw } from "lucide-react";

const trustItems = [
  { icon: Shield, key: "offlineFirst" },
  { icon: Lock, key: "localStorage" },
  { icon: Languages, key: "multiLanguage" },
  { icon: Calendar, key: "ethiopianCalendar" },
  { icon: Zap, key: "fastPerformance" },
  { icon: RefreshCw, key: "backupRestore" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

function TrustSection() {
  const { t } = useTranslations();

  return (
    <section id="trust" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="pill pill-glass mb-6 inline-flex">{t("trust.badge") as string}</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {t("trust.title") as string}
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {trustItems.map((item) => (
            <motion.div
              key={item.key}
              variants={itemVariants}
              className="glass-hoverable rounded-2xl p-6 glass-inner-highlight"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06] mb-4 transition-all duration-300 group-hover:bg-white/[0.1]">
                <item.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2 tracking-tight">
                {t(`trust.${item.key}`) as string}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {t(`trust.${item.key}Desc`) as string}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default TrustSection;

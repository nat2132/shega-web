"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { CreditCard, FileText, ShieldCheck, CheckCircle2, ArrowRight, SmartphoneIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import BlurText from "@/components/reactbits/BlurText";

const icons = [CreditCard, SmartphoneIcon, FileText, ShieldCheck, CheckCircle2];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function PaymentSection() {
  const { t } = useTranslations();
  const steps = t("payment.steps") as unknown as Array<{ step: string; title: string; desc: string }>;

  return (
    <section id="contact" className="section-light py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            {t("payment.badge") as string}
          </div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4 flex justify-center">
            <BlurText
              text={t("payment.title") as string}
              delay={50}
              animateBy="words"
              direction="top"
              stepDuration={0.25}
              threshold={0.3}
            />
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("payment.subtitle") as string}
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <div className="card-elevated px-5 py-3 inline-flex items-center">
            <Image src="/images/telebirr.jpg" alt="Telebirr" width={100} height={32} className="object-contain" />
          </div>
        </div>

        <motion.div
          className="grid md:grid-cols-5 gap-4 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {steps.map((step, index) => {
            const Icon = icons[index] || CreditCard;
            return (
              <motion.div
                key={step.step}
                variants={cardVariants}
                className="relative group"
              >
                <div className="card-apple p-5 text-center transition-all duration-300 group-hover:border-[var(--accent)]/20 h-full flex flex-col items-center">
                  <div className="flex items-center justify-center mb-3">
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/8 border border-[var(--accent)]/12"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <Icon className="h-5 w-5 text-[var(--accent)]" />
                    </motion.div>
                  </div>
                  <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-semibold mb-2">
                    {step.step}
                  </div>
                  <h3 className="text-[13px] font-semibold text-[var(--fg)] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-5 -right-2 text-[var(--border)]">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <p className="text-[13px] text-[var(--muted)] max-w-lg mx-auto mb-6 leading-relaxed">
            {t("payment.note") as string}
          </p>
          <Link
            href="#pricing"
            className="btn-primary btn-large gap-2 inline-flex"
          >
            {t("payment.cta") as string}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default PaymentSection;

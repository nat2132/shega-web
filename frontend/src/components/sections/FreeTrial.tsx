"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";

function FreeTrial() {
  const { t } = useTranslations();

  return (
    <section className="section-dark py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#2997ff] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="pill-dark pill-apple mb-6 inline-flex">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {t("freeTrial.badge") as string}
          </div>

          <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-[1.08] tracking-[-0.02em] mb-4 flex justify-center">
            <BlurText
              text={t("freeTrial.title") as string}
              delay={60}
              animateBy="words"
              direction="bottom"
              stepDuration={0.3}
              threshold={0.1}
            />
          </h2>
          <p className="text-[17px] text-[#86868b] max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("freeTrial.subtitle") as string}
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-[14px] text-[#a1a1a6]">
              <span className="text-lg">✅</span>
              {t("freeTrial.benefits.noCard") as string}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#a1a1a6]">
              <span className="text-lg">✅</span>
              {t("freeTrial.benefits.fullAccess") as string}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#a1a1a6]">
              <span className="text-lg">✅</span>
              {t("freeTrial.benefits.noCommitment") as string}
            </div>
            <div className="flex items-center gap-2 text-[14px] text-[#a1a1a6]">
              <span className="text-lg">✅</span>
              {t("freeTrial.benefits.allFeatures") as string}
            </div>
          </div>

          <Link
            href="#how-it-works"
            className="btn-primary btn-large gap-2 inline-flex group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {t("freeTrial.cta") as string}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default FreeTrial;

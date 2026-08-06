"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";

function FinalCTA() {
  const { t } = useTranslations();

  return (
    <section id="contact" className="section-dark py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#2997ff] opacity-[0.04] blur-[120px]" />
      </div>

      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-[1.08] tracking-[-0.02em] mb-4 flex justify-center">
            <BlurText
              text={t("cta.title") as string}
              delay={60}
              animateBy="words"
              direction="bottom"
              stepDuration={0.3}
              threshold={0.1}
            />
          </h2>
          <p className="text-[17px] text-[#86868b] max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("cta.subtitle") as string}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#how-it-works"
              className="btn-primary btn-large gap-2 group relative overflow-hidden inline-flex"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("cta.primaryCta") as string}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="mailto:support@shega.et"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-semibold text-white/70 border border-white/[0.12] hover:text-white hover:border-white/30 transition-all group"
            >
              <Mail className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {t("cta.secondaryCta") as string}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default FinalCTA;

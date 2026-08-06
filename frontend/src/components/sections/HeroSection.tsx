"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import BlurText from "@/components/reactbits/BlurText";
import { useState } from "react";

const screens = [
  { file: "dashboard-mobile.jpg", label: "Dashboard" },
  { file: "invetory-mobile.jpg", label: "Inventory" },
  { file: "sales-mobile.jpg", label: "Sales" },
  { file: "reports-mobile.jpg", label: "Reports" },
  { file: "business-assistant-mobile.jpg", label: "AI Assistant" },
  { file: "product-order-mobile.jpg", label: "Purchase Orders" },
];

const idlePositions = [
  { x: 0, y: 0, rotate: 0, z: 30 },
  { x: 12, y: 6, rotate: 3, z: 29 },
  { x: -12, y: -6, rotate: -3, z: 29 },
  { x: 22, y: 11, rotate: 6, z: 28 },
  { x: -22, y: -11, rotate: -6, z: 28 },
  { x: 32, y: 16, rotate: 9, z: 27 },
];

const fanPositions = [
  { x: 0, y: 0, rotate: 0, z: 30 },
  { x: 48, y: 12, rotate: 8, z: 29 },
  { x: -48, y: -12, rotate: -8, z: 29 },
  { x: 86, y: 20, rotate: 14, z: 28 },
  { x: -86, y: -20, rotate: -14, z: 28 },
  { x: 124, y: 28, rotate: 20, z: 27 },
];

function PhoneFrame({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative w-[180px] h-[380px] rounded-[2.2rem] bg-black p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
      <div className="absolute left-1/2 top-2.5 -translate-x-1/2 z-10 h-4 w-14 rounded-full bg-black/90 border border-white/10" />
      <div className="relative w-full h-full rounded-[1.7rem] overflow-hidden bg-white dark:bg-[#1a1a1d]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-semibold text-white/90">
          {label}
        </span>
      </div>
    </div>
  );
}

function MobileScreenshotFan() {
  const [hovered, setHovered] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <>
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="Screenshot"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
          />
        </div>
      )}

      <div
        className="relative flex flex-col items-center select-none"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative h-[420px] w-[430px] max-w-full">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[var(--accent)]/10 blur-3xl" />

          {screens.map((screen, i) => {
            const idle = idlePositions[i];
            const fan = fanPositions[i];
            return (
              <motion.div
                key={screen.file}
                className="absolute left-1/2 top-1/2 cursor-zoom-in"
                style={{ marginLeft: -90, marginTop: -190, zIndex: idle.z }}
                initial={{ x: idle.x, y: idle.y, rotate: idle.rotate }}
                animate={{
                  x: hovered ? fan.x : idle.x,
                  y: hovered ? fan.y : idle.y,
                  rotate: hovered ? fan.rotate : idle.rotate,
                }}
                transition={{ type: "spring", stiffness: 180, damping: 20, delay: i * 0.02 }}
                onClick={() => setLightboxSrc(`/images/screens/${screen.file}`)}
              >
                <motion.div
                  animate={hovered ? { y: [0, -9, 0] } : { y: 0 }}
                  transition={
                    hovered
                      ? { duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }
                      : { duration: 0.2 }
                  }
                >
                  <PhoneFrame src={`/images/screens/${screen.file}`} label={screen.label} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          className="mt-3 text-xs text-[var(--muted)]"
          animate={{ opacity: hovered ? 0.4 : 1 }}
        >
          Hover to explore all screens
        </motion.p>
      </div>
    </>
  );
}

function HeroSection() {
  const { t } = useTranslations();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white dark:bg-black pt-14">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="pill-blue pill-apple mb-6 inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              {t("hero.badge") as string}
            </motion.div>

            <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-bold text-[var(--fg)] leading-[1.08] tracking-[-0.02em] flex justify-center lg:justify-start">
              <BlurText
                text={t("hero.headline") as string}
                delay={60}
                animateBy="words"
                direction="top"
                stepDuration={0.3}
                threshold={0.1}
              />
            </h1>

            <p className="mt-5 text-[17px] text-[var(--muted)] max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {t("hero.subheadline") as string}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Link
                href="#how-it-works"
                className="btn-primary btn-large gap-2 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t("hero.primaryCta") as string}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
              <Link
                href="#pricing"
                className="btn-secondary btn-large gap-2"
              >
                {t("hero.secondaryCta") as string}
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <MobileScreenshotFan />
          </motion.div>
        </div>

      </div>
    </section>
  );
}

export default HeroSection;

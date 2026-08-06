"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";

function Footer() {
  const { t } = useTranslations();

  return (
    <footer className="border-t border-[var(--border-soft)] bg-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative flex h-7 w-7 items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="SHEGA"
                  width={18}
                  height={18}
                  className="object-contain"
                />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">SHEGA</span>
            </Link>
            <p className="mt-3 max-w-sm text-[13px] text-[var(--muted)] leading-relaxed">
              {t("footer.aboutDesc") as string}
            </p>
            <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-[var(--muted)]">
              <a href="mailto:ssshegas@gmail.com" className="hover:text-[var(--fg)] transition-colors">ssshegas@gmail.com</a>
              <a href="tel:0925319901" className="hover:text-[var(--fg)] transition-colors">0925319901</a>
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)] tracking-[0.02em] uppercase">{t("footer.product") as string}</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="#features" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.features") as string}</Link>
              </li>
              <li>
                <Link href="#pricing" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.pricing") as string}</Link>
              </li>
              <li>
                <Link href="#mobile-app" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.mobileApp") as string}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-[var(--fg)] tracking-[0.02em] uppercase">{t("footer.legal") as string}</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/privacy" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.privacyPolicy") as string}</Link>
              </li>
              <li>
                <Link href="/terms" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.termsOfService") as string}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--fg)]">{t("footer.contact") as string}</Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="text-[13px] font-semibold text-[var(--fg)] tracking-[0.02em] uppercase">{t("footer.download") as string}</h3>
            <p className="mt-2 text-[13px] text-[var(--muted)] leading-relaxed">Available for Android.</p>
            <div className="mt-4">
              <Link
                href="/download"
                className="btn-primary py-2 text-[13px] text-center"
              >
                {t("footer.downloadMobile") as string}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 divider-apple pt-8">
          <p className="text-center text-[13px] text-[var(--muted)]">
            {t("footer.copyright") as string}
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footer };

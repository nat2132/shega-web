"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Download, Check, Smartphone, HardDrive, Wifi, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useTranslations } from "@/hooks/useTranslations";
import {
  fetchLatestRelease,
  fetchRecentReleases,
  findApkAsset,
  triggerApkDownload,
  formatReleaseLabel,
  parseReleaseNotes,
  GitHubRelease,
  GitHubAsset,
} from "@/lib/githubRelease";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

type DownloadStatus = "idle" | "preparing" | "started" | "error";

export default function DownloadPage() {
  const isMobile = useDeviceType();
  const { t } = useTranslations();

  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [apk, setApk] = useState<GitHubAsset | null>(null);
  const [recentReleases, setRecentReleases] = useState<GitHubRelease[]>([]);
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [message, setMessage] = useState<string>("");

  // Resolve the latest release info on load so the version/label can reflect
  // the actual current version without any code change after a new publish.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const latest = await fetchLatestRelease(true);
        if (!cancelled) {
          setRelease(latest);
          setApk(findApkAsset(latest));
        }
        fetchRecentReleases(5, true)
          .then((list) => {
            if (!cancelled) setRecentReleases(list);
          })
          .catch(() => {
            /* release notes are optional */
          });
      } catch {
        /* keep static labels; the Download button still reports errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = useCallback(async () => {
    if (status === "preparing" || status === "started") return;
    setStatus("preparing");
    setMessage("");
    try {
      const latest = await fetchLatestRelease(true);
      const asset = findApkAsset(latest);
      if (!asset) {
        setStatus("error");
        setMessage(t("download.versionUnavailable") as string);
        return;
      }
      setRelease(latest);
      setApk(asset);
      await triggerApkDownload(asset);
      setStatus("started");
    } catch {
      setStatus("error");
      setMessage(t("download.downloadFailed") as string);
    }
  }, [status, t]);

  const versionLabel = release ? formatReleaseLabel(release, apk) : "";
  const apkName = apk?.name ?? "";
  const installSteps = t(
    "download.installSteps",
  ) as unknown as Array<{ title: string; description: string }>;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="absolute inset-0 grid-pattern opacity-20" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto mb-16 max-w-3xl text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="pill pill-glass mb-6 inline-flex">
                {apk
                  ? `${t("download.latestVersion")} ${apk.name.replace(/\.apk$/i, "").replace(/^Shega[- ]?/i, "v")}`
                  : release
                    ? `${t("download.latestVersion")} ${release.tag_name.replace(/^v/i, "")}`
                    : (t("download.latestVersion") as string)}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl leading-[1.1]">
                {t("download.title") as string}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted max-w-2xl mx-auto">
                {t("download.subtitle") as string}
              </p>
            </motion.div>

            <div className="max-w-2xl mx-auto space-y-8">
              <motion.div
                className="glass rounded-2xl p-8 text-center sm:p-12 glass-inner-highlight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.06]">
                  <Smartphone className="h-8 w-8 text-foreground" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground tracking-tight">
                  {t("download.androidTitle") as string}
                </h2>
                <p className="mb-6 text-sm text-muted">{versionLabel}</p>

                {isMobile ? (
                  <button
                    onClick={handleDownload}
                    disabled={status === "preparing" || status === "started"}
                    className="btn-glass-primary inline-flex h-12 items-center gap-2.5 px-8 text-sm rounded-xl cursor-pointer disabled:opacity-70"
                  >
                    {status === "preparing" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("download.preparing") as string}
                      </>
                    ) : status === "started" ? (
                      <>
                        <Check className="h-5 w-5" />
                        {t("download.downloadStarted") as string}
                      </>
                    ) : status === "error" ? (
                      <>
                        <Download className="h-5 w-5" />
                        {t("download.tryAgain") as string}
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        {t("download.downloadAndroid") as string}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="inline-flex flex-col items-center gap-3">
                    <span className="inline-flex h-12 items-center gap-2.5 px-8 text-sm rounded-xl bg-white/[0.06] border border-white/[0.06] text-muted">
                      <Smartphone className="h-5 w-5" />
                      {t("download.comingSoon") as string}
                    </span>
                    <p className="text-xs text-muted/70 max-w-xs">
                      {t("download.mobileNote") as string}
                    </p>
                  </div>
                )}

                {status === "error" && message && (
                  <p className="mt-4 text-sm text-red-400" role="alert">
                    {message}
                  </p>
                )}

                <p className="mt-4 text-xs text-muted/70">
                  {apkName && `${apkName} &middot; `}
                  {t("download.androidRequired") as string}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <h3 className="mb-6 text-xl font-semibold text-foreground tracking-tight">
                  {t("download.systemRequirements") as string}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Smartphone, label: t("download.os") as string, value: t("download.osValue") as string },
                    { icon: HardDrive, label: t("download.ram") as string, value: t("download.ramValue") as string },
                    { icon: HardDrive, label: t("download.storage") as string, value: t("download.storageValue") as string },
                    { icon: Wifi, label: t("download.internet") as string, value: t("download.internetValue") as string },
                  ].map((req) => (
                    <div
                      key={req.label}
                      className="glass rounded-xl p-5 text-center glass-inner-highlight"
                    >
                      <req.icon className="mx-auto mb-3 h-5 w-5 text-foreground/40" />
                      <p className="text-xs font-medium text-muted tracking-wider uppercase">
                        {req.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {req.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
              >
                <h3 className="mb-6 text-xl font-semibold text-foreground tracking-tight">
                  {t("download.installGuide") as string}
                </h3>
                <div className="space-y-3">
                  {installSteps.map((step, i) => (
                    <motion.div
                      key={step.title}
                      variants={itemVariants}
                      className="glass rounded-2xl p-5 flex gap-4 items-start glass-inner-highlight"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm font-bold text-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="font-medium text-foreground">
                          {step.title}
                        </h4>
                        <p className="mt-1 text-sm text-muted leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="glass rounded-2xl p-6 glass-inner-highlight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <h3 className="mb-5 text-lg font-semibold text-foreground tracking-tight">
                  {t("download.releaseNotes") as string}
                </h3>
                {recentReleases.length > 0 ? (
                  <div className="space-y-6">
                    {recentReleases.map((rel) => {
                      const changes = parseReleaseNotes(rel.body);
                      return (
                        <div key={rel.id ?? rel.tag_name} className="border-b border-white/[0.04] pb-5 last:border-0 last:pb-0">
                          <div className="mb-2 flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {rel.name || rel.tag_name}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(rel.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          {changes.length > 0 && (
                            <ul className="space-y-1.5">
                              {changes.map((change, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-muted leading-relaxed"
                                >
                                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/30" />
                                  {change}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t("download.versionUnavailable") as string}</p>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
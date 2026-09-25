"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Edition = "mobile" | "desktop" | "both";

type FeatureEntry = { key: string } & Record<Edition, boolean>;

// Inclusion per canonical plan edition. Desktop and Mobile + Desktop unlock the
// full ERP surface; Mobile covers the day-to-day shop floor.
const featureList: FeatureEntry[] = [
  { key: "inventory", mobile: true, desktop: true, both: true },
  { key: "sales", mobile: true, desktop: true, both: true },
  { key: "contacts", mobile: true, desktop: true, both: true },
  { key: "stockAdjustments", mobile: true, desktop: true, both: true },
  { key: "reports", mobile: true, desktop: true, both: true },
  { key: "dashboardOverview", mobile: true, desktop: true, both: true },
  { key: "pdfReceipts", mobile: false, desktop: true, both: true },
  { key: "csvImportExport", mobile: false, desktop: true, both: true },
  { key: "expenseManagement", mobile: false, desktop: true, both: true },
  { key: "budgetManagement", mobile: false, desktop: true, both: true },
  { key: "debtManagement", mobile: true, desktop: true, both: true },
  { key: "customerOrders", mobile: false, desktop: true, both: true },
  { key: "purchaseOrders", mobile: false, desktop: true, both: true },
  { key: "multiWarehouse", mobile: false, desktop: true, both: true },
  { key: "aiAssistant", mobile: false, desktop: true, both: true },
  { key: "businessHealthScore", mobile: false, desktop: true, both: true },
  { key: "biometrics", mobile: false, desktop: true, both: true },
  { key: "themes", mobile: true, desktop: true, both: true },
  { key: "supplierCreditReminders", mobile: false, desktop: true, both: true },
];

const columns: { key: Edition; labelKey: string; highlight?: boolean }[] = [
  { key: "mobile", labelKey: "pricing.comparison.columns.mobile" },
  { key: "desktop", labelKey: "pricing.comparison.columns.desktop" },
  { key: "both", labelKey: "pricing.comparison.columns.both", highlight: true },
];

function FeatureComparison() {
  const { t } = useTranslations();

  return (
    <section id="comparison" className="section-surface py-28 relative overflow-hidden">
      <div className="container-apple relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-16"
        >
          <div className="pill-blue pill-apple mb-5 inline-flex">{t("pricing.comparison.badge") as string}</div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[var(--fg)] leading-[1.1] tracking-[-0.015em] mb-4">
            {t("pricing.comparison.title") as string}
          </h2>
          <p className="text-[17px] text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            {t("pricing.comparison.subtitle") as string}
          </p>
        </motion.div>

        <div className="overflow-x-auto max-w-6xl mx-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 pr-4 text-[13px] font-semibold text-[var(--fg)]">
                  {t("pricing.comparison.columns.feature") as string}
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "text-center py-3 px-3 text-[12px] font-semibold uppercase tracking-[0.04em] rounded-t-lg",
                      col.highlight
                        ? "text-[#f59e0b] bg-[#f59e0b]/5"
                        : "text-[var(--muted)]"
                    )}
                  >
                    {t(col.labelKey) as string}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureList.map((feature, idx) => (
                <motion.tr
                  key={feature.key}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "border-t border-[var(--border-soft)] transition-colors",
                    idx % 2 === 0 ? "bg-transparent" : "bg-[var(--surface)]/50"
                  )}
                >
                  <td className="py-3 pr-4 text-[13px] text-[var(--fg)] font-medium">
                    {t(`pricing.comparison.features.${feature.key}`) as string}
                  </td>
                  {columns.map((col) => {
                    const included = feature[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "text-center py-3 px-3",
                          col.highlight && "bg-[#f59e0b]/[0.03]"
                        )}
                      >
                        {included ? (
                          <Check className={cn(
                            "h-4 w-4 mx-auto",
                            col.highlight ? "text-[#f59e0b]" : "text-[var(--accent)]"
                          )} />
                        ) : (
                          <X className="h-4 w-4 mx-auto text-[var(--border)]" />
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-[12px] text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
            {t("pricing.comparison.included") as string}
          </div>
          <div className="flex items-center gap-1.5">
            <X className="h-3.5 w-3.5 text-[var(--border)]" />
            {t("pricing.comparison.notIncluded") as string}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureComparison;

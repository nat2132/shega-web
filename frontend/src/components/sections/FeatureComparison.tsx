"use client";

import { motion } from "framer-motion";
import { useTranslations } from "@/hooks/useTranslations";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureEntry = {
  key: string;
  mobileBasic: boolean;
  mobilePremium: boolean;
};

const featureList: FeatureEntry[] = [
  { key: "inventory", mobileBasic: true, mobilePremium: true },
  { key: "sales", mobileBasic: true, mobilePremium: true },
  { key: "contacts", mobileBasic: true, mobilePremium: true },
  { key: "stockAdjustments", mobileBasic: true, mobilePremium: true },
  { key: "reports", mobileBasic: false, mobilePremium: true },
  { key: "dashboardOverview", mobileBasic: false, mobilePremium: true },
  { key: "pdfReceipts", mobileBasic: false, mobilePremium: true },
  { key: "csvImportExport", mobileBasic: false, mobilePremium: true },
  { key: "expenseManagement", mobileBasic: false, mobilePremium: true },
  { key: "budgetManagement", mobileBasic: false, mobilePremium: true },
  { key: "debtManagement", mobileBasic: false, mobilePremium: true },
  { key: "customerOrders", mobileBasic: false, mobilePremium: true },
  { key: "purchaseOrders", mobileBasic: false, mobilePremium: true },
  { key: "multiWarehouse", mobileBasic: false, mobilePremium: true },
  { key: "aiAssistant", mobileBasic: false, mobilePremium: true },
  { key: "businessHealthScore", mobileBasic: false, mobilePremium: true },
  { key: "biometrics", mobileBasic: false, mobilePremium: true },
  { key: "themes", mobileBasic: false, mobilePremium: true },
  { key: "supplierCreditReminders", mobileBasic: false, mobilePremium: true },
];

const columns = [
  { key: "mobileBasic", labelKey: "pricing.comparison.columns.mobileBasic" },
  { key: "mobilePremium", labelKey: "pricing.comparison.columns.mobilePremium", premium: true },
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
          <div className="pill-blue pill-apple mb-5 inline-flex">Feature Comparison</div>
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
                      col.premium
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
                    const included = feature[col.key as keyof FeatureEntry] as boolean;
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "text-center py-3 px-3",
                          col.premium && "bg-[#f59e0b]/[0.03]"
                        )}
                      >
                        {included ? (
                          <Check className={cn(
                            "h-4 w-4 mx-auto",
                            col.premium ? "text-[#f59e0b]" : "text-[var(--accent)]"
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
            Included
          </div>
          <div className="flex items-center gap-1.5">
            <X className="h-3.5 w-3.5 text-[var(--border)]" />
            Not included
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureComparison;

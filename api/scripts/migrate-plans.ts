/**
 * One-time (and safely re-runnable) plan migration: legacy Basic / Premium
 * license plans → the canonical Shega plan structure.
 *
 *   Mobile           ETB 4,500 / month   1 mobile ·  0 desktop · 1 business
 *   Desktop          ETB 7,500 / month   0 mobile ·  1 desktop · 1 business
 *   Mobile + Desktop ETB 10,000 / month  1 mobile ·  1 desktop · 1 business
 *
 * What it does
 *   1. Creates/updates the three canonical plans (matched by name + edition).
 *   2. Finds every remaining plan whose name still says Basic / Premium.
 *   3. Repoints its licenses and payments to the canonical plan chosen by
 *      `LEGACY_BASIC_EDITION` (default: mobile) and `LEGACY_PREMIUM_EDITION`
 *      (default: both), so no customer loses platform access.
 *   4. Archives the legacy plans — renamed to `Archived plan #<id>` and
 *      is_active = false — instead of deleting them, since licenses and
 *      payments may still reference them historically. This removes the old
 *      Basic / Premium wording from the system entirely.
 *
 * Run:
 *   npx tsx scripts/migrate-plans.ts             # apply
 *   DRY_RUN=1 npx tsx scripts/migrate-plans.ts   # report only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry-run");

const CANONICAL = [
  {
    name: "Mobile",
    edition: "mobile",
    price: 4500,
    included_mobile_devices: 1,
    included_desktop_devices: 0,
    included_businesses: 1,
  },
  {
    name: "Desktop",
    edition: "desktop",
    price: 7500,
    included_mobile_devices: 0,
    included_desktop_devices: 1,
    included_businesses: 1,
  },
  {
    name: "Mobile + Desktop",
    edition: "both",
    price: 10000,
    included_mobile_devices: 1,
    included_desktop_devices: 1,
    included_businesses: 1,
  },
] as const;

/** Edition a legacy plan is folded into — overridable so an operator can pick. */
function legacyEdition(kind: "basic" | "premium"): "mobile" | "desktop" | "both" {
  const raw =
    kind === "basic"
      ? process.env.LEGACY_BASIC_EDITION
      : process.env.LEGACY_PREMIUM_EDITION;
  const fallback = kind === "basic" ? "mobile" : "both";
  const value = (raw || fallback).trim().toLowerCase();
  return value === "desktop" || value === "both" ? value : "mobile";
}

async function main(): Promise<void> {
  const now = new Date();
  const byEdition = new Map<string, number>();

  for (const spec of CANONICAL) {
    const existing = await prisma.plan.findFirst({ where: { name: spec.name } });
    const data = {
      ...spec,
      duration_months: 1,
      device_limit: 1,
      is_active: true,
    };
    if (existing) {
      if (!DRY_RUN) {
        await prisma.plan.update({
          where: { id: existing.id },
          data,
        });
      }
      byEdition.set(spec.edition, existing.id);
      console.log(`✓ ${spec.name}: updated (id ${existing.id}) @ ETB ${spec.price}/mo`);
    } else {
      if (DRY_RUN) {
        console.log(`• ${spec.name}: would create @ ETB ${spec.price}/mo`);
        continue;
      }
      const created = await prisma.plan.create({
        data: { ...data, created_at: now },
      });
      byEdition.set(spec.edition, created.id);
      console.log(`✓ ${spec.name}: created (id ${created.id}) @ ETB ${spec.price}/mo`);
    }
  }

  // Match by name in JS rather than SQL `IN`: legacy rows are named
  // "Basic 1 Month" / "Premium 3 Months" and MySQL collation varies.
  const allRemaining = await prisma.plan.findMany({
    where: { NOT: { name: { in: CANONICAL.map((c) => c.name) } } },
  });
  const legacyAll = allRemaining.filter((p) => /basic|premium/i.test(p.name));

  if (legacyAll.length === 0) {
    console.log("No legacy Basic/Premium plans remain. Nothing to fold in.");
    return;
  }

  for (const plan of legacyAll) {
    const kind = /premium/i.test(plan.name) ? "premium" : "basic";
    const targetEdition = legacyEdition(kind);
    const targetId = byEdition.get(targetEdition);
    if (!targetId) {
      console.warn(`! ${plan.name} (id ${plan.id}): no canonical ${targetEdition} plan — skipped.`);
      continue;
    }

    const [licenseCount, paymentCount] = await Promise.all([
      prisma.license.count({ where: { plan_id: plan.id } }),
      prisma.payment.count({ where: { plan_id: plan.id } }),
    ]);

    console.log(
      `→ "${plan.name}" (id ${plan.id}) → ${targetEdition} (id ${targetId}): ` +
        `${licenseCount} license(s), ${paymentCount} payment(s)`,
    );

    if (DRY_RUN) continue;

    if (licenseCount > 0) {
      await prisma.license.updateMany({
        where: { plan_id: plan.id },
        data: {
          plan_id: targetId,
          device_limit: 1,
        },
      });
    }
    if (paymentCount > 0) {
      await prisma.payment.updateMany({
        where: { plan_id: plan.id },
        data: { plan_id: targetId },
      });
    }
    // Keep the row for history but hide it from every plan picker and strip
    // the retired wording from the system.
    await prisma.plan.update({
      where: { id: plan.id },
      data: { is_active: false, name: `Archived plan #${plan.id}` },
    });
    console.log(`  ✓ archived "${plan.name}" (id ${plan.id})`);
  }

  console.log(DRY_RUN ? "Dry run complete — nothing was written." : "Plan migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap } from "../../lib/errors";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { Prisma } from "@prisma/client";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireAdmin);

const ET_OFFSET_MS = 3 * 3600 * 1000;

function clampUtcDate(d: Date): Date {
  const local = new Date(d.getTime() + ET_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - ET_OFFSET_MS);
}

dashboardRouter.get(
  "/",
  wrap(async (_req: Request, res: Response) => {
    const now = new Date();
    const todayStart = clampUtcDate(now);
    const monthStart = new Date(todayStart);
    monthStart.setUTCDate(1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const upcomingExpiry = new Date(now.getTime() + 30 * 86400000);

    const [totalBusinesses, activeBusinesses, trialUsers, pendingPayments, activeSubscriptions, expiredSubscriptions] =
      await Promise.all([
        prisma.user.count({ where: { is_customer: true } }),
        prisma.user.count({
          where: { is_customer: true, is_active: true, licenses: { some: { status: "active" } } },
        }),
        prisma.license.count({ where: { is_trial: true, status: "active" } }),
        prisma.payment.count({ where: { status: "pending" } }),
        prisma.license.count({ where: { status: "active" } }),
        prisma.license.count({ where: { status: "expired" } }),
      ]);

    const [mobileSubscribers, desktopSubscribers, bothSubscribers, monthlyRevenue, todayRevenue, renewalsThisMonth, newBusinessesToday, totalTrials, convertedTrials] =
      await Promise.all([
        prisma.license.count({ where: { status: "active", plan: { edition: "mobile" } } }),
        prisma.license.count({ where: { status: "active", plan: { edition: "desktop" } } }),
        prisma.license.count({ where: { status: "active", plan: { edition: "both" } } }),
        prisma.payment.aggregate({
          where: { status: "approved", created_at: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { status: "approved", created_at: { gte: todayStart } },
          _sum: { amount: true },
        }),
        prisma.license.count({ where: { status: "active", updated_at: { gte: monthStart } } }),
        prisma.user.count({ where: { is_customer: true, date_joined: { gte: todayStart } } }),
        prisma.license.count({ where: { is_trial: true } }),
        prisma.license.count({
          where: { is_trial: false, created_at: { gte: new Date(now.getTime() - 90 * 86400000) } },
        }),
      ]);

    const [mobileCount, desktopCount] = await Promise.all([
      prisma.deviceActivation.count({
        where: { is_active: true, operating_system: { in: ["Android", "iOS"] } },
      }),
      prisma.deviceActivation.count({
        where: { is_active: true, operating_system: { notIn: ["Android", "iOS"] } },
      }),
    ]);

    const expiringSoon = await prisma.license.findMany({
      where: {
        status: "active",
        expiry_date: { gte: new Date(todayStart), lte: new Date(upcomingExpiry) },
      },
      include: { customer: true, plan: true },
      orderBy: { expiry_date: "asc" },
      take: 10,
    });

    const recentActivity = await prisma.auditLog.findMany({
      include: { admin: true },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    const revenueTrend: Array<{ date: Date; amount: unknown }> = await prisma.$queryRaw`
      SELECT DATE(created_at + INTERVAL 3 HOUR) AS date, COALESCE(SUM(amount), 0) AS amount
      FROM payments_payment
      WHERE status = 'approved' AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at + INTERVAL 3 HOUR)
      ORDER BY date ASC
    `;
    const subGrowth: Array<{ date: Date; count: unknown }> = await prisma.$queryRaw`
      SELECT DATE(created_at + INTERVAL 3 HOUR) AS date, COUNT(*) AS count
      FROM licenses_license
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at + INTERVAL 3 HOUR)
      ORDER BY date ASC
    `;

    const trialConversionRate =
      totalTrials > 0 ? Math.round((convertedTrials / totalTrials) * 10000) / 100 : 0;

    res.json({
      totalBusinesses,
      activeBusinesses,
      trialUsers,
      pendingPayments,
      activeSubscriptions,
      expiredSubscriptions,
      // Plan distribution by edition (the canonical plan structure:
      // Mobile · Desktop · Mobile + Desktop).
      mobileSubscribers,
      desktopSubscribers,
      bothSubscribers,
      monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
      todayRevenue: Number(todayRevenue._sum.amount ?? 0),
      renewalsThisMonth,
      newBusinessesToday,
      revenueTrend: revenueTrend.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        amount: Number(r.amount),
      })),
      subscriptionGrowth: subGrowth.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        count: Number(r.count),
      })),
      trialConversionRate,
      mobileVsDesktop: { mobile: mobileCount, desktop: desktopCount },
      subscriptionDistribution: {
        mobile: mobileSubscribers,
        desktop: desktopSubscribers,
        both: bothSubscribers,
      },
      expiringSoon: expiringSoon.map((e) => ({
        id: e.id,
        key: e.license_key,
        customer: e.customer.email,
        plan: e.plan?.name ?? null,
        expiry: e.expiry_date ? e.expiry_date.toISOString().slice(0, 10) : null,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        admin: a.admin?.email ?? null,
        action: a.action,
        resource: a.resource_type,
        resourceId: a.resource_id,
        time: a.created_at ? a.created_at.toISOString() : null,
      })),
    } satisfies Prisma.JsonObject);
  }),
);
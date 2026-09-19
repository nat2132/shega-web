import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap, badRequest, forbidden, notFound } from "../../lib/errors";
import { getPagination, paginated } from "../../lib/pagination";
import { ordering } from "../../lib/ordering";
import { dateFilter, boolParam } from "../../lib/filters";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import {
  serializeLicense,
  serializeSubscriptionList,
  serializePaymentList,
  fullName,
  isoDateTime,
  isoDate,
  toNumber,
} from "../../lib/serializers";
import { logAdminAction } from "../../lib/audit";

export const businessesRouter = Router();

const BUSINESS_ORDERING = ["created_at", "date_joined", "business_name", "email", "id"] as const;

function parseBusinessCreate(data: Record<string, unknown>) {
  const schema = z.object({
    username: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().max(20).optional().nullable(),
    business_name: z.string().max(255).optional(),
    business_type: z.string().max(50).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    is_active: z.boolean().optional(),
  });
  return schema.safeParse(data);
}

interface BusinessAgg {
  id: number;
  licenses: { id: number; plan_id: number; status: string; expiry_date: Date | null; plan_name: string | null }[];
  totalPaid: number;
}

async function buildBusinessAggs(customerIds: number[]): Promise<Map<number, BusinessAgg>> {
  if (customerIds.length === 0) return new Map();
  const [licenses, payments] = await Promise.all([
    prisma.license.findMany({
      where: { customer_id: { in: customerIds } },
      select: {
        id: true,
        customer_id: true,
        plan_id: true,
        status: true,
        expiry_date: true,
        plan: { select: { name: true } },
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    }),
    prisma.payment.findMany({
      where: { customer_id: { in: customerIds }, status: "approved" },
      select: { customer_id: true, amount: true },
    }),
  ]);

  const map = new Map<number, BusinessAgg>();
  for (const id of customerIds) map.set(id, { id, licenses: [], totalPaid: 0 });
  for (const lic of licenses) {
    const agg = map.get(lic.customer_id);
    if (agg && !agg.licenses.some((l) => l.id === lic.id)) {
      agg.licenses.push({
        id: lic.id,
        plan_id: lic.plan_id,
        status: lic.status,
        expiry_date: lic.expiry_date,
        plan_name: lic.plan?.name ?? null,
      });
    }
  }
  for (const p of payments) {
    const agg = map.get(p.customer_id);
    if (agg) agg.totalPaid += toNumber(p.amount);
  }
  return map;
}

function serializeCustomerProfile(profile: { id: number; user_id: number; company_name: string; tin_number: string; city: string; region: string; country: string; website: string; status: string; notes: string; created_at: Date; updated_at: Date } | null) {
  if (!profile) return null;
  return {
    id: profile.id,
    user: profile.user_id,
    email: null,
    username: null,
    full_name: null,
    company_name: profile.company_name,
    tin_number: profile.tin_number,
    city: profile.city,
    region: profile.region,
    country: profile.country,
    website: profile.website,
    status: profile.status,
    notes: profile.notes,
    created_at: isoDateTime(profile.created_at),
    updated_at: isoDateTime(profile.updated_at),
  };
}

function serializeBusinessList(
  user: {
    id: number;
    username: string;
    email: string;
    phone: string | null;
    first_name: string;
    last_name: string;
    business_name: string;
    business_type: string;
    is_active: boolean;
    email_verified: boolean;
    phone_verified: boolean;
    date_joined: Date;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
    notes: string;
    customer_profile: { id: number; company_name: string; status: string } | null;
  },
  agg: BusinessAgg | undefined,
) {
  const first = agg?.licenses?.[0];
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    business_name: fullName({ first_name: user.first_name, last_name: user.last_name, email: user.email }),
    company_name: user.customer_profile?.company_name || user.business_name || fullName(user),
    business_type: user.business_type,
    is_active: user.is_active,
    is_customer: true,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    customer_profile_id: user.customer_profile?.id ?? null,
    customer_status: user.customer_profile?.status ?? null,
    license_count: agg?.licenses.length ?? 0,
    total_paid: agg?.totalPaid ?? 0,
    current_plan: first?.plan_name ?? null,
    license_status: first?.status ?? null,
    license_expiry: first?.expiry_date ? isoDate(new Date(String(first.expiry_date))) : null,
    date_joined: isoDateTime(user.date_joined),
    last_login: isoDateTime(user.last_login),
    created_at: isoDateTime(user.created_at),
    updated_at: isoDateTime(user.updated_at),
    notes: user.notes,
  };
}

businessesRouter.use(requireAuth, requireAdmin);

function buildSearchWhere(search: string) {
  if (!search.trim()) return undefined;
  const or: Record<string, unknown>[] = [];
  for (const field of ["email", "phone", "business_name", "username", "first_name", "last_name"]) {
    or.push({ [field]: { contains: search } });
  }
  return { OR: or };
}

businessesRouter.get(
  "/",
  wrap(async (req: Request, res: Response) => {
    const where: Record<string, unknown> = { is_customer: true, ...dateFilter(req) };
    const isActive = boolParam(req.query.is_active);
    const isVerified = boolParam(req.query.email_verified);
    if (isActive !== undefined) where.is_active = isActive;
    if (isVerified !== undefined) where.email_verified = isVerified;
    if (req.query.business_type) where.business_type = String(req.query.business_type);
    const sw = buildSearchWhere(String(req.query.search || ""));
    if (sw) where.AND = sw;

    const { page, pageSize } = getPagination(req);
    const orderBy = ordering(req, BUSINESS_ORDERING, { created_at: "desc" });
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { customer_profile: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const aggs = await buildBusinessAggs(users.map((u) => u.id));
    const results = users.map((u) => serializeBusinessList(u as never, aggs.get(u.id)));
    res.json(paginated(req, total, results as never[], page, pageSize));
  }),
);

businessesRouter.post(
  "/",
  wrap(async (req: Request, res: Response) => {
    const parsed = parseBusinessCreate(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ detail: parsed.error.issues[0]?.message || "Invalid data." });
      return;
    }
    const data = parsed.data;
    const now = new Date();
    const password = data.password || data.email.split("@")[0] + Math.floor(Math.random() * 90000 + 10000);
    const avatar = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: avatar,
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone || null,
        business_name: data.business_name || "",
        business_type: data.business_type || "",
        address: data.address || "",
        notes: data.notes || "",
        is_customer: true,
        is_active: data.is_active ?? true,
        date_joined: now,
        created_at: now,
        updated_at: now,
      },
    });
    await prisma.customerProfile.create({
      data: {
        user_id: user.id,
        company_name: data.business_name || data.email,
        notes: "",
        created_at: now,
        updated_at: now,
      },
    });
    await logAdminAction(req, {
      action: "create_business",
      resourceType: "business",
      resourceId: user.id,
      details: { email: user.email },
    });
    const detail = await loadBusinessDetail(user.id);
    res.status(201).json(detail);
  }),
);

async function loadBusinessDetail(id: number) {
  const user = await prisma.user.findUnique({
    where: { id, is_customer: true },
    include: {
      customer_profile: true,
      licenses: { include: { plan: true }, orderBy: [{ created_at: "desc" }, { id: "desc" }] },
      payments: {
        include: { plan: true, customer: true, license: true },
        orderBy: { created_at: "desc" },
        take: 5,
      },
    },
  });
  if (!user) throw notFound("Business not found.");
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    phone: user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    business_name: user.business_name,
    company_name: user.customer_profile?.company_name || user.business_name || fullName(user),
    owner_name: fullName(user),
    business_type: user.business_type,
    address: user.address,
    is_active: user.is_active,
    is_customer: true,
    is_admin: user.is_admin,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    customer_profile: serializeCustomerProfile(user.customer_profile),
    licenses: user.licenses.map((l) => serializeLicense(l)),
    recent_payments: user.payments.map((p) => serializePaymentList(p)),
    date_joined: isoDateTime(user.date_joined),
    last_login: isoDateTime(user.last_login),
    created_at: isoDateTime(user.created_at),
    updated_at: isoDateTime(user.updated_at),
    notes: user.notes,
  };
}

businessesRouter.get(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    res.json(await loadBusinessDetail(Number(req.params.id)));
  }),
);

businessesRouter.patch(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await prisma.user.findFirst({ where: { id, is_customer: true } });
    if (!existing) throw notFound("Business not found.");
    const schema = z
      .object({
        email: z.string().email().optional(),
        phone: z.string().max(20).optional().nullable(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        business_name: z.string().optional(),
        business_type: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        is_active: z.boolean().optional(),
        email_verified: z.boolean().optional(),
      })
      .passthrough();
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ detail: "Invalid business data." });
      return;
    }
    const before = { ...existing };
    const data: Record<string, unknown> = { ...parsed.data, updated_at: new Date() };
    if (data.phone === null) data.phone = "";
    const user = await prisma.user.update({ where: { id }, data: data as never });
    await logAdminAction(req, {
      action: "update_business",
      resourceType: "business",
      resourceId: id,
      details: { email: user.email },
      beforeState: before as never,
      afterState: user as never,
    });
    res.json(await loadBusinessDetail(id));
  }),
);

async function softDeleteBusiness(req: Request, id: number) {
  const existing = await prisma.user.findFirst({ where: { id, is_customer: true } });
  if (!existing) throw notFound("Business not found.");
  await prisma.user.update({ where: { id }, data: { is_active: false, updated_at: new Date() } });
  await logAdminAction(req, {
    action: "delete_business",
    resourceType: "business",
    resourceId: id,
    details: { email: existing.email },
  });
}

businessesRouter.delete(
  "/:id(\\d+)",
  wrap(async (req: Request, res: Response) => {
    await softDeleteBusiness(req, Number(req.params.id));
    res.json({ detail: "Business deleted successfully." });
  }),
);

businessesRouter.post(
  "/:id(\\d+)/delete",
  wrap(async (req: Request, res: Response) => {
    await softDeleteBusiness(req, Number(req.params.id));
    res.json({ detail: "Business deleted successfully." });
  }),
);

businessesRouter.post(
  "/:id(\\d+)/suspend",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const business = await prisma.user.findFirst({ where: { id, is_customer: true } });
    if (!business) throw notFound("Business not found.");
    await prisma.user.update({ where: { id }, data: { is_active: false, updated_at: new Date() } });
    await prisma.license.updateMany({
      where: { customer_id: id, status: "active" },
      data: { status: "suspended", updated_at: new Date() },
    });
    await logAdminAction(req, {
      action: "suspend_business",
      resourceType: "business",
      resourceId: id,
      details: { email: business.email },
    });
    res.json({ detail: "Business suspended successfully." });
  }),
);

businessesRouter.post(
  "/:id(\\d+)/activate",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const business = await prisma.user.findFirst({ where: { id, is_customer: true } });
    if (!business) throw notFound("Business not found.");
    await prisma.user.update({ where: { id }, data: { is_active: true, updated_at: new Date() } });
    await logAdminAction(req, {
      action: "activate_business",
      resourceType: "business",
      resourceId: id,
      details: { email: business.email },
    });
    res.json({ detail: "Business activated successfully." });
  }),
);

businessesRouter.post(
  "/:id(\\d+)/reset-trial",
  wrap(async (req: Request, res: Response) => {
    if (!req.user?.is_superuser) throw forbidden("Only super admins can reset trials.");
    const id = Number(req.params.id);
    await prisma.license.updateMany({
      where: { customer_id: id, is_trial: true },
      data: {
        status: "active",
        start_date: new Date(),
        expiry_date: new Date(Date.now() + 30 * 86400000),
        updated_at: new Date(),
      },
    });
    await logAdminAction(req, {
      action: "reset_trial",
      resourceType: "business",
      resourceId: id,
    });
    res.json({ detail: "Trial reset successfully." });
  }),
);

const SUB_ORDERING = ["created_at", "expiry_date", "start_date", "updated_at", "id"] as const;

function subSearchWhere(search: string) {
  if (!search.trim()) return undefined;
  const or: Record<string, unknown>[] = [];
  for (const field of ["email", "phone", "username", "business_name"]) {
    or.push({ customer: { [field]: { contains: search } } });
  }
  return { OR: or };
}

businessesRouter.get(
  "/:id(\\d+)/subscription_history",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { page, pageSize } = getPagination(req);
    const where: Record<string, unknown> = { customer_id: id };
    const orderBy = ordering(req, SUB_ORDERING, { created_at: "desc" });
    const [total, subs] = await Promise.all([
      prisma.license.count({ where }),
      prisma.license.findMany({
        where,
        include: { customer: true, plan: true, device_activations: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json(paginated(req, total, subs.map((s) => serializeSubscriptionList(s)), page, pageSize));
  }),
);

businessesRouter.get(
  "/:id(\\d+)/payment_history",
  wrap(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { page, pageSize } = getPagination(req);
    const where: Record<string, unknown> = { customer_id: id };
    const orderBy = ordering(req, ["created_at", "amount", "reviewed_at", "id"] as const, { created_at: "desc" });
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: { customer: true, plan: true, license: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json(paginated(req, total, payments.map((p) => serializePaymentList(p)), page, pageSize));
  }),
);
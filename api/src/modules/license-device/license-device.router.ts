import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { wrap } from "../../lib/errors";
import { isoDate, isoDateTime } from "../../lib/serializers";
import { DEVICE_TYPES, deviceLimited, type DeviceType } from "../../lib/pricing";
import { clientIp } from "../../lib/audit";

/**
 * Public device/license endpoints. Mirrors backend/api_public/views.py so the
 * Flutter mobile/desktop clients keep working if routed to this API:
 *   POST /api/license/verify
 *   POST /api/license/activate
 *   POST /api/license/deactivate
 *   POST /api/license/renew
 *   GET  /api/license/status
 */
export const licenseDeviceRouter = Router();

const licenseLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ valid: false, success: false, message: "Too many requests. Please try again later." });
  },
});

const keys = {
  license_key: z.string().optional().default(""),
  device_id: z.string().optional().default(""),
  device_name: z.string().optional().default(""),
  operating_system: z.string().optional().default(""),
  device_type: z.enum(DEVICE_TYPES).optional().default("MOBILE"),
};

async function loadLicenseByKey(licenseKey: string) {
  if (!licenseKey) return null;
  return prisma.license.findUnique({ where: { license_key: licenseKey } });
}

function activeToday(license: { status: string; expiry_date: Date | null }): boolean {
  if (license.status !== "active") return false;
  if (!license.expiry_date) return true;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return license.expiry_date >= today;
}

async function activeCountForType(licenseId: number, deviceType: DeviceType): Promise<number> {
  return prisma.deviceActivation.count({
    where: { license_id: licenseId, device_type: deviceType, is_active: true },
  });
}

licenseDeviceRouter.post(
  "/verify",
  licenseLimit,
  wrap(async (req: Request, res: Response) => {
    const parsed = z.object(keys).safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ valid: false, message: "Invalid request." });
      return;
    }
    const input = parsed.data;
    let license = await loadLicenseByKey(input.license_key);
    if (!license && req.user?.id && input.license_key === "") {
      const row = await prisma.license.findFirst({
        where: { customer_id: req.user.id },
        orderBy: { created_at: "desc" },
      });
      license = row ?? null;
    }

    if (!license) {
      res.status(404).json({ valid: false, message: "Invalid license key." });
      return;
    }
    if (license.status !== "active") {
      res.status(400).json({ valid: false, message: `License is ${license.status}.` });
      return;
    }
    if (license.expiry_date && !activeToday(license)) {
      res.status(400).json({ valid: false, message: "License has expired." });
      return;
    }

    const deviceType: DeviceType = input.device_type;
    if (!input.device_id) {
      res.json({ valid: true, license_key: license.license_key, status: license.status, expiry_date: isoDate(license.expiry_date), message: "License is valid." });
      return;
    }

    const device = await prisma.deviceActivation.findFirst({
      where: { license_id: license.id, device_id: input.device_id },
    });

    if (device && device.is_active) {
      await prisma.deviceActivation.update({ where: { id: device.id }, data: { last_seen: new Date() } });
    } else if (device && !device.is_active) {
      res.status(400).json({ valid: false, message: "Device is deactivated." });
      return;
    } else if (await deviceLimited(license, await activeCountForType(license.id, deviceType), deviceType)) {
      res.status(400).json({ valid: false, message: "Device limit reached." });
      return;
    }

    res.json({ valid: true, license_key: license.license_key, status: license.status, expiry_date: isoDate(license.expiry_date), message: "License is valid." });
  }),
);

licenseDeviceRouter.post(
  "/activate",
  licenseLimit,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({
      license_key: z.string().min(1),
      device_id: z.string().min(1),
      device_name: z.string().optional().default(""),
      operating_system: z.string().optional().default(""),
      device_type: z.enum(DEVICE_TYPES).optional().default("MOBILE"),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "license_key and device_id are required." });
      return;
    }
    const input = parsed.data;
    const license = await loadLicenseByKey(input.license_key);
    if (!license) {
      res.status(404).json({ success: false, message: "Invalid license key." });
      return;
    }
    if (license.status !== "active") {
      res.status(400).json({ success: false, message: `License is ${license.status}.` });
      return;
    }
    if (license.expiry_date && !activeToday(license)) {
      res.status(400).json({ success: false, message: "License has expired." });
      return;
    }

    const existing = await prisma.deviceActivation.findFirst({
      where: { license_id: license.id, device_id: input.device_id },
    });

    if (existing && existing.is_active) {
      await prisma.deviceActivation.update({
        where: { id: existing.id },
        data: { last_seen: new Date(), device_name: input.device_name || existing.device_name, operating_system: input.operating_system || existing.operating_system },
      });
      res.json({ success: true, message: "Device already active.", device_id: existing.device_id, activated_at: isoDateTime(existing.activation_date) });
      return;
    }

    const deviceType: DeviceType = input.device_type;
    if (await deviceLimited(license, await activeCountForType(license.id, deviceType), deviceType)) {
      res.status(400).json({ success: false, message: "Device limit reached." });
      return;
    }

    const now = new Date();
    const device = await prisma.deviceActivation.upsert({
      where: { license_id_device_id: { license_id: license.id, device_id: input.device_id } },
      update: {
        device_name: input.device_name,
        operating_system: input.operating_system,
        ip_address: clientIp(req) ?? "0.0.0.0",
        last_seen: now,
        is_active: true,
        device_type: deviceType,
      },
      create: {
        license_id: license.id,
        device_id: input.device_id,
        device_name: input.device_name,
        operating_system: input.operating_system,
        ip_address: clientIp(req) ?? "0.0.0.0",
        activation_date: now,
        last_seen: now,
        device_type: deviceType,
        is_active: true,
      },
    });

    res.json({ success: true, message: "Device activated successfully.", device_id: device.device_id, activated_at: isoDateTime(device.activation_date) });
  }),
);

licenseDeviceRouter.post(
  "/deactivate",
  licenseLimit,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ license_key: z.string().min(1), device_id: z.string().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "license_key and device_id are required." });
      return;
    }
    const license = await loadLicenseByKey(parsed.data.license_key);
    if (!license) {
      res.status(404).json({ success: false, message: "Invalid license key." });
      return;
    }
    const device = await prisma.deviceActivation.findFirst({
      where: { license_id: license.id, device_id: parsed.data.device_id },
    });
    if (!device) {
      res.status(404).json({ success: false, message: "Device not found." });
      return;
    }
    if (!device.is_active) {
      res.json({ success: true, message: "Device was already deactivated." });
      return;
    }
    await prisma.deviceActivation.update({ where: { id: device.id }, data: { is_active: false, last_seen: new Date() } });
    res.json({ success: true, message: "Device deactivated successfully." });
  }),
);

licenseDeviceRouter.post(
  "/renew",
  licenseLimit,
  wrap(async (req: Request, res: Response) => {
    const schema = z.object({ license_key: z.string().min(1), payment_reference: z.string().min(1) });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: "license_key and payment_reference are required." });
      return;
    }
    const license = await prisma.license.findUnique({
      where: { license_key: parsed.data.license_key },
      include: { plan: true },
    });
    if (!license) {
      res.status(404).json({ success: false, message: "Invalid license key." });
      return;
    }
    if (license.status === "revoked") {
      res.status(400).json({ success: false, message: "Cannot renew a revoked license." });
      return;
    }
    if (!license.plan) {
      res.status(400).json({ success: false, message: "License has no plan." });
      return;
    }
    const durationDays = license.plan.duration_months * 30;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const baseExpiry = license.expiry_date && license.expiry_date > today ? new Date(license.expiry_date) : today;
    const newExpiry = new Date(baseExpiry.getTime() + durationDays * 86400000);
    await prisma.license.update({ where: { id: license.id }, data: { expiry_date: newExpiry, status: "active", updated_at: new Date() } });
    await prisma.licenseAuditLog.create({
      data: {
        license_id: license.id,
        action: "renewed_mobile",
        details: JSON.stringify({ payment_reference: parsed.data.payment_reference, expiry_date: newExpiry.toISOString().slice(0, 10) }),
        ip_address: clientIp(req) ?? null,
        created_at: new Date(),
      },
    });
    res.json({ success: true, message: "License renewed successfully.", new_expiry_date: newExpiry, payment_reference: parsed.data.payment_reference });
  }),
);

licenseDeviceRouter.get(
  "/status",
  licenseLimit,
  wrap(async (req: Request, res: Response) => {
    const licenseKey = String(req.query?.license_key ?? "").trim();
    let license = licenseKey ? await loadLicenseByKey(licenseKey) : null;
    if (!license && req.user?.id) {
      license = await prisma.license.findFirst({ where: { customer_id: req.user.id }, orderBy: { created_at: "desc" } });
    }
    if (!license) {
      if (req.user?.id) {
        res.json({ valid: false, plan: null, expires_at: null, license_key: null, reason: "No license found for this account." });
        return;
      }
      res.status(400).json({ valid: false, message: "License key is required." });
      return;
    }
    const activeDevices = await prisma.deviceActivation.findMany({ where: { license_id: license.id, is_active: true } });
    const devices = activeDevices.map((d) => ({
      device_id: d.device_id,
      device_name: d.device_name,
      operating_system: d.operating_system,
      device_type: d.device_type,
      last_seen: d.last_seen,
      activated_at: d.activation_date,
    }));
    res.json({
      valid: activeToday(license),
      plan: license.plan_id ? (await prisma.plan.findUnique({ where: { id: license.plan_id } }))?.name ?? null : null,
      expires_at: license.expiry_date,
      license_key: license.license_key,
      status: license.status,
      expiry_date: license.expiry_date,
      device_limit: license.device_limit,
      active_devices_count: activeDevices.length,
      active_devices: devices,
      created_at: license.created_at,
    });
  }),
);
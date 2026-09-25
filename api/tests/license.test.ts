import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb, subscribeCustomer, adminToken } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/license (verify/activate/deactivate/renew/status)", () => {
  it("verifies a license key without a device", async () => {
    const { licenseKey, customer } = await subscribeCustomer("Mobile");
    const res = await request(app).post("/api/license/verify").send({ license_key: licenseKey, device_type: "MOBILE" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.license_key).toBe(licenseKey);
    expect(res.body.expiry_date).toBeTruthy();
  });

  it("rejects an unknown license key", async () => {
    const res = await request(app).post("/api/license/verify").send({ license_key: "ERP-XXXX-XXXX-XXXX" });
    expect(res.status).toBe(404);
    expect(res.body.valid).toBe(false);
  });

  it("activates the default device then blocks a second mobile device until an add-on is bought", async () => {
    const { licenseKey, licenseId, customer, plan } = await subscribeCustomer("Mobile");
    const headers = { Authorization: `Bearer ${customer.access}` };

    const act1 = await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-M-001",
      device_name: "Main Phone",
      device_type: "MOBILE",
    });
    expect(act1.status).toBe(200);
    expect(act1.body.success).toBe(true);

    const act2 = await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-M-002",
      device_name: "Second Phone",
      device_type: "MOBILE",
    });
    expect(act2.status).toBe(400);
    expect(act2.body.message).toMatch(/limit reached/);

    const addon = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, payment_type: "additional_mobile_device", license_id: licenseId, transaction_id: "TXN-LIC-ADD" });
    expect(addon.status).toBe(201);
    expect(addon.body.amount).toBe(500);

    const token = await adminToken();
    const approve = await request(app)
      .post(`/api/admin/payments/${addon.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(200);

    const act3 = await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-M-002",
      device_name: "Second Phone",
      device_type: "MOBILE",
    });
    expect(act3.status).toBe(200);
    expect(act3.body.success).toBe(true);

    const desktop = await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-D-001",
      device_type: "DESKTOP",
    });
    expect(desktop.status).toBe(400);
    expect(desktop.body.message).toMatch(/limit reached/);
  });

  it("deactivates a device so the slot frees up", async () => {
    const { licenseKey, customer } = await subscribeCustomer("Mobile");
    await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-DEACT-1",
      device_type: "MOBILE",
    });

    const deact = await request(app).post("/api/license/deactivate").send({
      license_key: licenseKey,
      device_id: "DEV-DEACT-1",
    });
    expect(deact.status).toBe(200);
    expect(deact.body.message).toMatch(/deactivated/i);

    const reverify = await request(app).post("/api/license/verify").send({
      license_key: licenseKey,
      device_id: "DEV-DEACT-1",
    });
    expect(reverify.status).toBe(400);
    expect(reverify.body.message).toMatch(/deactivated/i);

    const reactivate = await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-DEACT-1",
      device_type: "MOBILE",
    });
    expect(reactivate.status).toBe(200);
  });

  it("renews the license for another period", async () => {
    const { licenseKey } = await subscribeCustomer("Mobile");
    const before = await prisma.license.findFirstOrThrow({ where: { license_key: licenseKey } });

    const renew = await request(app).post("/api/license/renew").send({
      license_key: licenseKey,
      payment_reference: "TXN-RENEW-MOBILE",
    });
    expect(renew.status).toBe(200);
    expect(renew.body.success).toBe(true);

    const after = await prisma.license.findFirstOrThrow({ where: { license_key: licenseKey } });
    const diffDays = Math.round((after.expiry_date!.getTime() - before.expiry_date!.getTime()) / 86400000);
    expect(diffDays).toBe(30);
  });

  it("returns license status with active devices via the public license_key contract", async () => {
    const { licenseKey } = await subscribeCustomer("Mobile");
    await request(app).post("/api/license/activate").send({
      license_key: licenseKey,
      device_id: "DEV-STATUS-1",
      device_name: "Status Device",
      device_type: "MOBILE",
    });

    const res = await request(app).get("/api/license/status").query({ license_key: licenseKey });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.license_key).toBe(licenseKey);
    expect(res.body.plan).toBe("Mobile");
    expect(res.body.active_devices_count).toBe(1);
    expect(res.body.active_devices[0].device_id).toBe("DEV-STATUS-1");
  });
});